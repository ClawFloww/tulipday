"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-8"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <span className="text-6xl mb-6">🌧️</span>
      <h2 className="text-xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}>
        Er is iets misgegaan
      </h2>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--color-text-3)" }}>
        Probeer het opnieuw of ga terug naar home.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-tulip-500 text-white rounded-xl text-sm font-bold shadow-md shadow-tulip-200 hover:bg-tulip-600 active:scale-95 transition-all"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
