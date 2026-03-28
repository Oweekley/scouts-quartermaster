import Link from "next/link";
import { AttachmentKind, Role } from "@prisma/client";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser, roleAtLeast } from "@/lib/auth";
import { resolveParams } from "@/lib/next-params";
import { Card, CardBody } from "@/components/ui/card";
import { LocationPhotoUploader } from "./ui/location-photo-uploader";
import { HotspotEditor } from "./ui/hotspot-editor";
import { createHotspotAction, deleteHotspotAction } from "./actions";

export default async function LocationDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const canManage = roleAtLeast(user.role, Role.QUARTERMASTER);

  const resolved = await resolveParams(params);
  if (!resolved.id) notFound();

  const location = await prisma.location.findUnique({
    where: { id: resolved.id },
    include: {
      parent: true,
      children: { orderBy: [{ name: "asc" }] },
      attachments: { where: { status: "READY" }, orderBy: [{ createdAt: "desc" }] },
      hotspots: { include: { targetLocation: true }, orderBy: [{ createdAt: "desc" }] },
    },
  });
  if (!location) notFound();

  const photo = location.attachments.find((a) => a.kind === AttachmentKind.PHOTO) ?? null;
  const imageUrl = photo ? `/api/attachments/${photo.id}/download` : null;

  const allLocations = canManage
    ? await prisma.location.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }] })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{location.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{location.notes ?? "Visual storage map with hotspots."}</p>
          {location.parent ? (
            <div className="mt-2 text-sm">
              Parent:{" "}
              <Link className="underline text-slate-700" href={`/locations/${location.parent.id}`}>
                {location.parent.name}
              </Link>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Link className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-slate-50" href="/locations">
            Back
          </Link>
          {canManage ? <LocationPhotoUploader locationId={location.id} /> : null}
        </div>
      </div>

      {location.children.length ? (
        <Card>
          <CardBody className="space-y-2">
            <div className="font-medium text-slate-900">Child locations</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {location.children.map((c) => (
                <Link key={c.id} className="rounded-md border border-[color:var(--border)] px-3 py-2 hover:bg-slate-50" href={`/locations/${c.id}`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <HotspotEditor
        locationId={location.id}
        canManage={canManage}
        imageUrl={imageUrl}
        hotspots={location.hotspots.map((h) => ({
          id: h.id,
          label: h.label,
          x: h.x,
          y: h.y,
          w: h.w,
          h: h.h,
          targetLocationId: h.targetLocationId,
          targetLocationName: h.targetLocation?.name ?? null,
        }))}
        locations={allLocations}
        createAction={createHotspotAction}
        deleteAction={deleteHotspotAction}
      />
    </div>
  );
}

