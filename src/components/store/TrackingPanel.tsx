"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// "Track your shipment" (live: /help/shipping/#track-order). An LPPEPTIDE order number goes to the order
// lookup (order number + email, doc 02); anything else opens the carrier's own public tracking page.
// These are plain links the customer opens; no carrier API is called (v1: no third-party services).

const CARRIERS: Record<string, { label: string; url: (n: string) => string }> = {
  auto: { label: "Auto detect", url: (n) => `https://t.17track.net/en#nums=${n}` },
  dhl: { label: "DHL", url: (n) => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=${n}` },
  ups: { label: "UPS", url: (n) => `https://www.ups.com/track?tracknum=${n}` },
  fedex: { label: "FedEx", url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  "australia-post": { label: "Australia Post", url: (n) => `https://auspost.com.au/mypost/track/details/${n}` },
  other: { label: "Other (17TRACK)", url: (n) => `https://t.17track.net/en#nums=${n}` },
};

const ORDER_NUMBER = /^LP-\d{4}-[A-Z0-9]{4,}$/i;

export function TrackingPanel() {
  const router = useRouter();
  const [carrier, setCarrier] = useState("auto");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = value.trim().replace(/\s+/g, "");
    if (n.length < 5 || n.length > 60 || !/^[A-Za-z0-9-]+$/.test(n)) {
      setError("Enter the complete order number or tracking number.");
      return;
    }
    setError("");
    if (carrier === "auto" && ORDER_NUMBER.test(n)) {
      router.push(`/login/?order=${encodeURIComponent(n.toUpperCase())}`);
      return;
    }
    window.open(CARRIERS[carrier].url(encodeURIComponent(n)), "_blank", "noopener,noreferrer");
  };

  return (
    <section id="track-order" className="tracking-panel" aria-labelledby="track-order-heading">
      <div className="tracking-panel-copy">
        <p>Track order</p>
        <h2 id="track-order-heading">Track your shipment</h2>
        <span>Enter your LPPEPTIDE order number or logistics tracking number to find the exact shipment record.</span>
      <form className="tracking-form" onSubmit={submit} noValidate>
        <label>
          <span>Carrier</span>
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-describedby="tracking-carrier-help">
            {Object.entries(CARRIERS).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Order or tracking number</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="text"
            autoComplete="off"
            inputMode="text"
            maxLength={60}
            placeholder="LP-2611-... or package tracking number"
            aria-describedby="tracking-help tracking-error"
            aria-invalid={!!error}
          />
        </label>
        <button type="submit">Query</button>
      </form>
      {error && (
        <p id="tracking-error" className="tracking-error" role="alert">
          {error}
        </p>
      )}
      <div className="tracking-help-group">
        <p id="tracking-help" className="tracking-help">
          Use the complete order number from checkout or the complete logistics tracking number assigned to the shipment.
        </p>
        <p id="tracking-carrier-help" className="tracking-help">
          <strong>Auto detect</strong> checks the local shipment record first. If a logistics number is not linked to an order, you can still continue with 17TRACK.
        </p>
      </div>
      </div>
    </section>
  );
}
