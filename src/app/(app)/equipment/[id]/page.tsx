import Link from "next/link";
import { Prisma, Role } from "@prisma/client";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { format, formatDistanceToNowStrict } from "date-fns";

import { prisma } from "@/lib/db";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { conditionLabel, statusLabel } from "@/lib/display";
import { AttachmentUploader } from "./ui/attachment-uploader";
import { resolveParams } from "@/lib/next-params";
import { consumeNAction, consumeOneAction, restockToAction } from "../actions";
import { AttachmentKind } from "@prisma/client";

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return format(value, "dd MMM yyyy");
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
}

function formatCustomValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function pathName(node: { name: string; parent?: { name: string; parent?: { name: string } | null } | null } | null) {
  if (!node) return "—";
  const parts = [node.parent?.parent?.name, node.parent?.name, node.name].filter(Boolean) as string[];
  return parts.join(" › ");
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const resolved = await resolveParams(params);
  const identifier = resolved.id;
  if (!identifier) notFound();

  const include = {
    category: { include: { parent: { include: { parent: true } } } },
    type: { include: { fields: { orderBy: [{ sortOrder: "asc" }] } } },
    location: { include: { parent: { include: { parent: true } } } },
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
    customFieldValues: { include: { fieldDefinition: true } },
    attachments: { orderBy: [{ createdAt: "desc" }], include: { createdBy: { select: { id: true, name: true } } } },
    maintenanceIssues: { orderBy: [{ createdAt: "desc" }], take: 10, include: { assignedTo: true, createdBy: true } },
    checkoutItems: {
      include: { checkout: { include: { checkedOutBy: { select: { id: true, name: true } } } } },
      orderBy: [{ id: "desc" }],
      take: 10,
    },
  } satisfies Prisma.EquipmentInclude;

  // Accept either DB id, asset ID, or QR value in the URL (helps if a bad link is generated).
  const equipment =
    (await prisma.equipment.findUnique({ where: { id: identifier }, include })) ??
    (await prisma.equipment.findUnique({ where: { assetId: identifier }, include })) ??
    (await prisma.equipment.findUnique({ where: { qrValue: identifier }, include }));

  if (!equipment) {
    return (
      <div className="rounded-xl border border-[color:var(--border)] bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Equipment not found</div>
        <p className="mt-2 text-sm text-slate-600">
          No item matches <span className="font-mono">{identifier}</span>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50"
            href="/equipment"
          >
            Back to equipment
          </Link>
          <Link className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50" href="/qr">
            QR lookup
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = user.role === Role.ADMIN || user.role === Role.QUARTERMASTER;
  const canUpload = roleAtLeast(user.role, Role.QUARTERMASTER);
  const canConsume = equipment.isConsumable && roleAtLeast(user.role, Role.LEADER);
  const canRestock = equipment.isConsumable && roleAtLeast(user.role, Role.QUARTERMASTER);

  const qrSvg = await QRCode.toString(equipment.qrValue, { type: "svg", margin: 1, width: 196 });

  const [currentCheckout, auditLogs, openMaintenanceCount] = await Promise.all([
    prisma.checkoutItem.findFirst({
      where: { equipmentId: equipment.id, returnedAt: null },
      include: {
        checkout: {
          include: { checkedOutBy: { select: { id: true, name: true } }, borrower: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ id: "desc" }],
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Equipment", entityId: equipment.id },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 25,
    }),
    prisma.maintenanceIssue.count({ where: { equipmentId: equipment.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const customFieldMap = new Map(
    equipment.customFieldValues.map((v) => [v.fieldDefinition.key, { label: v.fieldDefinition.label, value: v.valueJson }]),
  );

  const readyAttachments = equipment.attachments.filter((a) => a.status === "READY");

  const requiredDocs = Array.isArray((equipment.type as unknown as { requiredDocs?: unknown } | null)?.requiredDocs)
    ? ((equipment.type as unknown as { requiredDocs?: unknown }).requiredDocs as unknown[]).filter((v) => typeof v === "string")
    : [];

  const requiredKinds = requiredDocs
    .map((v) => String(v))
    .filter((v): v is AttachmentKind =>
      (Object.values(AttachmentKind) as string[]).includes(v),
    ) as AttachmentKind[];

  const missingRequired = requiredKinds.filter((k) => !readyAttachments.some((a) => a.kind === k));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-slate-600">{equipment.assetId}</div>
          <h1 className="text-xl font-semibold text-slate-900">{equipment.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              variant={
                equipment.status === "AVAILABLE"
                  ? "success"
                  : equipment.status === "CHECKED_OUT"
                    ? "warning"
                    : equipment.status === "MAINTENANCE"
                      ? "danger"
                      : "default"
              }
            >
              {statusLabel(equipment.status)}
            </Badge>
            <Badge variant="default">{conditionLabel(equipment.condition)}</Badge>
            {equipment.location?.name ? <Badge variant="default">{equipment.location.name}</Badge> : null}
            {!equipment.isActive ? <Badge variant="danger">Inactive</Badge> : null}
          </div>
          {currentCheckout ? (
            <div className="mt-2 text-sm text-slate-700">
              Checked out to <span className="font-medium">{currentCheckout.checkout.borrowerName}</span>
              {currentCheckout.checkout.expectedReturnAt ? (
                <>
                  {" "}
                  · due{" "}
                  <span className="font-medium">
                    {formatDistanceToNowStrict(currentCheckout.checkout.expectedReturnAt, { addSuffix: true })}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50" href={`/labels/${equipment.id}`} target="_blank">
            Print label
          </Link>
          {canEdit ? (
            <Link className="rounded-md bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-95" href={`/equipment/${equipment.id}/edit`}>
              Edit
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-medium text-slate-900">Details</div>
            <div className="text-xs text-slate-600">
              Updated {formatDistanceToNowStrict(equipment.updatedAt, { addSuffix: true })}
              {equipment.updatedBy?.name ? ` · by ${equipment.updatedBy.name}` : ""}
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-slate-600">Category</dt>
              <dd className="text-sm">{equipment.category ? pathName(equipment.category) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Type</dt>
              <dd className="text-sm">{equipment.type?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Quantity</dt>
              <dd className="text-sm tabular-nums">
                <div className="flex items-center justify-between gap-3">
                  <span>{equipment.quantity}</span>
                  {canConsume ? (
                    <form action={consumeOneAction} className="hidden sm:block">
                      <input type="hidden" name="equipmentId" value={equipment.id} />
                      <Button type="submit" variant="secondary">
                        Consume 1
                      </Button>
                    </form>
                  ) : null}
                </div>
                {canConsume ? (
                  <form action={consumeOneAction} className="mt-2 sm:hidden">
                    <input type="hidden" name="equipmentId" value={equipment.id} />
                    <Button type="submit" variant="secondary" className="w-full">
                      Consume 1
                    </Button>
                  </form>
                ) : null}
                {canConsume ? (
                  <form action={consumeNAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="equipmentId" value={equipment.id} />
                    <input
                      name="amount"
                      type="number"
                      min={1}
                      max={equipment.quantity}
                      defaultValue={1}
                      inputMode="numeric"
                      className="h-11 w-24 rounded-md border border-[color:var(--border)] px-2 text-right text-sm md:h-9 md:w-20"
                    />
                    <Button type="submit" variant="secondary" disabled={equipment.quantity <= 0}>
                      Consume N
                    </Button>
                  </form>
                ) : null}
                {canRestock ? (
                  <form action={restockToAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="equipmentId" value={equipment.id} />
                    <input
                      name="target"
                      type="number"
                      min={0}
                      defaultValue={Math.max(equipment.minStock ?? 0, equipment.quantity)}
                      inputMode="numeric"
                      className="h-11 w-28 rounded-md border border-[color:var(--border)] px-2 text-right text-sm md:h-9 md:w-24"
                    />
                    <Button type="submit" variant="secondary">
                      Restock to X
                    </Button>
                  </form>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Consumable</dt>
              <dd className="text-sm">{equipment.isConsumable ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Min stock</dt>
              <dd className="text-sm tabular-nums">{equipment.minStock ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Serial number</dt>
              <dd className="text-sm">{equipment.serialNumber ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-600">QR value</dt>
              <dd className="text-sm font-mono break-all">{equipment.qrValue}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Location</dt>
              <dd className="text-sm">{equipment.location ? pathName(equipment.location) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Assigned section</dt>
              <dd className="text-sm">{equipment.assignedSection ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Purchase date</dt>
              <dd className="text-sm">{formatDate(equipment.purchaseDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Warranty expiry</dt>
              <dd className="text-sm">{formatDate(equipment.warrantyExpiry)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-600">Value</dt>
              <dd className="text-sm">{formatMoney(equipment.value)}</dd>
            </div>
          </dl>

          {equipment.description ? (
            <div className="mt-4">
              <div className="text-xs font-medium text-slate-600">Description</div>
              <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{equipment.description}</div>
            </div>
          ) : null}

          {equipment.notes ? (
            <div className="mt-4">
              <div className="text-xs font-medium text-slate-600">Notes</div>
              <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{equipment.notes}</div>
            </div>
          ) : null}

          <div className="mt-6">
            <div className="font-medium text-slate-900">System</div>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-slate-600">Created</dt>
                <dd className="text-sm">
                  {formatDate(equipment.createdAt)}
                  {equipment.createdBy?.name ? ` · ${equipment.createdBy.name}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Last updated</dt>
                <dd className="text-sm">
                  {formatDate(equipment.updatedAt)}
                  {equipment.updatedBy?.name ? ` · ${equipment.updatedBy.name}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-600">Active</dt>
                <dd className="text-sm">
                  {equipment.isActive ? "Yes" : "No"}
                  {equipment.retiredAt ? ` · retired ${formatDistanceToNowStrict(equipment.retiredAt, { addSuffix: true })}` : ""}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">QR label</div>
                <div className="mt-1 text-sm text-slate-600">Print and stick on the item.</div>
              </div>
              <Link
                className="rounded-md border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-slate-50"
                href={`/labels/${equipment.id}`}
                target="_blank"
              >
                Print
              </Link>
            </div>
            <div className="mt-4 flex justify-center rounded-lg border border-slate-100 bg-white p-3">
              <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
            <div className="mt-3 break-all text-center font-mono text-xs text-slate-600">{equipment.qrValue}</div>
            <div className="mt-3 grid gap-2">
              <Link className="rounded-md bg-[color:var(--primary)] px-3 py-2 text-center text-sm font-medium text-white hover:brightness-95" href={`/checkouts/new?itemId=${equipment.id}`}>
                Check out this item
              </Link>
              <Link className="rounded-md border border-[color:var(--border)] px-3 py-2 text-center text-sm hover:bg-slate-50" href={`/maintenance/new?equipmentId=${equipment.id}`}>
                Log maintenance for this item
              </Link>
            </div>
          </div>

          {equipment.type?.fields?.length ? (
            <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
              <div className="font-medium text-slate-900">Type fields</div>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {equipment.type.fields.map((f) => (
                  <div key={f.id} className="min-w-0">
                    <dt className="text-xs font-medium text-slate-600">{f.label}</dt>
                    <dd className="text-sm text-slate-900 break-words">{formatCustomValue(customFieldMap.get(f.key)?.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-slate-900">Recent checkouts</div>
              <Link className="text-sm text-slate-700 underline" href="/checkouts">
                View all
              </Link>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {equipment.checkoutItems.length ? (
                equipment.checkoutItems.map((ci) => (
                  <div key={ci.id} className="flex items-start justify-between gap-3">
                    <Link className="underline text-slate-900" href={`/checkouts/${ci.checkoutId}`}>
                      {ci.returnedAt ? "Returned" : "Out"} · {ci.checkout.borrowerName}
                    </Link>
                    <div className="text-xs text-slate-600">
                      {formatDistanceToNowStrict(ci.checkout.checkedOutAt, { addSuffix: true })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-600">No checkout history yet.</div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-slate-900">Maintenance</div>
              <div className="text-xs text-slate-600">{openMaintenanceCount} open</div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {equipment.maintenanceIssues.length ? (
                equipment.maintenanceIssues.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3">
                    <Link className="underline text-slate-900" href={`/maintenance/${m.id}`}>
                      {m.title}
                    </Link>
                    <div className="text-xs text-slate-600">{m.status}</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-600">No maintenance issues logged.</div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-slate-900">Audit trail</div>
              <div className="text-xs text-slate-600">{auditLogs.length} shown</div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {auditLogs.length ? (
                auditLogs.map((l) => (
                  <div key={l.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-slate-900">{l.summary ?? l.action}</div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {l.actor?.name ?? "System"} · {formatDistanceToNowStrict(l.createdAt, { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 font-mono">{l.action}</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-600">No audit events yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {canUpload ? <AttachmentUploader equipmentId={equipment.id} /> : null}
        {equipment.type?.name && requiredKinds.length ? (
          <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-slate-900">Required docs</div>
              <div className="text-xs text-slate-600">{equipment.type.name}</div>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {requiredKinds.map((k) => {
                const present = !missingRequired.includes(k);
                return (
                  <div key={k} className={`rounded-md border p-3 ${present ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="font-medium text-slate-900">{k.replace(/_/g, " ")}</div>
                    <div className="mt-1 text-xs text-slate-700">{present ? "Attached" : "Missing"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="rounded-md border border-[color:var(--border)] bg-white p-4 shadow-sm">
          <div className="font-medium text-slate-900">Files</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {readyAttachments
              .slice()
              .sort((a, b) => (a.kind === b.kind ? b.createdAt.getTime() - a.createdAt.getTime() : a.kind.localeCompare(b.kind)))
              .map((a) => (
                <a
                  key={a.id}
                  className="group rounded-md border border-[color:var(--border)] p-3 hover:bg-slate-50"
                  href={`/api/attachments/${a.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="text-sm font-medium text-slate-900 group-hover:underline">
                    {a.filename}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {a.kind.replace(/_/g, " ")} · {(a.size / 1024).toFixed(1)} KB
                    {a.createdBy?.name ? ` · ${a.createdBy.name}` : ""}
                  </div>
                  {a.kind === "PHOTO" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/attachments/${a.id}/download`}
                      alt={a.filename}
                      className="mt-3 h-40 w-full rounded-md object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                </a>
              ))}
            {readyAttachments.length === 0 ? (
              <div className="text-sm text-slate-600 sm:col-span-2 lg:col-span-3">
                No attachments yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
