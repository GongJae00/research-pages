import { LabWorkspace } from "@/components/lab-workspace";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isLocale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LabPage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = isLocale(locale) ? locale : "ko";

  return (
    <LabWorkspace
      locale={resolvedLocale}
      initialDocuments={dashboardSnapshot.documents}
      initialTimetableEntries={dashboardSnapshot.timetable.entries}
    />
  );
}
