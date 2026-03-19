import { notFound } from "next/navigation";

import { PublicResearcherPage } from "@/components/public-researcher-page";
import { isLocale } from "@/lib/i18n";
import { getPublicResearcherPageData } from "@/lib/public-profile-server-store";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function ResearcherPublicPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const publicData = await getPublicResearcherPageData(slug);

  if (!publicData) {
    notFound();
  }

  return <PublicResearcherPage locale={locale} data={publicData} />;
}
