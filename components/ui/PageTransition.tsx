"use client";

// Paginaovergang — subtiele fade-in bij elke routewijziging
// Gebruikt usePathname als React-key om de animatie opnieuw te triggeren

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
