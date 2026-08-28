export const ORDER_HOURS_TEXT =
  "Mon-Thu: 12 PM-1:30 AM; Fri: 2 PM-2:30 AM; Sat: 12 PM-2:30 AM; Sun: 5 PM-1:30 AM";

/**
 * The same hours in the format schema.org actually parses. ORDER_HOURS_TEXT is
 * written for humans and is not valid structured data — feeding it to
 * `openingHours` made Google discard the field, which is why the hours never
 * showed in search results.
 */
export const ORDER_HOURS_SCHEMA = [
  "Mo-Th 12:00-01:30",
  "Fr 14:00-02:30",
  "Sa 12:00-02:30",
  "Su 17:00-01:30",
];

const KARACHI_TIMEZONE = "Asia/Karachi";
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function karachiParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KARACHI_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    day: WEEKDAY_INDEX[value("weekday")] ?? 1,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function isOrderingOpen(date = new Date()) {
  const { day, minutes } = karachiParts(date);
  const earlyCutoff = day === 6 || day === 0 ? 150 : 90;
  if (minutes <= earlyCutoff) return true;

  const openingMinute =
    day === 5
      ? 14 * 60
      : day === 0
        ? 17 * 60
        : 12 * 60;

  return minutes >= openingMinute;
}

export function getOrderingStatus(date = new Date()) {
  const open = isOrderingOpen(date);
  return {
    open,
    label: open ? "Open for orders" : "Ordering closed",
    message: open
      ? "Online ordering is available right now."
      : "Online ordering is closed right now. Please order during store hours.",
  };
}
