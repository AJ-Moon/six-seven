import { Clock } from "lucide-react";
import type { getOrderingStatus } from "@/lib/order-hours";

export function OrderingAvailability({ status }: { status: ReturnType<typeof getOrderingStatus> }) {
  if (status.open) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">{status.message}</p>
        {status.note && <p className="mt-0.5 text-xs">{status.note}</p>}
      </div>
    </div>
  );
}
