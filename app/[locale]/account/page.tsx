"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, Loader2, LogOut, Mail, Trash2, UserRound } from "lucide-react";
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
import { useT } from "@/lib/i18n-context";
import { isPremium, refreshPremium } from "@/lib/premium";

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
    <div className="min-h-screen bg-surface pb-28">
      <div className="px-5 pt-12 pb-5" style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label={t("account.back")}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-3 active:scale-95 transition-transform"
            style={{ color: "var(--color-text)" }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)] leading-tight">{t("account.title")}</h1>
            <p className="text-xs text-[var(--color-text-3)]">{t("account.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-tulip-500" />
          </div>
        ) : signedIn ? (
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
    onChange();
  }

  async function handleDelete() {
    setBusy("delete");
    setError(null);
    const ok = await deleteAccount();
    setBusy(null);
    if (!ok) { setError(t("account.delete_failed")); return; }
    setConfirmDelete(false);
    onChange();
  }

  return (
    <>
      <div className="bg-surface-2 rounded-2xl shadow-card px-4 py-4 flex items-center gap-3">
        <UserRound size={18} className="text-tulip-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
            {account.email ?? t("account.apple_hidden_email")}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
            {account.provider === "apple" ? t("account.signed_in_apple") : t("account.signed_in_email")}
          </p>
        </div>
      </div>

      <div className="bg-surface-2 rounded-2xl shadow-card px-4 py-4 flex items-center gap-3">
        <Crown size={18} className={premium ? "text-tulip-500" : "text-[var(--color-text-3)]"} />
        <p className="flex-1 text-sm font-bold" style={{ color: "var(--color-text)" }}>
          {premium ? t("account.premium_active") : t("account.premium_inactive")}
        </p>
        {!premium && (
          <button onClick={() => router.push(`/${locale}/premium`)}
            className="text-xs font-bold text-tulip-500 bg-tulip-50 px-2.5 py-1 rounded-full">
            {t("account.get_premium")}
          </button>
        )}
      </div>

      <button onClick={handleSignOut} disabled={busy !== null}
        className="w-full bg-surface-2 rounded-2xl shadow-card flex items-center gap-3 px-4 py-4 hover:bg-surface-3 active:scale-[0.99] transition-all disabled:opacity-60">
        {busy === "signout"
          ? <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-3)" }} />
          : <LogOut size={18} style={{ color: "var(--color-text-3)" }} />}
        <span className="flex-1 text-sm font-bold text-left" style={{ color: "var(--color-text)" }}>{t("account.sign_out")}</span>
      </button>

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} disabled={busy !== null}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-tulip-500 active:scale-[0.99] transition-all">
          <Trash2 size={16} />
          {t("account.delete")}
        </button>
      ) : (
        <div className="bg-surface-2 rounded-2xl shadow-card px-4 py-4 space-y-3" role="alertdialog" aria-labelledby="delete-title">
          <p id="delete-title" className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{t("account.delete_title")}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-2)" }}>{t("account.delete_body")}</p>
          {error && <p role="alert" className="text-xs font-semibold text-tulip-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} disabled={busy !== null}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-surface-3" style={{ color: "var(--color-text-2)" }}>
              {t("account.delete_cancel")}
            </button>
            <button onClick={handleDelete} disabled={busy !== null}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-tulip-500 text-white flex items-center justify-center gap-2 disabled:opacity-60">
              {busy === "delete" && <Loader2 size={14} className="animate-spin" />}
              {t("account.delete_confirm")}
            </button>
          </div>
        </div>
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

  async function handleApple() {
    setBusy("apple");
    setError(null);
    const ok = await signInWithApple(locale);
    setBusy(null);
    if (!ok) { setError(t("account.apple_failed")); return; }
    onSignedIn(); // op het web is de browser dan al doorgestuurd
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const ok = await sendEmailCode(email.trim());
    setBusy(null);
    if (!ok) { setError(t("account.send_failed")); return; }
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const ok = await verifyEmailCode(email.trim(), code.trim());
    setBusy(null);
    if (!ok) { setError(t("account.invalid_code")); return; }
    onSignedIn();
  }

  const inputClass = "w-full px-4 py-3.5 rounded-xl text-sm font-semibold bg-surface-3 border-2 border-[var(--color-border)] focus:border-tulip-400 outline-none transition-colors";

  return (
    <>
      <p className="text-sm leading-relaxed px-1" style={{ color: "var(--color-text-2)" }}>{t("account.intro")}</p>

      {appleSignInAvailable() && (
        <>
          <button onClick={handleApple} disabled={busy !== null}
            className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60 dark:bg-white dark:text-black">
            {busy === "apple" ? <Loader2 size={16} className="animate-spin" /> : <AppleLogo />}
            {t("account.apple_button")}
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-3)" }}>{t("account.or")}</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          </div>
        </>
      )}

      {step === "email" ? (
        <form onSubmit={handleSendCode} className="space-y-2">
          <label htmlFor="account-email" className="text-xs font-bold px-1" style={{ color: "var(--color-text-2)" }}>
            {t("account.email_label")}
          </label>
          <input id="account-email" type="email" required autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t("account.email_placeholder")}
            className={inputClass} style={{ color: "var(--color-text)" }} />
          <button type="submit" disabled={busy !== null || !email}
            className="w-full py-3.5 rounded-xl bg-tulip-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60">
            {busy === "email" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {t("account.send_code")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-2">
          <p className="text-xs px-1" style={{ color: "var(--color-text-2)" }}>{t("account.code_sent", { email })}</p>
          <label htmlFor="account-code" className="sr-only">{t("account.code_label")}</label>
          <input id="account-code" type="text" required autoComplete="one-time-code" inputMode="numeric"
            pattern="[0-9]{6}" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className={`${inputClass} text-center text-xl tracking-[0.5em]`} style={{ color: "var(--color-text)" }} />
          <button type="submit" disabled={busy !== null || code.length !== 6}
            className="w-full py-3.5 rounded-xl bg-tulip-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60">
            {busy === "email" && <Loader2 size={16} className="animate-spin" />}
            {t("account.verify")}
          </button>
          <button type="button" onClick={() => { setStep("email"); setCode(""); setError(null); }}
            className="w-full py-2 text-xs font-bold" style={{ color: "var(--color-text-3)" }}>
            {t("account.change_email")}
          </button>
        </form>
      )}

      {error && <p role="alert" className="text-xs font-semibold text-tulip-500 px-1">{error}</p>}
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
