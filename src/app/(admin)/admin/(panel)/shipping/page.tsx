import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { DeleteRule, RuleForm, ShippingTester, type RuleValue } from "@/components/admin/ShippingForms";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/admin/ui";
import { db } from "@/db";
import { shippingRules, warehouses } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Shipping" };

const MODE = { flat: "Flat", per_item: "Per item", per_weight: "Per weight" } as const;

function describe(r: RuleValue) {
  const fee =
    r.mode === "flat"
      ? formatCents(r.firstCents)
      : r.mode === "per_item"
        ? `${formatCents(r.firstCents)} + ${formatCents(r.additionalCents)}/item`
        : `${formatCents(r.firstCents)} + ${formatCents(r.additionalCents)}/${r.stepGrams} g`;
  return r.freeOverCents != null ? `${fee} · free from ${formatCents(r.freeOverCents)}` : fee;
}

/** "any" when the band is open (min at its floor, no max). */
const band = (min: number, max: number | null, floor: number, unit = "") => (min <= floor && max == null ? "any" : `${min}–${max ?? "∞"}${unit}`);

export default async function AdminShippingPage() {
  await requireAdmin();
  const [whs, rules] = await Promise.all([
    db.select().from(warehouses).orderBy(asc(warehouses.sort)),
    db.select().from(shippingRules).orderBy(asc(shippingRules.sort), asc(shippingRules.id)),
  ]);

  return (
    <>
      <PageHeader
        title="Shipping rules"
        description="For each order, the first active rule (lowest order number) that matches the warehouse, country, weight and item count sets the fee. No match = the cart cannot be ordered. Placed orders keep their fee."
      />
      <div className="grid gap-4">
        <Card title="Preview a cart">
          <ShippingTester warehouses={whs.map((w) => ({ code: w.code, name: w.name, countries: w.countries }))} />
        </Card>
        {whs.map((w) => {
          const own = rules.filter((r) => r.warehouseCode === w.code);
          return (
            <Card key={w.code} title={`${w.name} (${w.code})`} actions={!w.active && <Badge tone="amber">inactive</Badge>}>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Rule</Th>
                    <Th>Countries</Th>
                    <Th>Weight</Th>
                    <Th>Items</Th>
                    <Th>Fee</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {own.length === 0 && (
                    <tr>
                      <Td colSpan={7} className="text-red-700">
                        No rules: this warehouse cannot take orders until a rule is added.
                      </Td>
                    </tr>
                  )}
                  {own.map((r) => (
                    <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                      <Td>{r.sort}</Td>
                      <Td>
                        <details>
                          <summary className="cursor-pointer font-medium text-navy">
                            {r.name} {!r.active && <Badge>off</Badge>}
                          </summary>
                          <div className="mt-3 w-[min(860px,80vw)]">
                            <RuleForm rule={r} />
                          </div>
                        </details>
                      </Td>
                      <Td className="max-w-48 truncate font-mono text-xs">{r.countries.length ? r.countries.join(" ") : "all served"}</Td>
                      <Td>{band(r.minGrams, r.maxGrams, 0, " g")}</Td>
                      <Td>{band(r.minItems, r.maxItems, 1)}</Td>
                      <Td>
                        {MODE[r.mode]}: {describe(r)}
                      </Td>
                      <Td>
                        <DeleteRule id={r.id} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-navy">Add a rule</summary>
                <div className="mt-3">
                  <RuleForm
                    rule={{
                      id: null,
                      warehouseCode: w.code,
                      name: "",
                      countries: [],
                      minGrams: 0,
                      maxGrams: null,
                      minItems: 1,
                      maxItems: null,
                      mode: "per_item",
                      firstCents: 0,
                      additionalCents: 0,
                      stepGrams: 500,
                      freeOverCents: null,
                      sort: (own.at(-1)?.sort ?? 0) + 10,
                      active: true,
                    }}
                  />
                </div>
              </details>
              <p className="mt-2 text-xs text-slate-500">Ships to: {w.countries.join(" ")}</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
