function isKoreanLocale(locale: string) {
  return locale === "ko";
}

function getSeoulDateParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const partMap = new Map<string, string>();
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      partMap.set(part.type, part.value);
    }
  }

  const year = partMap.get("year");
  const month = partMap.get("month");
  const day = partMap.get("day");
  const hour = partMap.get("hour");
  const minute = partMap.get("minute");

  if (!year || !month || !day || !hour || !minute) {
    return null;
  }

  return { year, month, day, hour, minute };
}

export function formatAgentOpsTimestamp(locale: string, value: string | Date) {
  const parts = getSeoulDateParts(value);

  if (!parts) {
    return typeof value === "string" ? value : "";
  }

  if (isKoreanLocale(locale)) {
    return `${parts.year}. ${String(Number(parts.month))}. ${String(Number(parts.day))}. ${parts.hour}:${parts.minute}`;
  }

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
