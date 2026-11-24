import type { CSSProperties } from "react";

// Tag pill colours, sampled from the live product/catalog pages (inline styles there, 2026-11-20).
// Unknown tags use the neutral "Other Peptides" style. COA and Lyophilized Balls text darkened (2026-11-21)
// to reach WCAG 4.5:1 for Lighthouse accessibility; live used rgb(180,115,115) and rgb(255,140,0).

type Tone = [bg: string, fg: string, border: string, shadow: string];

const TONES: Record<string, Tone> = {
  "Best Sellers": ["rgb(255,247,237)", "rgb(154,75,19)", "rgb(254,215,170)", "rgba(154,75,19,.12)"],
  Accessories: ["rgb(255,247,237)", "rgb(154,75,19)", "rgb(254,215,170)", "rgba(154,75,19,.12)"],
  "Weight Loss": ["rgb(238,247,255)", "rgb(31,95,143)", "rgb(191,220,246)", "rgba(31,95,143,.12)"],
  Metabolic: ["rgb(245,243,255)", "rgb(91,58,150)", "rgb(221,214,254)", "rgba(91,58,150,.12)"],
  "Anti-Aging": ["rgb(245,243,255)", "rgb(91,58,150)", "rgb(221,214,254)", "rgba(91,58,150,.12)"],
  Longevity: ["rgb(238,242,255)", "rgb(57,66,132)", "rgb(199,210,254)", "rgba(57,66,132,.12)"],
  Repair: ["rgb(240,253,250)", "rgb(15,118,110)", "rgb(153,246,228)", "rgba(15,118,110,.12)"],
  Healing: ["rgb(236,253,243)", "rgb(22,101,52)", "rgb(187,247,208)", "rgba(22,101,52,.12)"],
  Performance: ["rgb(239,246,255)", "rgb(29,78,216)", "rgb(191,219,254)", "rgba(29,78,216,.12)"],
  Growth: ["rgb(254,252,232)", "rgb(133,77,14)", "rgb(253,230,138)", "rgba(133,77,14,.12)"],
  COA: ["rgb(180,252,196)", "rgb(143,91,91)", "rgba(53,222,90,.34)", "rgba(30,184,63,.14)"],
  "Lyophilized Balls": ["rgb(234,220,220)", "rgb(147,80,0)", "rgb(246,239,239)", "rgba(146,69,69,.14)"],
  "Other Peptides": ["rgb(248,250,252)", "rgb(71,85,105)", "rgb(219,228,239)", "rgba(71,85,105,.1)"],
};

export function tagStyle(tag: string): CSSProperties {
  const [bg, fg, border, shadow] = TONES[tag] ?? TONES["Other Peptides"];
  return { backgroundColor: bg, color: fg, borderColor: border, boxShadow: `${shadow} 0px 6px 16px` };
}
