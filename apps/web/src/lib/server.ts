import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserSettingsDto, PublicUser, StatsDto } from "@astracode/shared";

const internalApi = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "");

export async function serverApi<T>(path: string): Promise<T | null> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  try {
    const response = await fetch(`${internalApi}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type MeResponse = { user: PublicUser; settings: UserSettingsDto };

export async function requireUser(): Promise<MeResponse> {
  const store = await cookies();
  if (!store.get("astra_session")) redirect("/login");
  const me = await serverApi<MeResponse>("/auth/me");
  if (!me) redirect("/login");
  return me;
}

export async function getStats(): Promise<StatsDto | null> {
  const result = await serverApi<{ stats: StatsDto }>("/stats");
  return result?.stats ?? null;
}
