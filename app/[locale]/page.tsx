"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function LocalePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    router.replace(`/${locale}/home`);
  }, [locale, router]);

  return null;
}
