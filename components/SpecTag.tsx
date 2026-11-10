import { BatteryHealthBar } from "@/components/BatteryHealthBar";
import { Check } from "lucide-react";

export function SpecTag({
  conditionGrade,
  batteryHealth,
  imeiVerified,
}: {
  conditionGrade?: string | null;
  batteryHealth?: number | null;
  imeiVerified?: boolean;
}) {
  return (
    <div className="mb-[22px] rounded-xl border border-line border-l-4 border-l-blue bg-blue-tint px-4 py-3.5">
      {conditionGrade ? (
        <div className="flex items-center justify-between py-1.5 text-[13px]">
          <span>Condition grade</span>
          <strong>{conditionGrade}</strong>
        </div>
      ) : null}
      {batteryHealth != null ? (
        <div className="flex items-center justify-between border-t border-dashed border-ink/12 py-1.5 text-[13px]">
          <span>Battery health</span>
          <BatteryHealthBar
            percent={batteryHealth}
            className="w-[150px] text-[13px] text-ink"
            trackClassName="bg-ink/12"
          />
        </div>
      ) : null}
      {imeiVerified ? (
        <div className="flex items-center justify-between border-t border-dashed border-ink/12 py-1.5 text-[13px]">
          <span>IMEI on record</span>
          <strong className="inline-flex items-center gap-1">
            <Check className="size-3" />
            Verified
          </strong>
        </div>
      ) : null}
    </div>
  );
}
