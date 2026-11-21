import { localized } from "@/i18n/metadata";
import { CalculatorShell } from "@/components/store/calculator/CalculatorShell";
import { VialDurationTool } from "@/components/store/calculator/Tools";

const TITLE = "Vial Duration Calculator";
const INTRO = "Estimate how long a peptide vial lasts at a selected research dose and weekly frequency.";

export const generateMetadata = localized({
  title: TITLE,
  description: INTRO,
  alternates: { canonical: "/vial-duration-calculator/" },
});

export default function Page() {
  return (
    <CalculatorShell
      title={TITLE}
      intro={INTRO}
    >
      <VialDurationTool />
    </CalculatorShell>
  );
}
