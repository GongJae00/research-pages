"use client";

import dynamic from "next/dynamic";

import type { Dictionary, Locale } from "@/lib/i18n";

import { AuthProvider, WorkspaceAuthGate } from "./auth-provider";
import { Header } from "./header";
import { PreviewModeBanner } from "./preview-mode-banner";
import { Sidebar } from "./sidebar";

interface WorkspaceLocaleFrameProps {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
}

const RBotDock = dynamic(() => import("./r-bot-dock").then((module) => module.RBotDock), {
  ssr: false,
});

export function WorkspaceLocaleFrame({
  children,
  locale,
  dict,
}: WorkspaceLocaleFrameProps) {
  return (
    <AuthProvider>
      <WorkspaceAuthGate locale={locale}>
        <div className="app-layout">
          <Sidebar locale={locale} dict={dict} />
          <div className="app-main">
            <Header locale={locale} dict={dict} />
            <PreviewModeBanner locale={locale} />
            <main className="app-content">{children}</main>
          </div>
        </div>
        <RBotDock locale={locale} />
      </WorkspaceAuthGate>
    </AuthProvider>
  );
}
