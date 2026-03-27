"use client";

import { Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";

import { RBotPanel } from "./r-bot-panel";
import styles from "./r-bot-dock.module.css";

interface RBotDockProps {
  locale: Locale;
}

const copy = {
  ko: {
    label: "R-Bot",
    open: "R-Bot 열기",
    close: "R-Bot 닫기",
  },
  en: {
    label: "R-Bot",
    open: "Open R-Bot",
    close: "Close R-Bot",
  },
} as const;

export function RBotDock({ locale }: RBotDockProps) {
  const text = copy[locale];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ""}`}
        onClick={() => setIsOpen(false)}
        aria-label={text.close}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
      />
      <div className={`${styles.shell} ${isOpen ? styles.shellOpen : ""}`}>
        <div className={styles.drawer}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            aria-controls="r-bot-dock-panel"
            aria-label={isOpen ? text.close : text.open}
          >
            <span className={styles.toggleTop}>
              <Bot size={18} />
              <span className={styles.toggleLabel}>{text.label}</span>
            </span>
            <span className={styles.toggleBottom}>
              {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </span>
          </button>

          <div
            id="r-bot-dock-panel"
            className={styles.panel}
            aria-hidden={!isOpen}
          >
            <RBotPanel locale={locale} />
          </div>
        </div>
      </div>
    </>
  );
}
