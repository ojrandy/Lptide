"use client";

import { ClipboardCheck, FileText, FlaskConical, Search, Tag, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { Settings } from "@/lib/settings-schema";

type Certificate = Settings["coaCertificates"][number];

const ASSURANCES = [
  { icon: Tag, title: "Batch identity", body: "Catalog code and batch reference stay linked to the report." },
  { icon: FlaskConical, title: "Analytical evidence", body: "Published files let you review identity, purity, and method." },
  { icon: ClipboardCheck, title: "Research-use record", body: "Reference documentation to review before requesting a quote." },
];

/** COA library (live: /coa/). `initialQuery` pre-filters, e.g. /coa/rt10/ from a product page. */
export function CoaLibrary({ certificates, initialQuery = "" }: { certificates: Certificate[]; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState<Certificate | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const shown = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return certificates.filter((c) => {
      const hay = `${c.sku} ${c.title} ${c.report} ${c.recordId}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [certificates, q]);

  const preview = (c: Certificate) => {
    setOpen(c);
    dialog.current?.showModal();
  };

  return (
    <main className="coa-page">
      <header className="coa-page-heading">
        <span>LPPEPTIDE ANALYTICAL LIBRARY</span>
        <h1>COA Certificates</h1>
        <p>Browse analytical documentation by product and batch.</p>
      </header>
      <section className="coa-assurance" aria-label="What you can verify in each record">
        <h2>What you can verify in each record</h2>
        <div className="coa-assurance-list">
          {ASSURANCES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="coa-assurance-item">
              <span className="coa-assurance-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <label className="coa-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search product, batch, or report number"
          aria-label="Search certificates"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <section className="coa-grid" aria-label="COA certificate results">
        {shown.length === 0 && <p className="coa-empty">No certificates match “{q}”.</p>}
        {shown.map((c) => {
          // Certificates uploaded as PDF open in a new tab; images open in the viewer.
          const pdf = c.file.toLowerCase().endsWith(".pdf");
          return (
          <article key={c.file} className="coa-card">
            {pdf ? (
              <a className="coa-preview lp-coa-pdf" href={c.file} target="_blank" rel="noopener noreferrer" aria-label={`View certificate: ${c.report} (PDF)`}>
                <FileText size={48} aria-hidden="true" />
                <span>PDF certificate</span>
              </a>
            ) : (
              <button className="coa-preview" type="button" aria-label={`View certificate: ${c.report}`} onClick={() => preview(c)}>
                <Image src={c.file} alt={c.title} width={480} height={640} sizes="(max-width: 760px) 50vw, 280px" />
              </button>
            )}
            <div className="coa-card-body">
              <small className="coa-sku">{c.sku}</small>
              <h2>{c.report}</h2>
              <p className="coa-record-id">{c.recordId}</p>
              <div className="coa-actions">
                {pdf ? (
                  <a href={c.file} target="_blank" rel="noopener noreferrer">
                    View certificate
                  </a>
                ) : (
                  <button type="button" onClick={() => preview(c)}>
                    View certificate
                  </button>
                )}
                <a href={c.file} target="_blank" rel="noopener noreferrer">
                  Open file
                </a>
              </div>
            </div>
          </article>
          );
        })}
      </section>
      <dialog
        ref={dialog}
        className="storefront-context-search lp-coa-viewer"
        aria-label={open?.title ?? "Certificate"}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        onClose={() => setOpen(null)}
      >
        {open && (
          <div>
            <button type="button" aria-label="Close certificate" onClick={() => dialog.current?.close()}>
              <X size={20} aria-hidden="true" />
            </button>
            <h2>{open.title}</h2>
            <Image src={open.file} alt={open.title} width={1200} height={1600} sizes="(max-width: 760px) 100vw, 860px" />
          </div>
        )}
      </dialog>
    </main>
  );
}
