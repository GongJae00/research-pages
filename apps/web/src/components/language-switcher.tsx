"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/lib/i18n";

interface LanguageSwitcherProps {
  locale: string;
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const nextPath = segments.join("/");
    const query = typeof window === "undefined" ? "" : window.location.search;
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    const target = `${nextPath}${query}${hash}`;

    router.replace(target);
  };

  return (
    <div className="lang-switcher" role="group" aria-label="Language switcher">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`lang-btn${l === locale ? " lang-btn-active" : ""}`}
          aria-pressed={l === locale}
        >
          {l === "ko" ? "KO" : "EN"}
        </button>
      ))}
    </div>
  );
}
