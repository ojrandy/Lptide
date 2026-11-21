"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { trackShipment } from "@/lib/actions/tracking";

// "Track your shipment" (live: /help/shipping/#track-order). An LPPEPTIDE order number goes to the order
// lookup (order number + email). In auto mode a tracking number is first looked up in the local shipment records
// (V2-3: status + carrier link, no personal data); otherwise it opens the chosen carrier's public tracking page.
// These are links the customer opens; no carrier API is called.

type Carrier = { code: string; name: string; trackingUrl: string };
const FALLBACK = "https://t.17track.net/en#nums={number}";
const ORDER_NUMBER = /^LP-\d{4}-[A-Z0-9]{4,}$/i;

export function TrackingPanel({ carriers }: { carriers: Carrier[] }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const [carrier, setCarrier] = useState("auto");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ text: string; url: string } | null>(null);
  const [pending, start] = useTransition();

  const open = (template: string, n: string) => window.open(template.replace("{number}", encodeURIComponent(n)), "_blank", "noopener,noreferrer");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const n = value.trim().replace(/\s+/g, "");
    if (n.length < 5 || n.length > 60 || !/^[A-Za-z0-9-]+$/.test(n)) {
      setError(t("tracking.invalid"));
      return;
    }
    setError("");
    if (carrier !== "auto") return open(carriers.find((c) => c.code === carrier)?.trackingUrl ?? FALLBACK, n);
    if (ORDER_NUMBER.test(n)) return router.push(href(`/login/?order=${encodeURIComponent(n.toUpperCase())}`));
    start(async () => {
      const r = await trackShipment(n);
      if (r.found) setResult({ text: t("tracking.found", { status: t(`order.s.${r.status}`), carrier: r.carrier }), url: r.url });
      else if (r.error) setError(r.error);
      else {
        setResult({ text: t("tracking.notFound"), url: FALLBACK.replace("{number}", encodeURIComponent(n)) });
        open(FALLBACK, n);
      }
    });
  };

  return (
    <section id="track-order" className="tracking-panel" aria-labelledby="track-order-heading">
      <div className="tracking-panel-copy">
        <p>{t("tracking.eyebrow")}</p>
        <h2 id="track-order-heading">{t("tracking.title")}</h2>
        <span>{t("tracking.intro")}</span>
      </div>
      {/* Live order: copy, form, help text, then error/result (siblings, so the copy styles don't apply to them). */}
      <form className="tracking-form" onSubmit={submit} noValidate>
        <label>
          <span>{t("tracking.carrier")}</span>
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-describedby="tracking-carrier-help">
            <option value="auto">{t("tracking.auto")}</option>
            {carriers.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("tracking.number")}</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="text"
            autoComplete="off"
            inputMode="text"
            maxLength={60}
            placeholder={t("tracking.placeholder")}
            aria-describedby="tracking-help tracking-error"
            aria-invalid={!!error}
          />
        </label>
        <button type="submit" disabled={pending}>
          {t("tracking.query")}
        </button>
      </form>
      <div className="tracking-help-group">
        <p id="tracking-help" className="tracking-help">
          {t("tracking.help")}
        </p>
        <p id="tracking-carrier-help" className="tracking-help">
          <strong>{t("tracking.auto")}</strong> {t("tracking.autoHelp")}
        </p>
      </div>
      {error && (
        <p id="tracking-error" className="tracking-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="tracking-help lp-tracking-result" role="status">
          {result.text}{" "}
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            {t("tracking.open")}
          </a>
        </p>
      )}
    </section>
  );
}
