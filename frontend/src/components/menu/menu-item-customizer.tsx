import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import type {
  MenuCustomizationGroup,
  MenuOption,
  PublicMenuItem,
  SelectedCustomization,
} from "@/types/menu";

type SelectionMap = Record<string, Record<string, number>>;

type Props = {
  item: PublicMenuItem | null;
  open: boolean;
  currencySymbol?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: { customizations: SelectedCustomization[]; modifierTotal: number }) => void;
};

const selectionCount = (selected: SelectionMap, groupId: string) =>
  Object.values(selected[groupId] || {}).reduce((sum, qty) => sum + qty, 0);

const optionQty = (selected: SelectionMap, groupId: string, optionId: string) =>
  selected[groupId]?.[optionId] || 0;

function optionPrice(option: MenuOption) {
  return (option.priceDeltaCents || 0) / 100;
}

function optionPriceLabel(option: MenuOption, currencySymbol?: string) {
  const price = optionPrice(option);
  return price > 0 ? `+${formatMoney(price, currencySymbol)}` : "Free";
}

function isVisible(group: MenuCustomizationGroup, selected: SelectionMap) {
  if (!group.dependsOn) return true;
  return optionQty(selected, group.dependsOn.groupId, group.dependsOn.optionId) > 0;
}

export function MenuItemCustomizer({
  item,
  open,
  currencySymbol,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<SelectionMap>({});

  useEffect(() => {
    if (open) setSelected({});
  }, [open, item?.id]);

  const groups = item?.customizations || [];
  const visibleGroups = useMemo(
    () => groups.filter((group) => isVisible(group, selected)),
    [groups, selected],
  );

  const basePrice = item?.salePrice != null && item.salePrice < item.price ? item.salePrice : item?.price || 0;

  const selectedCustomizations = useMemo<SelectedCustomization[]>(() => {
    const rows: SelectedCustomization[] = [];
    for (const group of visibleGroups) {
      for (const opt of group.options) {
        const qty = optionQty(selected, group.id, opt.id);
        if (qty < 1) continue;
        rows.push({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          priceDelta: optionPrice(opt),
          quantity: qty,
        });
      }
    }
    return rows;
  }, [selected, visibleGroups]);

  const modifierTotal = selectedCustomizations.reduce(
    (sum, row) => sum + (row.priceDelta || 0) * (row.quantity || 1),
    0,
  );

  const validationMessage = useMemo(() => {
    for (const group of visibleGroups) {
      const total = selectionCount(selected, group.id);
      const min = group.minSelections ?? (group.required ? 1 : 0);
      const max = group.maxSelections ?? group.options.length;
      if (group.required && total < min) return `${group.name}: choose ${min}`;
      if (total > max) return `${group.name}: choose up to ${max}`;
    }
    return "";
  }, [selected, visibleGroups]);

  const setSingle = (group: MenuCustomizationGroup, option: MenuOption, selectedNow = false) => {
    setSelected((current) => {
      const next = {
        ...current,
        [group.id]: !group.required && selectedNow ? {} : { [option.id]: 1 },
      };
      for (const child of groups) {
        if (
          child.dependsOn?.groupId === group.id &&
          (!next[group.id][option.id] || child.dependsOn.optionId !== option.id)
        ) {
          delete next[child.id];
        }
      }
      return next;
    });
  };

  const toggleOption = (group: MenuCustomizationGroup, option: MenuOption) => {
    setSelected((current) => {
      const groupSelected = { ...(current[group.id] || {}) };
      if (groupSelected[option.id]) {
        delete groupSelected[option.id];
      } else if (selectionCount(current, group.id) < (group.maxSelections ?? group.options.length)) {
        groupSelected[option.id] = 1;
      }
      return { ...current, [group.id]: groupSelected };
    });
  };

  const stepOption = (group: MenuCustomizationGroup, option: MenuOption, delta: number) => {
    setSelected((current) => {
      const groupSelected = { ...(current[group.id] || {}) };
      const currentQty = groupSelected[option.id] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      const currentTotal = selectionCount(current, group.id);
      const nextTotal = currentTotal - currentQty + nextQty;
      const max = group.maxSelections ?? group.options.length;
      if (nextTotal > max) return current;
      if (nextQty === 0) delete groupSelected[option.id];
      else groupSelected[option.id] = nextQty;
      return { ...current, [group.id]: groupSelected };
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription className="line-clamp-2">{item.description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[62vh]">
          <div className="space-y-5 p-5">
            {item.image && (
              <div className="flex gap-3 rounded-lg bg-muted/50 p-3">
                <img src={item.image} alt="" className="h-16 w-16 rounded-md object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Base price</p>
                  <p className="font-serif text-xl font-bold text-primary">
                    {formatMoney(basePrice, currencySymbol)}
                  </p>
                </div>
              </div>
            )}
            {visibleGroups.map((group) => {
              const total = selectionCount(selected, group.id);
              const min = group.minSelections ?? (group.required ? 1 : 0);
              const max = group.maxSelections ?? group.options.length;
              const repeatable = Boolean(group.allowRepeats);
              const singleChoice = max === 1 && !repeatable;
              return (
                <section key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.required ? `Required · choose ${min}${max !== min ? `-${max}` : ""}` : `Optional · choose up to ${max}`}
                      </p>
                    </div>
                    <Badge variant={group.required && total < min ? "outline" : "secondary"}>
                      {total}/{max}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {group.options.map((opt) => {
                      const qty = optionQty(selected, group.id, opt.id);
                      const selectedNow = qty > 0;
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border border-border bg-card p-3",
                            selectedNow && "border-primary bg-primary/5",
                          )}
                        >
                          {opt.image && (
                            <img src={opt.image} alt="" className="h-14 w-14 rounded-md object-cover" />
                          )}
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              if (repeatable) stepOption(group, opt, selectedNow ? 0 : 1);
                              else if (singleChoice) setSingle(group, opt, selectedNow);
                              else toggleOption(group, opt);
                            }}
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                              {opt.name}
                              {selectedNow && !repeatable && <Check className="h-4 w-4 text-primary" />}
                            </span>
                            {opt.description && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                            )}
                          </button>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {optionPriceLabel(opt, currencySymbol)}
                          </span>
                          {repeatable ? (
                            <div className="flex items-center rounded-full border border-border">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => stepOption(group, opt, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => stepOption(group, opt, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant={selectedNow ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => (singleChoice ? setSingle(group, opt, selectedNow) : toggleOption(group, opt))}
                            >
                              {selectedNow ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t border-border p-4 sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">{validationMessage || "Ready to add"}</p>
            <p className="font-serif text-xl font-bold text-foreground">
              {formatMoney(basePrice + modifierTotal, currencySymbol)}
            </p>
          </div>
          <Button
            type="button"
            disabled={Boolean(validationMessage)}
            onClick={() => onConfirm({ customizations: selectedCustomizations, modifierTotal })}
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
