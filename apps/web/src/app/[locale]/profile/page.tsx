import { ProfileWorkspace } from "@/components/profile-workspace";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isLocale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = isLocale(locale) ? locale : "ko";

  return (
    <ProfileWorkspace
      locale={resolvedLocale}
      initialProfile={dashboardSnapshot.profile}
      initialAffiliations={dashboardSnapshot.affiliations}
      initialDocuments={dashboardSnapshot.documents}
    />
  );
}
