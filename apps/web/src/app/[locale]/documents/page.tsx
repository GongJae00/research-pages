import { DocumentWorkspace } from "@/components/document-workspace";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isLocale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DocumentsPage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = isLocale(locale) ? locale : "ko";

  return (
    <DocumentWorkspace
      locale={resolvedLocale}
      initialDocuments={dashboardSnapshot.documents}
    />
  );
}
