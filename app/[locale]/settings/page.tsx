"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Globe, Info, Mail, ShieldCheck, Flower2, Monitor, Settings,
  ChevronDown, ChevronRight, Check, Crown, Bell, BellOff, Loader2, UserRound, FileText,
  Ban, Camera, Car, Trash2, VolumeX, Dog, CloudRain, Handshake, ShoppingBag, type LucideIcon,
} from "lucide-react";
import { getAccount } from "@/lib/account";
import { tap } from "@/lib/haptics";
import { useT, type Locale } from "@/lib/i18n-context";
import { isPremium, refreshPremium } from "@/lib/premium";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "@/lib/pushClient";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LANGUAGES: { locale: Locale; label: string }[] = [
  { locale: "nl", label: "Nederlands" },
  { locale: "en", label: "English"    },
  { locale: "de", label: "Deutsch"    },
  { locale: "fr", label: "Français"   },
  { locale: "es", label: "Español"    },
  { locale: "zh", label: "中文"        },
];

const CONTACT_EMAIL = "hello@tulipday.online";

function Accordion({ icon, title, accent = "text-ink-2", children }: {
  icon: React.ReactNode; title: string; accent?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface-2 rounded-2xl shadow-card border border-line overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left hover:bg-surface-3 transition-colors duration-fast
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <span className={`flex-shrink-0 ${accent}`}>{icon}</span>
        <span className="flex-1 text-[15px] font-bold text-ink">{title}</span>
        <ChevronDown size={18} className={`flex-shrink-0 text-ink-3 transition-transform duration-base ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-4 border-t border-line text-body leading-relaxed space-y-3 text-ink-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsRow({ icon, label, description, accent = "text-ink-2", right, onClick }: {
  icon: React.ReactNode; label: string; description?: string; accent?: string; right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="w-full bg-surface-2 rounded-2xl shadow-card border border-line flex items-center gap-3 px-4 min-h-[56px] py-3
                 hover:bg-surface-3 active:scale-[0.99] transition-[transform,background-color] duration-fast
                 disabled:cursor-default disabled:active:scale-100
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className={`flex-shrink-0 ${accent}`}>{icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[15px] font-bold text-ink truncate">{label}</span>
        {description && <span className="block text-caption text-ink-3 mt-0.5">{description}</span>}
      </span>
      {right && <span className="flex-shrink-0">{right}</span>}
      {onClick && !right && <ChevronRight size={18} className="flex-shrink-0 text-ink-3" aria-hidden />}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="text-caption font-extrabold uppercase tracking-widest px-1 pt-4 pb-1 text-ink-3">{label}</p>;
}

function LanguageSetting() {
  const { t, locale, setLocale } = useT();
  const router   = useRouter();
  const pathname = usePathname();

  function choose(l: Locale) {
    if (l === locale) return;
    tap();
    setLocale(l);
    // Ook de taal in de URL bijwerken, anders blijven pagina's met de oude taalcode linken
    router.replace(pathname.replace(/^\/[a-z]{2}(?=\/|$)/, `/${l}`));
  }

  return (
    <div className="bg-surface-2 rounded-2xl shadow-card border border-line overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
        <Globe size={18} className="text-primary flex-shrink-0" />
        <span className="text-[15px] font-bold flex-1 text-ink">{t("settings.language")}</span>
      </div>
      <div role="radiogroup" aria-label={t("settings.language")} className="grid grid-cols-2 gap-2 p-2">
        {LANGUAGES.map(({ locale: l, label }) => {
          const active = locale === l;
          return (
            <button key={l} role="radio" aria-checked={active} onClick={() => choose(l)}
              className={`flex items-center justify-between gap-2 min-h-touch px-3.5 rounded-xl text-label border transition-colors duration-fast
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          ${active ? "bg-primary-subtle border-primary text-primary" : "bg-surface-3 border-transparent text-ink-2"}`}>
              {label}
              {active && <Check size={15} aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PushToggle() {
  const { t, locale } = useT();
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
      const ok = await registerPushSubscription(locale);
      setSubscribed(ok);
    }
    setLoading(false);
  }

  return (
    <button onClick={toggle} disabled={loading} role="switch" aria-checked={subscribed}
      className="w-full bg-surface-2 rounded-2xl shadow-card border border-line flex items-center gap-3 px-4 min-h-[64px] py-3
                 hover:bg-surface-3 active:scale-[0.99] transition-[transform,background-color] duration-fast
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className={subscribed ? "text-primary" : "text-ink-3"}>
        {subscribed ? <Bell size={18} /> : <BellOff size={18} />}
      </span>
      <span className="flex-1 text-left">
        <span className="block text-[15px] font-bold text-ink">{t("settings.push_title")}</span>
        <span className="block text-caption mt-0.5 text-ink-3">{subscribed ? t("settings.push_on") : t("settings.push_off")}</span>
      </span>
      {loading
        ? <Loader2 size={16} className="animate-spin text-ink-3" />
        : <span className={`w-11 h-6 rounded-full transition-colors duration-base flex items-center px-1 ${subscribed ? "bg-primary" : "bg-surface-3"}`}>
            <span className={`w-4 h-4 rounded-full shadow-sm transition-transform duration-base ease-out-soft
                              ${subscribed ? "translate-x-5 bg-white" : "translate-x-0 bg-ink-3"}`} />
          </span>
      }
    </button>
  );
}

function AccountRow() {
  const { t, locale } = useT();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    getAccount().then((account) => {
      setSignedIn(!!account && !account.isAnonymous);
      setEmail(account?.email ?? null);
    });
  }, []);

  return (
    <SettingsRow
      icon={<UserRound size={18} />}
      label={signedIn && email ? email : t("settings.account_label")}
      accent="text-primary"
      right={!signedIn ? <Badge tone="primary">{t("settings.account_signin")}</Badge> : undefined}
      onClick={() => router.push(`/${locale}/account`)}
    />
  );
}

function PremiumRow() {
  const { t, locale } = useT();
  const router = useRouter();
  const [premium, setPremium] = useState(false);

  useEffect(() => { setPremium(isPremium()); refreshPremium().then(setPremium); }, []);

  return (
    <SettingsRow
      icon={<Crown size={18} />}
      label={t("settings.premium_row")}
      accent="text-primary"
      right={premium
        ? <Badge tone="success">{t("settings.premium_active")}</Badge>
        : <Badge tone="primary">{t("settings.premium_view")}</Badge>}
      onClick={() => router.push(`/${locale}/premium`)}
    />
  );
}

export default function SettingsPage() {
  const { t } = useT();
  const router = useRouter();

  const etiquetteRows = [
    { Icon: Flower2,     key: "etiquette_r1" },
    { Icon: Ban,         key: "etiquette_r2" },
    { Icon: Camera,      key: "etiquette_r3" },
    { Icon: Car,         key: "etiquette_r4" },
    { Icon: Trash2,      key: "etiquette_r5" },
    { Icon: VolumeX,     key: "etiquette_r6" },
    { Icon: Dog,         key: "etiquette_r7" },
    { Icon: CloudRain,   key: "etiquette_r8" },
    { Icon: Handshake,   key: "etiquette_r9" },
    { Icon: ShoppingBag, key: "etiquette_r10" },
  ] satisfies { Icon: LucideIcon; key: string }[];

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">

      <header className="px-5 pt-safe bg-surface-2 border-b border-line">
        <div className="flex items-center gap-3 pt-6 pb-5">
          <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center">
            <Settings size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-title text-ink">{t("settings.title")}</h1>
            <p className="text-caption text-ink-3">{t("settings.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-1 pb-6 space-y-2">

        <SectionLabel label={t("settings.account_label")} />
        <AccountRow />

        <SectionLabel label={t("settings.section_premium")} />
        <PremiumRow />

        <SectionLabel label={t("settings.section_appearance")} />
        <div className="bg-surface-2 rounded-2xl shadow-card border border-line px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Monitor size={18} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-[15px] font-bold text-ink">{t("settings.theme_title")}</p>
              <p className="text-caption text-ink-3">{t("settings.theme_desc")}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <SectionLabel label={t("settings.section_preferences")} />
        <PushToggle />
        <LanguageSetting />

        <SectionLabel label={t("settings.section_about")} />

        <Accordion icon={<Info size={18} />} title={t("settings.about_title")} accent="text-primary">
          <p>{t("settings.about_p1")}</p>
          <p>{t("settings.about_p2")}</p>
          <p>{t("settings.about_p3")}</p>
          <div className="pt-1 flex flex-wrap gap-2">
            {(["about_tag_season", "about_tag_version", "about_tag_made"] as const).map((key) => (
              <Badge key={key} tone="primary">{t(`settings.${key}`)}</Badge>
            ))}
          </div>
        </Accordion>

        <SettingsRow
          icon={<Mail size={18} />}
          label={t("settings.contact")}
          description={CONTACT_EMAIL}
          accent="text-success"
          // window.location i.p.v. window.open: opent in de app-WebView de mail-app
          onClick={() => { window.location.href = `mailto:${CONTACT_EMAIL}`; }}
        />

        <SectionLabel label={t("settings.section_legal")} />

        <Accordion icon={<ShieldCheck size={18} />} title={t("settings.privacy_title")} accent="text-success">
          <p>{t("settings.privacy_p1")}</p>
          <p>
            <strong className="text-ink">{t("settings.privacy_what_store")}</strong>{" "}
            {t("settings.privacy_what_store_body")}
          </p>
          <p>
            <strong className="text-ink">{t("settings.privacy_not_store")}</strong>{" "}
            {t("settings.privacy_not_store_body")}
          </p>
          <p>{t("settings.privacy_p4")}</p>
          <p>{t("settings.privacy_p5")}</p>
        </Accordion>

        <SettingsRow
          icon={<FileText size={18} />}
          label={t("settings.privacy_full")}
          accent="text-success"
          onClick={() => router.push("/privacy")}
        />

        <SectionLabel label={t("settings.section_etiquette")} />

        <Accordion icon={<Flower2 size={18} />} title={t("settings.etiquette_title")} accent="text-primary">
          <p className="font-bold text-ink mb-1">{t("settings.etiquette_intro")}</p>
          {etiquetteRows.map(({ Icon, key }) => (
            <div key={key} className="flex items-start gap-3">
              <Icon size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden />
              <p className="leading-snug">{t(`settings.${key}`)}</p>
            </div>
          ))}
        </Accordion>

        <div className="pt-6 pb-2 text-center space-y-1 text-caption text-ink-3">
          <p>{t("settings.footer_version")}</p>
          <p>{t("settings.footer_copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>

    </div>
  );
}
