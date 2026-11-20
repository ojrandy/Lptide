import type { Metadata } from "next";
import { CalculatorShell } from "@/components/store/calculator/CalculatorShell";
import { CostPerDoseTool } from "@/components/store/calculator/Tools";

const TITLE = "Cost per Dose Calculator";
const INTRO = "Estimate total doses per vial, doses per kit, and cost per desired research dose.";

export const metadata: Metadata = {
  title: TITLE,
  description: INTRO,
  alternates: { canonical: "/cost-per-dose-calculator/" },
};

export default function Page() {
  return (
    <CalculatorShell
      title={TITLE}
      intro={INTRO}
    >
      <CostPerDoseTool />
    </CalculatorShell>
  );
}
