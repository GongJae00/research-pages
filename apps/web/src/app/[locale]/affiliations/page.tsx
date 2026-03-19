import { AffiliationWorkspace } from "@/components/affiliation-workspace";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isLocale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AffiliationsPage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = isLocale(locale) ? locale : "ko";

  return (
    <AffiliationWorkspace
      locale={resolvedLocale}
      affiliations={dashboardSnapshot.affiliations}
      documents={dashboardSnapshot.documents}
    />
  );
}
