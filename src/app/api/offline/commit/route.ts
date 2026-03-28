import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.literal("consume_one"),
        equipmentId: z.string().min(1),
        baseUpdatedAtMs: z.number().int().optional(),
      }),
    )
    .min(1)
    .max(50),
});

function roleAtLeast(userRole: Role, required: Role) {
  const order: Role[] = [Role.READONLY, Role.LEADER, Role.QUARTERMASTER, Role.ADMIN];
  return order.indexOf(userRole) >= order.indexOf(required);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roleAtLeast(user.role, Role.LEADER)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const results: Array<
    | { id: string; ok: true; equipment: { id: string; quantity: number; updatedAtMs: number } }
    | { id: string; ok: false; error: string; conflict?: { kind: "updated"; serverUpdatedAtMs: number } }
  > = [];

  for (const item of parsed.data.items) {
    try {
      const res = await prisma.$transaction(async (tx) => {
        const equipment = await tx.equipment.findUnique({
          where: { id: item.equipmentId },
          select: { id: true, assetId: true, name: true, quantity: true, isConsumable: true, isActive: true, updatedAt: true },
        });
        if (!equipment || !equipment.isActive) {
          return { ok: false as const, error: "Item not found." };
        }
        if (!equipment.isConsumable) {
          return { ok: false as const, error: "Not a consumable." };
        }
        if (typeof item.baseUpdatedAtMs === "number" && equipment.updatedAt.getTime() !== item.baseUpdatedAtMs) {
          return {
            ok: false as const,
            error: "Conflict: item changed since your offline copy.",
            conflict: { kind: "updated" as const, serverUpdatedAtMs: equipment.updatedAt.getTime() },
          };
        }
        if (equipment.quantity <= 0) {
          return { ok: false as const, error: "Nothing left to consume." };
        }

        const prevQty = equipment.quantity;
        const updated = await tx.equipment.update({
          where: { id: equipment.id },
          data: { quantity: prevQty - 1, updatedById: user.id },
          select: { id: true, quantity: true, updatedAt: true },
        });

        await tx.auditLog.create({
          data: {
            action: "EQUIPMENT_UPDATED",
            entityType: "Equipment",
            entityId: equipment.id,
            actorId: user.id,
            summary: `Consumed 1 × ${equipment.assetId}`,
            data: { delta: -1, reason: "offline_consume_one", undo: { kind: "quantity_set", equipmentId: equipment.id, previousQuantity: prevQty } },
          },
        });

        return { ok: true as const, equipment: { id: updated.id, quantity: updated.quantity, updatedAtMs: updated.updatedAt.getTime() } };
      });

      if (res.ok) results.push({ id: item.id, ok: true, equipment: res.equipment });
      else results.push({ id: item.id, ok: false, error: res.error, conflict: (res as { conflict?: { kind: "updated"; serverUpdatedAtMs: number } }).conflict });
    } catch (e) {
      results.push({ id: item.id, ok: false, error: e instanceof Error ? e.message : "Server error." });
    }
  }

  return NextResponse.json({ ok: true, results });
}

