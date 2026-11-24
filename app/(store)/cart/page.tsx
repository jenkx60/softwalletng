import { CustomerBasket } from "@/components/store/CustomerBasket";
import { SiteHeader } from "@/components/layout/SiteHeader";
export default function CartPage(){return <><SiteHeader /><main className="page-container flex-1 py-10"><h1 className="mb-7 text-3xl font-semibold">Your basket</h1><CustomerBasket /></main></>;}
