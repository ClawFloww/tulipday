// Kaarticonen voor MapLibre-symboollagen: categoriemarkers (lucide-icoon in een
// gekleurde cirkel), richtingspijl en start/finish. MapLibre leest geen React of
// CSS, dus elk icoon wordt één keer naar een SVG-afbeelding gerenderd.

import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Bike, Camera, Flag, Flower2, SquareParking, Ticket, Utensils, type LucideIcon } from "lucide-react";
import type maplibregl from "maplibre-gl";
import type { Category } from "@/lib/types";

// MapLibre leest geen CSS-variabelen; merkrood volgt --color-primary
export const MAP_PRIMARY = "#E8102A";

/** Categoriekleuren op de kaart, afgeleid van de design-tokens. */
export const CATEGORY_COLOR: Record<Category, string> = {
  flower_field: MAP_PRIMARY,
  photo_spot:   "#2563EB",
  attraction:   "#D4820A",
  food:         "#2D7D46",
  parking:      "#5C5C58",
  bike_rental:  "#7C3AED",
};

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  flower_field: Flower2,
  photo_spot:   Camera,
  attraction:   Ticket,
  food:         Utensils,
  parking:      SquareParking,
  bike_rental:  Bike,
};

export const categoryIconId = (category: Category) => `pin-${category}`;
export const ICON_ARROW  = "route-arrow";
export const ICON_START  = "route-start";
export const ICON_FINISH = "route-finish";

const PIXEL_RATIO = 2;

/** Rendert een lucide-icoon naar losse SVG-markup. */
function lucideMarkup(Icon: LucideIcon, size: number): string {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(createElement(Icon, { size, color: "#FFFFFF", strokeWidth: 2.4 })));
  const markup = host.innerHTML;
  root.unmount();
  return markup;
}

/** Cirkel met witte rand en een gecentreerd wit icoon (in CSS-pixels). */
function badgeSvg(color: string, diameter: number, inner: string, innerSize: number): string {
  const r = diameter / 2;
  const offset = (diameter - innerSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}">
    <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${color}" stroke="#FFFFFF" stroke-width="2.5"/>
    <g transform="translate(${offset} ${offset})">${inner}</g>
  </svg>`;
}

const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
  <path d="M3.5 2 L8.5 6 L3.5 10" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function startSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11.5" fill="#2D7D46" stroke="#FFFFFF" stroke-width="3"/>
    <circle cx="13" cy="13" r="4" fill="#FFFFFF"/>
  </svg>`;
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Op 2x renderen voor scherpe iconen op retina-schermen
    const scaled = svg.replace(
      /^<svg([^>]*) width="(\d+)" height="(\d+)"/,
      (_, rest: string, w: string, h: string) => `<svg${rest} width="${+w * PIXEL_RATIO}" height="${+h * PIXEL_RATIO}"`,
    );
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scaled)}`;
  });
}

let iconsPromise: Promise<Map<string, HTMLImageElement>> | null = null;

function loadIcons(): Promise<Map<string, HTMLImageElement>> {
  iconsPromise ??= (async () => {
    const entries: [string, string][] = [
      ...(Object.keys(CATEGORY_ICON) as Category[]).map((c): [string, string] => [
        categoryIconId(c),
        badgeSvg(CATEGORY_COLOR[c], 30, lucideMarkup(CATEGORY_ICON[c], 15), 15),
      ]),
      [ICON_ARROW, ARROW_SVG],
      [ICON_START, startSvg()],
      [ICON_FINISH, badgeSvg("#1A1A18", 28, lucideMarkup(Flag, 13), 13)],
    ];
    const images = await Promise.all(entries.map(([, svg]) => svgToImage(svg)));
    return new Map(entries.map(([id], i) => [id, images[i]]));
  })();
  return iconsPromise;
}

/**
 * Voegt alle kaarticonen toe aan de kaart (en opnieuw als MapLibre er een mist).
 * Lagen hoeven hier niet op te wachten: symbolen verschijnen zodra de iconen er zijn.
 */
export async function addMapIcons(map: maplibregl.Map): Promise<void> {
  const icons = await loadIcons();
  const add = (id: string) => {
    const img = icons.get(id);
    if (img && !map.hasImage(id)) map.addImage(id, img, { pixelRatio: PIXEL_RATIO });
  };
  icons.forEach((_, id) => add(id));
  map.on("styleimagemissing", (e: { id: string }) => add(e.id));
}
