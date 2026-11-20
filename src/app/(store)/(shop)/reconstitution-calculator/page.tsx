import type { Metadata } from "next";
import { CalculatorShell } from "@/components/store/calculator/CalculatorShell";
import { ReconstitutionTool } from "@/components/store/calculator/Tools";

const TITLE = "Reconstitution Calculator";
const INTRO = "Calculate peptide total mcg, concentration, syringe units to draw, volume to draw, and total doses.";

export const metadata: Metadata = {
  title: TITLE,
  description: INTRO,
  alternates: { canonical: "/reconstitution-calculator/" },
};

export default function Page() {
  return (
    <CalculatorShell
      title={TITLE}
      intro={INTRO}
      after={
        <section className="content-band instructions-band">
          <div>
            <p className="tool-kicker">Using the calculator</p>
            <h2>Enter vial mass, reconstitution water, dose, and syringe type.</h2>
          </div>
          <ol>
            <li>Confirm the peptide amount shown on the vial label in mg.</li>
            <li>Enter the exact water volume added in mL.</li>
            <li>Select U-100, U-50, U-30, or enter a custom units-per-mL syringe scale.</li>
            <li>Review units to draw and volume to draw before preparing any research material.</li>
          </ol>
        </section>
      }
    >
      <ReconstitutionTool />
    </CalculatorShell>
  );
}
