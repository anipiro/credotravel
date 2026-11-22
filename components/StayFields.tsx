import { MAX_ADULTS, MAX_CHILDREN, type Errors } from "@/lib/validation";
import type { StayFields as Fields } from "@/lib/request";

/** Date and guest inputs shared by the home search and the resort page. Plain GET form fields. */
export function StayFields({ fields, errors, today, idPrefix }: { fields: Fields; errors: Errors; today: string; idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const describe = (name: string) => (errors[name] ? id(`${name}-error`) : undefined);

  return (
    <>
      <div className="field">
        <label htmlFor={id("in")}>Check-in</label>
        <input id={id("in")} type="date" name="in" defaultValue={fields.checkIn} min={today} required aria-invalid={!!errors.checkIn} aria-describedby={describe("checkIn")} />
        {errors.checkIn && <p className="field-error" id={id("checkIn-error")}>{errors.checkIn}</p>}
      </div>
      <div className="field">
        <label htmlFor={id("out")}>Check-out</label>
        <input id={id("out")} type="date" name="out" defaultValue={fields.checkOut} min={today} required aria-invalid={!!errors.checkOut} aria-describedby={describe("checkOut")} />
        {errors.checkOut && <p className="field-error" id={id("checkOut-error")}>{errors.checkOut}</p>}
      </div>
      <div className="field field-narrow">
        <label htmlFor={id("adults")}>Adults</label>
        <select id={id("adults")} name="adults" defaultValue={fields.adults} aria-invalid={!!errors.adults} aria-describedby={describe("adults")}>
          {Array.from({ length: MAX_ADULTS }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1}</option>
          ))}
        </select>
        {errors.adults && <p className="field-error" id={id("adults-error")}>{errors.adults}</p>}
      </div>
      <div className="field field-narrow">
        <label htmlFor={id("children")}>Children <span className="label-hint">2 to 11</span></label>
        <select id={id("children")} name="children" defaultValue={fields.children} aria-invalid={!!errors.children} aria-describedby={describe("children")}>
          {Array.from({ length: MAX_CHILDREN + 1 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        {errors.children && <p className="field-error" id={id("children-error")}>{errors.children}</p>}
      </div>
    </>
  );
}
