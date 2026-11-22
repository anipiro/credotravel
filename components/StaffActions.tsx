"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingStatus, StaffAction } from "@/lib/store";

export function StaffActions({
  bookingRef,
  status,
  total,
  deposit,
  suggestedDepositGel,
}: {
  bookingRef: string;
  status: BookingStatus;
  total: string;
  deposit: string | null;
  suggestedDepositGel: string;
}) {
  const router = useRouter();
  const [depositGel, setDepositGel] = useState(suggestedDepositGel);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: StaffAction) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/staff/bookings/${bookingRef}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, depositGel }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error ?? "The change was not saved. Try again.");
      else router.refresh();
    } catch {
      setError("The change was not saved. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="staff-actions">
      {status === "new" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run("confirm");
          }}
          noValidate
        >
          <div className="field">
            <label htmlFor="deposit">Deposit in lari</label>
            <p className="field-hint" id="deposit-hint">
              Total is {total}. The suggested 30% is filled in; change it if the resort asks for more.
            </p>
            <input
              id="deposit"
              inputMode="decimal"
              value={depositGel}
              onChange={(event) => setDepositGel(event.target.value)}
              aria-describedby={error ? "deposit-hint action-error" : "deposit-hint"}
              aria-invalid={!!error}
            />
          </div>
          <button type="submit" className="button button-primary button-block" disabled={busy}>Confirm booking and set deposit</button>
        </form>
      )}

      {status === "confirmed" && (
        <>
          <p>Deposit of <strong>{deposit}</strong> is due from the customer. Total is {total}.</p>
          <button type="button" className="button button-primary button-block" disabled={busy} onClick={() => run("mark_deposit_paid")}>
            Mark deposit as paid
          </button>
        </>
      )}

      {status === "deposit_paid" && <p>Deposit of <strong>{deposit}</strong> received. Nothing to do until the balance is due.</p>}
      {status === "cancelled" && <p>This booking is cancelled. It stays in the order book for the record.</p>}

      {error && <p className="notice notice-error" id="action-error" role="alert">{error}</p>}

      {status !== "cancelled" && (
        <button type="button" className="button button-danger button-block" disabled={busy} onClick={() => run("cancel")}>
          Cancel booking
        </button>
      )}
    </div>
  );
}
