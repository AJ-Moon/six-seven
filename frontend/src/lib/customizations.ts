import { formatMoney } from "@/lib/money";
import type { SelectedCustomization } from "@/types/menu";

export function formatCustomizationText(
  customizations: SelectedCustomization[] = [],
  currencySymbol?: string,
) {
  return customizations
    .map((item) => {
      const qty = item.quantity && item.quantity > 1 ? `${item.quantity}x ` : "";
      const price = item.priceDelta && item.priceDelta > 0
        ? ` (+${formatMoney(item.priceDelta, currencySymbol)})`
        : "";
      return `${qty}${item.optionName || item.optionId}${price}`;
    })
    .join(", ");
}
