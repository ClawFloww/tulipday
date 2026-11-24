"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Crown, LogOut, Mail, Trash2, UserRound } from "lucide-react";
import {
  appleSignInAvailable,
  deleteAccount,
  finishPendingSignIn,
  getAccount,
  sendEmailCode,
  signInWithApple,
  signOut,
  verifyEmailCode,
  type AccountInfo,
} from "@/lib/account";
import { warning } from "@/lib/haptics";
import { useT } from "@/lib/i18n-context";
import { isPremium, refreshPremium } from "@/lib/premium";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";

type Step = "email" | "code";

export default function AccountPage() {
  const router = useRouter();
  const { t } = useT();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);

  const load = useCallback(async () => {
    await finishPendingSignIn();
    setAccount(await getAccount());
    setPremium(isPremium());
    setLoading(false);
    refreshPremium().then(setPremium);
  }, []);

  useEffect(() => { load(); }, [load]);

  const signedIn = !!account && !account.isAnonymous;

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">
      <header className="px-5 pt-safe bg-surface-2 border-b border-line">
        <div className="flex items-center gap-3 pt-6 pb-5">
          <IconButton variant="ghost" aria-label={t("account.back")} onClick={() => router.back()} className="-ml-2.5">
            <ArrowLeft size={20} />
          </IconButton>
          <div>
            <h1 className="text-title text-ink">{t("account.title")}</h1>
            <p className="text-caption text-ink-3">{t("account.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : signedIn && account ? (
          <SignedIn account={account} premium={premium} onChange={load} />
        ) : (
          <SignIn onSignedIn={load} />
        )}
      </div>
    </div>
  );
}

// ── Ingelogd ───────────────────────────────────────────────────────────────

