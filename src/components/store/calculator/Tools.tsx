"use client";

import { LocaleLink as Link } from "@/i18n/client";
import { useMemo, useState } from "react";

// Research tools, same formulas, defaults and rounding as the live calculator bundle.

/** Number format used by the live tools: up to `max` decimals, at least 1 unless max is 0. */
const fmt = (n: number, max = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: max, minimumFractionDigits: max === 0 ? 0 : Math.min(max, 1) }).format(
    Number.isFinite(n) ? n : 0,
  );
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
/** Safe division (0 when the divisor is not positive). */
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function Field({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step: string }) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} min="0" step={step} type="number" inputMode="decimal" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Results({ title, rows, single }: { title: string; rows: [string, string][]; single?: boolean }) {
  return (
    <div className="result-panel">
      <p className="result-title">{title}</p>
      <dl className={single ? "result-grid single-column" : "result-grid"}>
        {rows.map(([dt, dd]) => (
          <div key={dt}>
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ToolCopy({ kicker, heading }: { kicker: string; heading: string }) {
  return (
    <div className="tool-copy">
      <p className="tool-kicker">{kicker}</p>
      <h2>{heading}</h2>
    </div>
  );
}

const SYRINGES = [
  { value: "u100", label: "U-100", unitsPerMl: 100 },
  { value: "u50", label: "U-50", unitsPerMl: 50 },
  { value: "u30", label: "U-30", unitsPerMl: 30 },
  { value: "custom", label: "Custom syringe", unitsPerMl: 0 },
];

export function ReconstitutionTool() {
  const [mg, setMg] = useState("5");
  const [water, setWater] = useState("2");
  const [dose, setDose] = useState("250");
  const [syringe, setSyringe] = useState("u100");
  const [custom, setCustom] = useState("100");

  const unitsPerMl = syringe === "custom" ? num(custom) : (SYRINGES.find((s) => s.value === syringe)?.unitsPerMl ?? 100);
  const totalMcg = num(mg) * 1000;
  const concentration = div(totalMcg, num(water));
  const mcgPerUnit = div(concentration, unitsPerMl);
  const units = div(num(dose), mcgPerUnit);

  return (
    <section className="tool-panel">
      <ToolCopy kicker="Reconstitution calculator" heading="Calculate syringe units from peptide amount, water, and desired dose." />
      <div className="tool-grid">
        <form className="calculator-form" onSubmit={(e) => e.preventDefault()}>
          <Field label="Peptide Amount mg" value={mg} onChange={setMg} step="0.01" />
          <Field label="Water Added mL" value={water} onChange={setWater} step="0.01" />
          <Field label="Desired Dose mcg" value={dose} onChange={setDose} step="1" />
          <label>
            <span>Syringe Type</span>
            <select value={syringe} onChange={(e) => setSyringe(e.target.value)}>
              {SYRINGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {syringe === "custom" && <Field label="Custom units per mL" value={custom} onChange={setCustom} step="1" />}
        </form>
        <Results
          title="Calculation Results"
          rows={[
            ["Total mcg", `${fmt(totalMcg, 0)} mcg`],
            ["Concentration", `${fmt(concentration, 2)} mcg/mL`],
            ["mcg per Unit", `${fmt(mcgPerUnit, 2)} mcg`],
            ["Units to Draw", `${fmt(units, 1)} units`],
            ["Volume to Draw", `${fmt(div(units, unitsPerMl), 3)} mL`],
            ["Total Doses", `${fmt(div(totalMcg, num(dose)), 1)} doses`],
          ]}
        />
      </div>
    </section>
  );
}

export function CostPerDoseTool() {
  const [price, setPrice] = useState("180");
  const [mg, setMg] = useState("5");
  const [vials, setVials] = useState("10");
  const [dose, setDose] = useState("250");
  const perVial = div(num(mg) * 1000, num(dose));
  const perKit = perVial * num(vials);

  return (
    <section className="tool-panel">
      <ToolCopy kicker="Cost calculator" heading="Estimate total kit value from price, vial amount, and dose size." />
      <div className="tool-grid compact-grid">
        <form className="calculator-form" onSubmit={(e) => e.preventDefault()}>
          <Field label="Product Price" value={price} onChange={setPrice} step="0.01" />
          <Field label="Vial Amount mg" value={mg} onChange={setMg} step="0.01" />
          <Field label="Vials per Kit" value={vials} onChange={setVials} step="1" />
          <Field label="Desired Dose mcg" value={dose} onChange={setDose} step="1" />
        </form>
        <Results
          title="Cost Results"
          single
          rows={[
            ["Total Doses per Vial", `${fmt(perVial, 1)} doses`],
            ["Total Doses per Kit", `${fmt(perKit, 1)} doses`],
            ["Cost per Dose", usd(div(num(price), perKit))],
          ]}
        />
      </div>
    </section>
  );
}

export function VialDurationTool() {
  const [mg, setMg] = useState("5");
  const [dose, setDose] = useState("250");
  const [freq, setFreq] = useState("3");
  const doses = div(num(mg) * 1000, num(dose));
  const weeks = div(doses, num(freq));

  return (
    <section className="tool-panel">
      <ToolCopy kicker="Vial duration calculator" heading="Estimate how many weeks a vial covers at a selected weekly frequency." />
      <div className="tool-grid compact-grid">
        <form className="calculator-form" onSubmit={(e) => e.preventDefault()}>
          <Field label="Vial Amount mg" value={mg} onChange={setMg} step="0.01" />
          <Field label="Desired Dose mcg" value={dose} onChange={setDose} step="1" />
          <Field label="Frequency per Week" value={freq} onChange={setFreq} step="0.5" />
        </form>
        <Results
          title="Duration Results"
          single
          rows={[
            ["Total Doses", `${fmt(doses, 1)} doses`],
            ["Estimated Weeks", `${fmt(weeks, 1)} weeks`],
            ["Estimated Days", `${fmt(weeks * 7, 0)} days`],
          ]}
        />
      </div>
    </section>
  );
}

export type LookupProduct = {
  code: string;
  slug: string;
  name: string;
  amountMg: number;
  packageSize: string;
  priceCents: number;
  category: string;
  aliases: string[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function ProductLookupTool({ products }: { products: LookupProduct[] }) {
  const [q, setQ] = useState("");
  const query = norm(q);
  const results = useMemo(
    () => (query ? products.filter((p) => [p.code, p.name, p.category, ...p.aliases].some((t) => norm(t).includes(query))).slice(0, 8) : []),
    [products, query],
  );

  return (
    <section className="tool-panel">
      <ToolCopy kicker="Product lookup" heading="Search the current LPPEPTIDE list by name, abbreviation, or code." />
      <div className="lookup-layout">
        <label className="lookup-search">
          <span>Product name or abbreviation</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="BPC-157, TB500, GHK-Cu" type="search" />
        </label>
        {results.length > 0 ? (
          <div className="product-results">
            {results.map((p) => (
              <article key={p.slug} className="product-result-card">
                <div>
                  <p>{p.code}</p>
                  <h2>
                    <Link href={`/peptide/${p.slug}.html`}>{p.name}</Link>
                  </h2>
                </div>
                <dl>
                  <div>
                    <dt>amount_mg</dt>
                    <dd>{p.amountMg} mg</dd>
                  </div>
                  <div>
                    <dt>package</dt>
                    <dd>{p.packageSize}</dd>
                  </div>
                  <div>
                    <dt>price</dt>
                    <dd>{usd(p.priceCents / 100)}</dd>
                  </div>
                  <div>
                    <dt>category</dt>
                    <dd>{p.category}</dd>
                  </div>
                  <div>
                    <dt>source</dt>
                    <dd>PDF catalog</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          q.trim() && <p className="lookup-empty"> Product not found in current LPPEPTIDE list. Please contact sales for confirmation. </p>
        )}
      </div>
    </section>
  );
}
