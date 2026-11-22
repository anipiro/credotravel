"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Currency } from "@/lib/pricing";

const OPTIONS: { code: Currency; sign: string; name: string }[] = [
  { code: "GEL", sign: "₾", name: "Georgian lari" },
  { code: "USD", sign: "$", name: "US dollars" },
  { code: "EUR", sign: "€", name: "Euros" },
];

export function CurrencySwitch({ current }: { current: Currency }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(code: Currency) {
    document.cookie = `currency=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="currency" role="group" aria-label="Show prices in" aria-busy={pending}>
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          className="currency-option"
          aria-pressed={current === option.code}
          title={option.name}
          onClick={() => choose(option.code)}
        >
          <span aria-hidden="true">{option.sign}</span> {option.code}
        </button>
      ))}
    </div>
  );
}
