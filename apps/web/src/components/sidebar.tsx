"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Calendar, FileText, FlaskConical, LogOut, Plus, User, Users, Wallet } from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { useAuth } from "./auth-provider";

interface SidebarProps {
  locale: string;
  dict: Dictionary;
}

const personalNavItems = [
  { key: "profile", icon: User, href: "/profile" },
  { key: "affiliations", icon: FlaskConical, href: "/affiliations" },
  { key: "funding", icon: Wallet, href: "/funding" },
  { key: "documents", icon: FileText, href: "/documents" },
  { key: "timetable", icon: Calendar, href: "/timetable" },
] as const;

export function Sidebar({ locale, dict }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentAccount, labs, signOut } = useAuth();
  const activeLabSlug = searchParams.get("lab");
  const copy =
    locale === "ko"
      ? {
          personal: "내 공간",
          labs: "연구실",
          labHub: "연구실 허브",
          openLab: "연구실 열기",
          members: "명",
          emptyLabs: "아직 참여한 연구실이 없습니다",
        }
      : {
          personal: "Personal",
          labs: "Labs",
          labHub: "Lab hub",
          openLab: "Open labs",
          members: "members",
          emptyLabs: "No labs joined yet",
        };

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;
    return pathname.startsWith(full);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <FlaskConical size={24} className="sidebar-logo-icon" />
        <span className="sidebar-logo-text">ResearchPages</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-group">
          <div className="sidebar-group-header">
            <span className="sidebar-group-title">{copy.personal}</span>
          </div>
          {personalNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
              >
                <Icon size={18} />
                <span>{t(dict, `nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </div>

        <div className="sidebar-group sidebar-group-labs">
          <div className="sidebar-group-header">
            <span className="sidebar-group-title">{copy.labs}</span>
            <Link href={`/${locale}/lab`} className="sidebar-group-action" aria-label={copy.openLab}>
              <Plus size={14} />
            </Link>
          </div>

          <Link
            href={`/${locale}/lab`}
            className={`sidebar-link sidebar-link-lab-hub${isActive("/lab") && !activeLabSlug ? " sidebar-link-active" : ""}`}
          >
            <Users size={18} />
            <span>{copy.labHub}</span>
          </Link>

          {labs.length === 0 ? (
            <div className="sidebar-lab-empty">{copy.emptyLabs}</div>
          ) : (
            <div className="sidebar-lab-list">
              {labs.map((lab) => {
                const active = pathname.startsWith(`/${locale}/lab`) && activeLabSlug === lab.slug;

                return (
                  <Link
                    key={lab.id}
                    href={`/${locale}/lab?lab=${lab.slug}`}
                    className={`sidebar-lab-link${active ? " sidebar-lab-link-active" : ""}`}
                  >
                    <div className="sidebar-lab-link-copy">
                      <strong>{lab.name}</strong>
                      <span>
                        {lab.members.length} {copy.members}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile-mini">
          <div className="sidebar-avatar">
            {(currentAccount?.koreanName || currentAccount?.englishName || "R").slice(0, 1)}
          </div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              {currentAccount?.koreanName || currentAccount?.englishName || "ResearchPages"}
            </span>
            <span className="sidebar-profile-role">
              {currentAccount?.primaryEmail || "Researcher"}
            </span>
          </div>
        </div>
        <button type="button" className="sidebar-signout-btn" onClick={signOut}>
          <LogOut size={15} />
          <span>{locale === "ko" ? "로그아웃" : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
