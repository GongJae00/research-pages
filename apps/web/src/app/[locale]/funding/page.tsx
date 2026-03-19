import { FundingWorkspace } from "@/components/funding-workspace";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isLocale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function FundingPage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = isLocale(locale) ? locale : "ko";

  return (
    <FundingWorkspace
      locale={resolvedLocale}
      funding={dashboardSnapshot.funding}
      affiliations={dashboardSnapshot.affiliations}
      documents={dashboardSnapshot.documents}
    />
  );
}
