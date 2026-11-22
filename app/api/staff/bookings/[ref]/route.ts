import { NextResponse } from "next/server";
import { parseGelInput } from "@/lib/pricing";
import { isDemoStaff } from "@/lib/request";
import { applyStaffAction, type StaffAction } from "@/lib/store";

const ACTIONS: StaffAction[] = ["confirm", "mark_deposit_paid", "cancel"];

/** Staff-only status changes. Customers have no endpoint that can confirm a booking. */
export async function PATCH(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (!(await isDemoStaff())) {
    return NextResponse.json({ error: "Enter as staff to change a booking." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
    if (typeof body !== "object" || body === null) throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "Send the change as a JSON object." }, { status: 400 });
  }

  const action = body.action as StaffAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  let depositTetri: number | null = null;
  if (action === "confirm") {
    depositTetri = typeof body.depositGel === "string" ? parseGelInput(body.depositGel) : null;
    if (depositTetri === null) {
      return NextResponse.json({ error: "Enter the deposit in lari, for example 1500 or 1500.50." }, { status: 422 });
    }
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 200) : "";
  const result = applyStaffAction((await params).ref, action, { depositTetri, note });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ref: result.booking.ref, status: result.booking.status, depositTetri: result.booking.depositTetri });
}
