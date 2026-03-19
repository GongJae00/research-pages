import { notFound } from "next/navigation";

import { PublicLabPage } from "@/components/public-lab-page";
import { isLocale } from "@/lib/i18n";
import { getPublicLabPageData } from "@/lib/public-lab-server-store";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function LabPublicPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const publicData = await getPublicLabPageData(slug);

  if (!publicData) {
    notFound();
  }

  return <PublicLabPage locale={locale} data={publicData} />;
}
