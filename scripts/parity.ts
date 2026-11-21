// Copy parity with the live site (docs/05: same title, meta description and copy as _capture/pages/*.md).
// Usage: npm run parity -- [baseUrl] [--verbose]   (default http://localhost:3000). Exit code 1 on any mismatch.
// For each captured page: <title>, meta description and H1 must match exactly, and every captured body line
// must appear in the server-rendered HTML. Product grids are data-driven, so pages listed in DYNAMIC only get
// the head checks.
import { readdirSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const BASE = (args.find((a) => !a.startsWith("--")) ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
// Head counts on these pages are computed from the catalog (live had 56 products when captured), so digits are ignored.
const DYNAMIC = new Set(["home", "catalog", "category__weight-loss-metabolic"]);
// Deliberate differences from the live copy, each with its reason (docs/01 scope, docs/09 decisions log).
const KNOWN: Record<string, Record<string, string>> = {
  "affiliate-program": { "view affiliate eligibility": "program dashboard is v2; CTA is 'Contact us to apply' (prompt P3)" },
};

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m);
const norm = (s: string) =>
  decode(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

function visibleText(html: string) {
  return norm(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h\d|\/td|\/th|\/button|\/a|\/span|\/label|\/option|\/summary)\b[^>]*>/gi, " $& ")
      .replace(/<[^>]+>/g, " "),
  );
}

async function main() {
  let failed = 0;
  const files = readdirSync("_capture/pages").filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const name = file.slice(0, -3);
    const md = readFileSync(`_capture/pages/${file}`, "utf8").replace(/\r/g, "");
    const [head, ...rest] = md.split("\n---\n");
    const title = head.match(/^# (.+)$/m)?.[1].trim();
    const url = head.match(/^URL: (.+)$/m)?.[1].trim();
    const description = head.match(/^Meta description: (.+)$/m)?.[1].trim();
    const h1 = head.match(/^H1: (.+)$/m)?.[1].trim();
    if (!url) continue;
    const path = new URL(url).pathname;

    const res = await fetch(BASE + path);
    const html = await res.text();
    const text = visibleText(html);
    const problems: string[] = [];
    if (res.status !== 200) problems.push(`status ${res.status}`);
    // The capture is innerText: <br> joins words and CSS text-transform changes case, so H1 ignores
    // whitespace and body lines ignore case. Titles and descriptions are compared exactly.
    const same = (a: string, b: string) => (DYNAMIC.has(name) ? a.replace(/\d+/g, "#") === b.replace(/\d+/g, "#") : a === b);
    const gotTitle = norm(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    if (title && !same(gotTitle, norm(title))) problems.push(`title "${gotTitle}" (want "${title}")`);
    const gotDesc = norm(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
    if (description && !same(gotDesc, norm(description))) problems.push(`description "${gotDesc}" (want "${description}")`);
    const gotH1 = norm((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, " "));
    if (h1 && gotH1.replace(/\s/g, "") !== norm(h1).replace(/\s/g, "")) problems.push(`h1 "${gotH1}" (want "${h1}")`);

    if (!DYNAMIC.has(name)) {
      const body = text.toLowerCase();
      const known = KNOWN[name] ?? {};
      const lines = rest.join("\n---\n").split("\n").map((l) => norm(l).toLowerCase()).filter((l) => l.length > 1);
      const missing = [...new Set(lines)].filter((l) => !body.includes(l) && !(l in known));
      if (missing.length) problems.push(`${missing.length}/${lines.length} body lines missing${verbose ? ":\n      " + missing.join("\n      ") : " (--verbose lists them)"}`);
    }

    if (problems.length) failed++;
    console.log(`${problems.length ? "FAIL" : "ok  "} ${path}${problems.length ? "\n    " + problems.join("\n    ") : ""}`);
  }
  console.log(`${files.length - failed}/${files.length} captured pages match against ${BASE}`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
