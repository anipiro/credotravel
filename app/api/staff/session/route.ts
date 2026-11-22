import { NextResponse } from "next/server";
import { STAFF_COOKIE } from "@/lib/request";

/**
 * Demo sign-in. There is no real authentication here: pressing the button
 * sets a cookie. A real staff panel would check a signed session and a role.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const leaving = form?.get("intent") === "leave";
  const response = NextResponse.redirect(new URL(leaving ? "/" : "/staff", request.url), 303);
  if (leaving) {
    response.cookies.delete(STAFF_COOKIE);
  } else {
    response.cookies.set(STAFF_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  }
  return response;
}