function SignedIn({ account, premium, onChange }: { account: AccountInfo; premium: boolean; onChange: () => void }) {
  const router = useRouter();
  const { t, locale } = useT();
  const [busy, setBusy] = useState<"signout" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setBusy("signout");
    await signOut();
    setBusy(null);
    toast.info(t("account.signed_out_toast"));
    onChange();
  }

  async function handleDelete() {
    setBusy("delete");
    setError(null);
    const ok = await deleteAccount();
    setBusy(null);
    if (!ok) { warning(); setError(t("account.delete_failed")); return; }
    setConfirmDelete(false);
    toast.success(t("account.deleted_toast"));
    onChange();
  }

  return (
    <>
      <Card className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-subtle text-primary flex items-center justify-center flex-shrink-0">
          <UserRound size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold truncate text-ink">{account.email ?? t("account.apple_hidden_email")}</p>
          <p className="text-caption text-ink-3">
            {account.provider === "apple" ? t("account.signed_in_apple") : t("account.signed_in_email")}
          </p>
        </div>
      </Card>

      <Card className="flex items-center gap-3">
        <Crown size={18} className={premium ? "text-primary" : "text-ink-3"} />
        <p className="flex-1 text-[15px] font-bold text-ink">
          {premium ? t("account.premium_active") : t("account.premium_inactive")}
        </p>
        {premium
          ? <Badge tone="success" icon={<Check size={12} aria-hidden />}>{t("account.linked")}</Badge>
          : <Button size="sm" variant="secondary" onClick={() => router.push(`/${locale}/premium`)}>{t("account.get_premium")}</Button>}
      </Card>

      <Button variant="secondary" size="lg" fullWidth icon={<LogOut size={18} />}
              loading={busy === "signout"} disabled={busy !== null} onClick={handleSignOut}>
        {t("account.sign_out")}
      </Button>

      {!confirmDelete ? (
        <Button variant="ghost" fullWidth icon={<Trash2 size={16} />} disabled={busy !== null}
                onClick={() => setConfirmDelete(true)} className="!text-danger">
          {t("account.delete")}
        </Button>
      ) : (
        <Card className="space-y-3" aria-label={t("account.delete_title")}>
          <div role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-body" className="space-y-3">
            <p id="delete-title" className="text-headline text-ink">{t("account.delete_title")}</p>
            <p id="delete-body" className="text-body text-ink-2">{t("account.delete_body")}</p>
            {error && <p role="alert" className="text-label text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={busy !== null} onClick={() => setConfirmDelete(false)}>
                {t("account.delete_cancel")}
              </Button>
              <Button variant="danger" className="flex-1" loading={busy === "delete"} disabled={busy !== null} onClick={handleDelete}>
                {t("account.delete_confirm")}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

// ── Inloggen ───────────────────────────────────────────────────────────────

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const { t, locale } = useT();
  const [step,  setStep]  = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code,  setCode]  = useState("");
  const [busy,  setBusy]  = useState<"apple" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fail(message: string) {
    warning();
    setError(message);
  }

  async function handleApple() {
    setBusy("apple");
    setError(null);
    const ok = await signInWithApple(locale);
    setBusy(null);
    if (!ok) { fail(t("account.apple_failed")); return; }
    toast.success(t("account.signed_in_toast"));
    onSignedIn(); // op het web is de browser dan al doorgestuurd
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const ok = await sendEmailCode(email.trim());
    setBusy(null);
    if (!ok) { fail(t("account.send_failed")); return; }
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const ok = await verifyEmailCode(email.trim(), code.trim());
    setBusy(null);
    if (!ok) { fail(t("account.invalid_code")); return; }
    toast.success(t("account.signed_in_toast"));
    onSignedIn();
  }

  const inputClass = "w-full min-h-[52px] px-4 rounded-xl text-[15px] font-semibold text-ink bg-surface-3 border-2 border-line placeholder:text-ink-3 focus:border-primary focus:outline-none transition-colors duration-fast";

  return (
    <>
      <p className="text-body px-1 text-ink-2">{t("account.intro")}</p>

      {appleSignInAvailable() && (
        <>
          {/* Apple-richtlijn: zwarte knop met Apple-logo (wit in dark mode) */}
          <button onClick={handleApple} disabled={busy !== null}
            className="w-full min-h-[54px] rounded-2xl bg-black text-white text-headline flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform duration-fast disabled:opacity-60 dark:bg-white dark:text-black
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
            <AppleLogo />
            {t("account.apple_button")}
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-line" />
            <span className="text-caption font-bold uppercase tracking-widest text-ink-3">{t("account.or")}</span>
            <div className="flex-1 h-px bg-line" />
          </div>
        </>
      )}

      {step === "email" ? (
        <form onSubmit={handleSendCode} className="space-y-2">
          <label htmlFor="account-email" className="block text-label px-1 text-ink-2">{t("account.email_label")}</label>
          <input id="account-email" type="email" required autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t("account.email_placeholder")} className={inputClass} />
          <Button type="submit" size="lg" fullWidth icon={<Mail size={18} />}
                  loading={busy === "email"} disabled={busy !== null || !email}>
            {t("account.send_code")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-2">
          <p className="text-body px-1 text-ink-2">{t("account.code_sent", { email })}</p>
          <label htmlFor="account-code" className="sr-only">{t("account.code_label")}</label>
          <input id="account-code" type="text" required autoComplete="one-time-code" inputMode="numeric"
            pattern="[0-9]{6}" maxLength={6} autoFocus
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`} />
          <Button type="submit" size="lg" fullWidth loading={busy === "email"} disabled={busy !== null || code.length !== 6}>
            {t("account.verify")}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => { setStep("email"); setCode(""); setError(null); }}>
            {t("account.change_email")}
          </Button>
        </form>
      )}

      {error && <p role="alert" className="text-label text-danger px-1">{error}</p>}
    </>
  );
}

/** Apple-logo zoals vereist door de Sign in with Apple-richtlijnen (geen lucide-variant beschikbaar). */
function AppleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
      <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 201-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-127C44 790 0 669 0 554c0-184 120-282 238-282 63 0 115 41 155 41 38 0 97-44 168-44 27 0 124 2 187 72zM555 169c30-35 51-84 51-133 0-7-1-14-2-19-48 2-105 32-140 72-27 31-53 80-53 130 0 8 1 15 2 18 3 1 8 1 13 1 43 0 97-29 129-69z" />
    </svg>
  );
}
