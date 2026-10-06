"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  useEffect(() => {
    localStorage.setItem("tulipday_premium", "true");
    const t = setTimeout(() => router.replace(`/${locale}/home`), 3000);
    return () => clearTimeout(t);
  }, [router, locale]);

  return (
    <div className="min-h-screen bg-warm flex flex-col items-center justify-center px-6 text-center">
      <CheckCircle size={64} className="text-green-500 mb-4" />
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Welkom bij Premium! 🌷</h1>
      <p className="text-gray-500 text-sm mb-6">Je hebt nu toegang tot alle locaties, routes en bloei-alerts.</p>
      <button
        onClick={() => router.replace(`/${locale}/home`)}
        className="px-8 py-3 rounded-xl bg-tulip-500 text-white font-bold hover:bg-tulip-600 active:scale-95 transition-all"
      >
        Ga naar de app
      </button>
    </div>
  );
}

export default function PremiumSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
