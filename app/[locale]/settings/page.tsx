"use client";

import { useState, useEffect } from "react";
import {
  Globe, Info, Mail, ShieldCheck, Flower2,
  ChevronDown, ChevronUp, ExternalLink, Check, Crown, Bell, BellOff, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useT, type Locale } from "@/lib/i18n-context";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "@/lib/pushClient";

function Accordion({ icon, title, accent = "text-gray-600", children }: {
  icon: React.ReactNode; title: string; accent?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors">
        <span className={`flex-shrink-0 ${accent}`}>{icon}</span>
        <span className="flex-1 text-sm font-bold text-[#1A1A1A]">{title}</span>
        <span className="text-gray-400 flex-shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 border-t border-gray-50">
          <div className="pt-4 text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}

function SettingsRow({ icon, label, accent = "text-gray-500", right, onClick }: {
  icon: React.ReactNode; label: string; accent?: string; right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="w-full bg-white rounded-2xl shadow-card flex items-center gap-3 px-4 py-4
                 hover:bg-gray-50 active:scale-[0.99] transition-all disabled:cursor-default disabled:active:scale-100">
      <span className={`flex-shrink-0 ${accent}`}>{icon}</span>
      <span className="flex-1 text-sm font-bold text-[#1A1A1A] text-left">{label}</span>
      {right && <span className="flex-shrink-0">{right}</span>}
    </button>
  );
}

function LanguageSetting() {
  const { t, locale, setLocale } = useT();

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
        <Globe size={18} className="text-tulip-500 flex-shrink-0" />
        <span className="text-sm font-bold text-[#1A1A1A] flex-1">{t("settings.language")}</span>
        <span className="text-[11px] text-gray-400 font-medium">
          {locale === "en" ? "English" : "Nederlands"}
        </span>
      </div>
      <div className="p-2 flex gap-2">
        {(["en", "nl"] as Locale[]).map((l) => {
          const active = locale === l;
          return (
            <button key={l} onClick={() => setLocale(l)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold
                          border-2 transition-all duration-200 active:scale-[0.97]
                          ${active ? "bg-tulip-500 border-tulip-500 text-white shadow-sm shadow-tulip-200" : "bg-white border-gray-200 text-gray-500 hover:border-tulip-300"}`}>
              <span className="text-base">{l === "en" ? "🇬🇧" : "🇳🇱"}</span>
              {l === "en" ? "English" : "Nederlands"}
              {active && <Check size={14} className="text-white/80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest px-1 pt-2 pb-1">{label}</p>;
}

function PushToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [supported, setSupported]   = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      isPushSubscribed().then(setSubscribed);
    }
  }, []);

  if (!supported) return null;

  async function toggle() {
    setLoading(true);
    if (subscribed) {
      await unregisterPushSubscription();
      setSubscribed(false);
    } else {
      const ok = await registerPushSubscription();
      setSubscribed(ok);
    }
    setLoading(false);
  }

  return (
    <button onClick={toggle} disabled={loading}
      className="w-full bg-white rounded-2xl shadow-card flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:scale-[0.99] transition-all">
      <span className={subscribed ? "text-tulip-500" : "text-gray-400"}>
        {subscribed ? <Bell size={18} /> : <BellOff size={18} />}
      </span>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-[#1A1A1A]">Bloei-meldingen</p>
        <p className="text-xs text-gray-400 mt-0.5">{subscribed ? "Actief — tik om uit te zetten" : "Ontvang alerts als tulpen in volle bloei zijn"}</p>
      </div>
      {loading
        ? <Loader2 size={16} className="animate-spin text-gray-400" />
        : <div className={`w-11 h-6 rounded-full transition-colors ${subscribed ? "bg-tulip-500" : "bg-gray-200"} flex items-center px-1`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${subscribed ? "translate-x-5" : "translate-x-0"}`} />
          </div>
      }
    </button>
  );
}

export default function SettingsPage() {
  const { t } = useT();
  const router = useRouter();

  const etiquetteRows = [
    { emoji: "🌷", key: "etiquette_r1" },
    { emoji: "🚷", key: "etiquette_r2" },
    { emoji: "📸", key: "etiquette_r3" },
    { emoji: "🚗", key: "etiquette_r4" },
    { emoji: "🗑️", key: "etiquette_r5" },
    { emoji: "🔇", key: "etiquette_r6" },
    { emoji: "🐾", key: "etiquette_r7" },
    { emoji: "🌧️", key: "etiquette_r8" },
    { emoji: "🤝", key: "etiquette_r9" },
    { emoji: "💛", key: "etiquette_r10" },
  ];

  return (
    <div className="min-h-screen bg-warm pb-28">

      <div className="bg-white px-5 pt-12 pb-5 border-b border-black/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tulip-50 flex items-center justify-center">
            <span className="text-xl">🌷</span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)] leading-tight">{t("settings.title")}</h1>
            <p className="text-xs text-[var(--color-text-3)]">{t("settings.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-2">

        <SectionLabel label="Premium" />
        <SettingsRow
          icon={<Crown size={18} />}
          label="TulipDay Premium"
          accent="text-tulip-500"
          right={<span className="text-xs font-bold text-tulip-500 bg-tulip-50 px-2.5 py-1 rounded-full">Upgrade →</span>}
          onClick={() => router.push("/premium")}
        />

        <SectionLabel label={t("settings.section_preferences")} />
        <PushToggle />
        <LanguageSetting />

        <SectionLabel label={t("settings.section_about")} />

        <Accordion icon={<Info size={18} />} title={t("settings.about_title")} accent="text-tulip-500">
          <p>{t("settings.about_p1")}</p>
          <p>{t("settings.about_p2")}</p>
          <p>{t("settings.about_p3")}</p>
          <div className="pt-1 flex flex-wrap gap-2">
            {(["about_tag_season", "about_tag_version", "about_tag_made"] as const).map((key) => (
              <span key={key} className="text-[11px] bg-tulip-50 text-tulip-600 font-semibold px-2.5 py-1 rounded-full">
                {t(`settings.${key}`)}
              </span>
            ))}
          </div>
        </Accordion>

        <SettingsRow
          icon={<Mail size={18} />}
          label={t("settings.contact")}
          accent="text-forest-500"
          right={
            <span className="flex items-center gap-1 text-xs text-gray-400">
              hello@tulipday.nl <ExternalLink size={11} />
            </span>
          }
          onClick={() => window.open("mailto:hello@tulipday.nl", "_blank")}
        />

        <SectionLabel label={t("settings.section_legal")} />

        <Accordion icon={<ShieldCheck size={18} />} title={t("settings.privacy_title")} accent="text-forest-500">
          <p>{t("settings.privacy_p1")}</p>
          <p>
            <strong className="text-[#1A1A1A]">{t("settings.privacy_what_store")}</strong>{" "}
            {t("settings.privacy_what_store_body")}
          </p>
          <p>
            <strong className="text-[#1A1A1A]">{t("settings.privacy_not_store")}</strong>{" "}
            {t("settings.privacy_not_store_body")}
          </p>
          <p>{t("settings.privacy_p4")}</p>
          <p>{t("settings.privacy_p5")}</p>
        </Accordion>

        <SectionLabel label={t("settings.section_etiquette")} />

        <Accordion icon={<Flower2 size={18} />} title={t("settings.etiquette_title")} accent="text-tulip-500">
          <p className="font-bold text-[#1A1A1A] mb-1">{t("settings.etiquette_intro")}</p>
          {etiquetteRows.map(({ emoji, key }) => (
            <div key={key} className="flex items-start gap-3">
              <span className="text-base leading-none mt-0.5 flex-shrink-0">{emoji}</span>
              <p className="text-sm leading-snug">{t(`settings.${key}`)}</p>
            </div>
          ))}
        </Accordion>

        <div className="pt-4 pb-2 text-center space-y-1">
          <p className="text-[11px] text-gray-300 font-medium">{t("settings.footer_version")}</p>
          <p className="text-[11px] text-gray-300">{t("settings.footer_copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>

    </div>
  );
}
