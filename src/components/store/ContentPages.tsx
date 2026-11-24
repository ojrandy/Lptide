import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import type { ReactNode } from "react";
import type { Block, CompanyPageContent, ContentPageContent } from "@/content/pages";

// Renderers for the two live content templates: "company" (About, Terms, Contact) and
// "content" (FAQ, Fees, Shipping). Copy lives in src/content/pages.ts.

export function Blocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case "h2":
        return (
          <h2 key={i} id={b.id} className={b.className}>
            {b.text}
          </h2>
        );
      case "h3":
        return (
          <h3 key={i} id={b.id} className={b.className}>
            {b.text}
          </h3>
        );
      case "p":
        return (
          <p key={i} className={b.className}>
            {b.text}
          </p>
        );
      case "ul":
      case "ol": {
        const List = b.type;
        return (
          <List key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </List>
        );
      }
      case "table":
        return (
          <table key={i} className={b.className}>
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
    }
  });
}

export function CompanyPage({ page, asideExtra }: { page: CompanyPageContent; asideExtra?: ReactNode }) {
  return (
    <div className="site-shell company-shell">
      <main className="company-page">
        <section className={page.heroClass}>
          <div className="company-hero-copy">
            <p className="company-kicker">{page.kicker}</p>
            <h1>{page.heading}</h1>
            <p>{page.intro}</p>
          </div>
          {page.heroImage && (
            <div className="company-hero-media" aria-hidden="true">
              <Image src={page.heroImage} alt="" width={640} height={480} sizes="(max-width: 760px) 100vw, 480px" preload fetchPriority="high" />
            </div>
          )}
        </section>
        {/* Live adds contact-content on the contact page (tinted first card, wider article column). */}
        <section className={page.heroClass.includes("contact-hero") ? "company-content contact-content" : "company-content"}>
          <article className="company-article">
            {page.sections.map((s, i) => (
              <section key={i} className="content-section">
                <Blocks blocks={s} />
              </section>
            ))}
          </article>
          <aside className="company-aside" aria-label="Page details">
            {page.aside.map((s, i) => (
              <div key={i} className="aside-card">
                <Blocks blocks={s} />
              </div>
            ))}
            {asideExtra}
          </aside>
        </section>
      </main>
    </div>
  );
}

/** `before` renders above the body inside the article (the shipping page puts its tracking panel there). */
export function ContentPage({ page, before }: { page: ContentPageContent; before?: ReactNode }) {
  return (
    <div className="site-shell content-page-shell">
      <main className="content-page">
        <section className="content-page-hero">
          <div>
            <nav className="content-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              {page.section && <span>{page.section}</span>}
              <span>{page.heading}</span>
            </nav>
            <p>{page.kicker}</p>
            <h1>{page.heading}</h1>
            <p>{page.intro}</p>
          </div>
        </section>
        <article className="content-page-article">
          {before}
          <div className="content-page-body">
            {page.toc.length > 0 && (
              <div className="toc">
                <h5>On this page</h5>
                {page.toc.map((t) => (
                  <a key={t.id} href={`#${t.id}`}>
                    {t.label}
                  </a>
                ))}
              </div>
            )}
            <Blocks blocks={page.body} />
          </div>
        </article>
      </main>
    </div>
  );
}
