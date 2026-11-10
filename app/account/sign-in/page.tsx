import { CustomerAuthForm } from "@/components/CustomerAuthForm";
import { SiteHeader } from "@/components/SiteHeader";
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;return <><SiteHeader /><main className="page-container flex-1 py-12"><CustomerAuthForm next={next} /></main></>;}
