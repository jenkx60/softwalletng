import { Logo } from "@/components/SiteHeader";
import { SignInForm } from "@/components/SignInForm";

export default function SignInPage() {
  return (
    <div className="grid min-h-full flex-1 md:grid-cols-2">
      <aside className="flex flex-col justify-between bg-ink px-[22px] py-[30px] text-white md:px-12 md:py-[60px]">
        <Logo inverted />
        <blockquote className="font-heading text-[17px] leading-[1.4] font-medium md:text-[22px]">
          “Every device we sell is verified before it&apos;s listed — condition,
          battery health, IMEI.”
        </blockquote>
        <div className="rounded-lg border-l-[3px] border-blue bg-white/6 p-4 text-[13px]">Softwallet staff workspace</div>
      </aside>
      <SignInForm />
    </div>
  );
}
