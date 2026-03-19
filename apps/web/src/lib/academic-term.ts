import type { Locale } from "./i18n";

export type AcademicSeason = "spring" | "summer" | "fall" | "winter";

export interface AcademicTermOption {
  year: number;
  season: AcademicSeason;
}

const seasonOrder: AcademicSeason[] = ["spring", "summer", "fall", "winter"];

function getSeoulDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

export function getAcademicTermFromDate(date = new Date()): AcademicTermOption {
  const { year, month } = getSeoulDateParts(date);

  if (month >= 3 && month <= 6) {
    return { year, season: "spring" };
  }

  if (month >= 7 && month <= 8) {
    return { year, season: "summer" };
  }

  if (month >= 9 && month <= 12) {
    return { year, season: "fall" };
  }

  return { year, season: "winter" };
}

export function shiftAcademicTerm(term: AcademicTermOption, offset: number): AcademicTermOption {
  const baseIndex = seasonOrder.indexOf(term.season);
  const absoluteIndex = term.year * seasonOrder.length + baseIndex + offset;
  const nextYear = Math.floor(absoluteIndex / seasonOrder.length);
  const nextSeason =
    seasonOrder[((absoluteIndex % seasonOrder.length) + seasonOrder.length) % seasonOrder.length];

  return {
    year: nextYear,
    season: nextSeason,
  };
}

export function buildAcademicTermWindow(
  centerTerm: AcademicTermOption,
  before = 2,
  after = 3,
): AcademicTermOption[] {
  const items: AcademicTermOption[] = [];

  for (let offset = -before; offset <= after; offset += 1) {
    items.push(shiftAcademicTerm(centerTerm, offset));
  }

  return items;
}

export function buildAcademicTermsFromYear(startYear: number, endYear: number): AcademicTermOption[] {
  const items: AcademicTermOption[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    for (const season of seasonOrder) {
      items.push({ year, season });
    }
  }

  return items;
}

export function getAcademicTermKey(term: AcademicTermOption): string {
  return `${term.year}-${term.season}`;
}

export function parseAcademicTermKey(value: string): AcademicTermOption {
  const [yearText, seasonText] = value.split("-");
  const season = seasonOrder.includes(seasonText as AcademicSeason)
    ? (seasonText as AcademicSeason)
    : "spring";

  return {
    year: Number(yearText),
    season,
  };
}

export function getAcademicTermLabel(term: AcademicTermOption, locale: Locale): string {
  if (locale === "ko") {
    const seasonLabel = {
      spring: "1학기",
      summer: "여름방학",
      fall: "2학기",
      winter: "겨울방학",
    }[term.season];

    return `${term.year} ${seasonLabel}`;
  }

  const seasonLabel = {
    spring: "Spring Semester",
    summer: "Summer Break",
    fall: "Fall Semester",
    winter: "Winter Break",
  }[term.season];

  return `${term.year} ${seasonLabel}`;
}

export function getAcademicTermRangeLabel(term: AcademicTermOption, locale: Locale): string {
  return {
    spring: locale === "ko" ? "3월 - 6월" : "March - June",
    summer: locale === "ko" ? "7월 - 8월" : "July - August",
    fall: locale === "ko" ? "9월 - 12월" : "September - December",
    winter: locale === "ko" ? "1월 - 2월" : "January - February",
  }[term.season];
}
