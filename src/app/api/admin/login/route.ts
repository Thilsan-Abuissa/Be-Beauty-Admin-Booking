import { cookies } from "next/headers";
import { checkPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!checkPassword(String(body.password ?? ""))) {
    // Slow down password guessing a little.
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Wrong password" }, 401);
  }

  const { token, expires } = createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return json({ ok: true });
}
