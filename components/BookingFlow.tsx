"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { validateGuest, type Errors, type Stay } from "@/lib/validation";

interface Summary {
  resortName: string;
  atollName: string;
  villa: string;
  transfer: string;
  dates: string;
  nights: number;
  party: string;
  total: string;
  totalGel: string;
  perGuestNight: string;
  showsGel: boolean;
}

const STEPS = ["Your stay", "Guest details", "Review", "Confirmation"];

const EMPTY = { firstName: "", lastName: "", email: "", phone: "", notes: "" };
type GuestForm = typeof EMPTY;

const FIELD_ORDER: (keyof GuestForm)[] = ["firstName", "lastName", "email", "phone", "notes"];

export function BookingFlow({
  resortId,
  backHref,
  stay,
  totalGelTetri,
  summary,
}: {
  resortId: string;
  backHref: string;
  stay: Stay;
  totalGelTetri: number;
  summary: Summary;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [guest, setGuest] = useState<GuestForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the step heading so keyboard and screen-reader users land on the new step.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  function update(name: keyof GuestForm, value: string) {
    setGuest((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors(({ [name]: _removed, ...rest }) => rest);
  }

  function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateGuest(guest);
    if (!result.ok) {
      setErrors(result.errors);
      const firstBad = FIELD_ORDER.find((name) => result.errors[name]);
      if (firstBad) document.getElementById(`guest-${firstBad}`)?.focus();
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function send() {
    setSending(true);
    setServerError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resortId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          adults: stay.adults,
          children: stay.children,
          guest,
          // Sent only so the server can tell us if the price moved. The server never uses it as the price.
          seenTotalGelTetri: totalGelTetri,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 201 && data.ref) {
        router.push(`/booking/${data.ref}`);
        return;
      }
      if (response.status === 422 && data.errors?.guest) {
        setErrors(data.errors.guest);
        setStep(1);
      } else if (response.status === 409) {
        setServerError(`${data.error} Reload the page to see the current price.`);
      } else {
        setServerError(data.error ?? "The booking request could not be sent. Try again in a moment.");
      }
    } catch {
      setServerError("The booking request could not be sent. Check your connection and try again.");
    }
    setSending(false);
  }

  const errorCount = Object.keys(errors).length;

  const field = (name: keyof GuestForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div className="field">
      <label htmlFor={`guest-${name}`}>{label}</label>
      {hint && <p className="field-hint" id={`guest-${name}-hint`}>{hint}</p>}
      <input
        id={`guest-${name}`}
        name={name}
        value={guest[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={!!errors[name]}
        aria-describedby={[hint ? `guest-${name}-hint` : "", errors[name] ? `guest-${name}-error` : ""].filter(Boolean).join(" ") || undefined}
        required
        {...props}
      />
      {errors[name] && <p className="field-error" id={`guest-${name}-error`}>{errors[name]}</p>}
    </div>
  );

  return (
    <div className="booking-layout">
      <div className="booking-main">
        <ol className="steps" aria-label="Booking progress">
          {STEPS.map((name, index) => (
            <li key={name} className={index === step ? "is-current" : index < step ? "is-done" : undefined} aria-current={index === step ? "step" : undefined}>
              <span className="steps-number">{index + 1}</span>
              <span className="steps-name">{name}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section>
            <h1 ref={heading} tabIndex={-1}>Check your stay</h1>
            <p className="lede">This is what you are asking us to hold. You can change it before going on.</p>
            <dl className="review">
              <div><dt>Resort</dt><dd>{summary.resortName}, {summary.atollName}</dd></div>
              <div><dt>Villa</dt><dd>{summary.villa}</dd></div>
              <div><dt>Dates</dt><dd>{summary.dates} ({summary.nights} {summary.nights === 1 ? "night" : "nights"})</dd></div>
              <div><dt>Guests</dt><dd>{summary.party}</dd></div>
              <div><dt>Transfer</dt><dd>{summary.transfer}</dd></div>
            </dl>
            <div className="actions">
              <button type="button" className="button button-primary" onClick={() => setStep(1)}>Continue to guest details</button>
              <Link href={backHref} className="button button-quiet">Change dates or guests</Link>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 ref={heading} tabIndex={-1}>Who is travelling?</h1>
            <p className="lede">Details of the lead guest. No account or password is needed.</p>
            {errorCount > 0 && (
              <p className="notice notice-error" role="alert">
                {errorCount === 1 ? "One field needs" : `${errorCount} fields need`} another look.
              </p>
            )}
            <form onSubmit={submitDetails} noValidate className="guest-form">
              <div className="field-pair">
                {field("firstName", "First name", { autoComplete: "given-name", maxLength: 60 })}
                {field("lastName", "Last name", { autoComplete: "family-name", maxLength: 60 })}
              </div>
              {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", maxLength: 254 }, "The confirmation and deposit details go here.")}
              {field("phone", "Phone", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 24 }, "With country code, for example +995 555 010 203.")}
              <div className="field">
                <label htmlFor="guest-notes">Anything we should know? <span className="label-hint">optional</span></label>
                <textarea
                  id="guest-notes"
                  name="notes"
                  rows={3}
                  maxLength={500}
                  value={guest.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  aria-invalid={!!errors.notes}
                  aria-describedby={errors.notes ? "guest-notes-error" : undefined}
                />
                {errors.notes && <p className="field-error" id="guest-notes-error">{errors.notes}</p>}
              </div>
              <div className="actions">
                <button type="submit" className="button button-primary">Continue to review</button>
                <button type="button" className="button button-quiet" onClick={() => setStep(0)}>Back to your stay</button>
              </div>
            </form>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 ref={heading} tabIndex={-1}>Review and send</h1>
            <p className="lede">Sending the request does not charge you. Staff confirm availability and tell you the deposit.</p>
            <dl className="review">
              <div><dt>Resort</dt><dd>{summary.resortName}, {summary.atollName}</dd></div>
              <div><dt>Dates</dt><dd>{summary.dates} ({summary.nights} {summary.nights === 1 ? "night" : "nights"})</dd></div>
              <div><dt>Guests</dt><dd>{summary.party}</dd></div>
              <div><dt>Lead guest</dt><dd>{guest.firstName.trim()} {guest.lastName.trim()}</dd></div>
              <div><dt>Email</dt><dd>{guest.email.trim()}</dd></div>
              <div><dt>Phone</dt><dd>{guest.phone.trim()}</dd></div>
              {guest.notes.trim() && <div><dt>Note</dt><dd>{guest.notes.trim()}</dd></div>}
              <div className="review-total"><dt>Total, taxes included</dt><dd>{summary.totalGel}</dd></div>
            </dl>
            {serverError && <p className="notice notice-error" role="alert">{serverError}</p>}
            <div className="actions">
              <button type="button" className="button button-primary" onClick={send} disabled={sending}>
                {sending ? "Sending booking request" : "Send booking request"}
              </button>
              <button type="button" className="button button-quiet" onClick={() => setStep(1)} disabled={sending}>Back to guest details</button>
            </div>
          </section>
        )}
      </div>

      <aside className="booking-aside" aria-label="Price summary">
        <p className="aside-name">{summary.resortName}</p>
        <p className="aside-meta">{summary.dates}</p>
        <p className="aside-meta">{summary.party}</p>
        <p className="aside-total">{summary.total}</p>
        <p className="price-unit">total, taxes included</p>
        <p className="price-unit">{summary.perGuestNight} per night, per guest</p>
        {!summary.showsGel && <p className="price-note">You pay {summary.totalGel}. Other currencies show the same amount converted.</p>}
      </aside>
    </div>
  );
}
