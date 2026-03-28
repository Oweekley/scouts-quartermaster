import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { hmacSha256 } from "@/lib/security";

const SESSION_COOKIE = "sq_session";
const SESSION_DAYS = 30;

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing env var: AUTH_SECRET");
  return secret;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function getCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function createSession(userId: string) {
  const token = nanoid(48);
  const tokenHash = hmacSha256(token, authSecret());
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const userAgent = hdrs.get("user-agent") ?? undefined;

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, ip, userAgent },
  });

  const cookieJar = await cookies();
  cookieJar.set(SESSION_COOKIE, token, getCookieOptions(expiresAt));
}

export async function clearSession() {
  const cookieJar = await cookies();
  const token = cookieJar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hmacSha256(token, authSecret());
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  cookieJar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieJar = await cookies();
  const token = cookieJar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hmacSha256(token, authSecret());
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    cookieJar.delete(SESSION_COOKIE);
    return null;
  }

  if (!session.user.isActive) return null;

  await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function roleAtLeast(userRole: Role, required: Role) {
  const order: Role[] = [Role.READONLY, Role.LEADER, Role.QUARTERMASTER, Role.ADMIN];
  return order.indexOf(userRole) >= order.indexOf(required);
}

export async function requireRole(required: Role) {
  const user = await requireUser();
  if (!roleAtLeast(user.role, required)) redirect("/dashboard?forbidden=1");
  return user;
}
