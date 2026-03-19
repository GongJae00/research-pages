import { TimetableWorkspace } from "@/components/timetable-workspace";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isLocale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TimetablePage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = isLocale(locale) ? locale : "ko";

  return (
    <TimetableWorkspace
      locale={resolvedLocale}
      initialEntries={dashboardSnapshot.timetable.entries}
      initialTerm={{
        year: dashboardSnapshot.timetable.term.year,
        season: dashboardSnapshot.timetable.term.season,
      }}
      initialDocuments={dashboardSnapshot.documents}
    />
  );
}
