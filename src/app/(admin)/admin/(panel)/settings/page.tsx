import { asc, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import {
  AnnouncementForm,
  CheckoutRulesForm,
  ContactsForm,
  HotProductsForm,
  PasswordForm,
  PaymentForm,
  WarehouseForm,
} from "@/components/admin/SettingsForms";
import { Card, PageHeader } from "@/components/admin/ui";
import { db } from "@/db";
import { products, warehouses } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [settings, whs] = await Promise.all([getSettings(), db.select().from(warehouses).orderBy(asc(warehouses.sort))]);
  const hot = settings.hotProducts.length
    ? await db.select({ id: products.id, sku: products.sku }).from(products).where(inArray(products.id, settings.hotProducts))
    : [];
  const skuById = new Map(hot.map((h) => [h.id, h.sku]));

  return (
    <>
      <PageHeader title="Settings" description="Changes show in the store immediately." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Announcement bar">
          <AnnouncementForm value={settings.announcement} />
        </Card>
        <Card title="Payment instructions">
          <PaymentForm value={settings.paymentInstructions} />
        </Card>
        <Card title="Checkout rules">
          <CheckoutRulesForm value={settings.checkout} />
        </Card>
        <Card title="Contacts">
          <ContactsForm contact={settings.contact} storeInbox={settings.storeInbox} />
        </Card>
        {whs.map((w) => (
          <Card key={w.code} title={`Warehouse ${w.code}`}>
            <WarehouseForm w={{ code: w.code, name: w.name, tagline: w.tagline, active: w.active, countries: w.countries, rule: w.shippingRule }} />
          </Card>
        ))}
        <Card title="Home: factory hot products">
          <HotProductsForm skus={settings.hotProducts.map((id) => skuById.get(id)).filter((s): s is string => !!s)} />
        </Card>
        <Card title="Your password">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
