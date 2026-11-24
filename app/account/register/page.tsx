import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="page-container flex-1 py-12">
        <CustomerAuthForm register next={next} />
      </main>
    </>
  );
}
