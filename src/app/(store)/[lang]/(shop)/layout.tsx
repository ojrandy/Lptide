import { ContextHeader } from "@/components/store/ContextHeader";

/** Inner storefront pages: context header (announcement + pill header) above the page. */
export default function ShopLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <>
      <ContextHeader />
      {children}
    </>
  );
}
