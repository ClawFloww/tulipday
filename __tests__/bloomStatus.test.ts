/**
 * Tests voor lib/bloomStatus.ts
 *
 * Kritiekheid: HOOG
 * - Eén bloeistatus-set voor de hele app (locations.bloom_status). Partner-fases
 *   moeten correct worden vertaald, anders tonen kaarten een verkeerde status.
 * - reportBloom mag alleen geldige meldingen doorsturen en moet "te vaak" en
 *   fouten onderscheiden voor de juiste melding in de UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const ensureUser = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock("@/lib/auth", () => ({ ensureUser: () => ensureUser() }));

import {
  BLOOM_RANK, BLOOM_STATUSES, BLOOM_TONE, fromPartnerPhase, isBloomStatus, reportBloom,
} from "@/lib/bloomStatus";

describe("bloeistatus-set", () => {
  it("heeft precies de vier databasewaarden in seizoensvolgorde", () => {
    expect(BLOOM_STATUSES).toEqual(["early", "blooming", "peak", "ending"]);
  });

  it("herkent alleen geldige waarden", () => {
    expect(isBloomStatus("peak")).toBe(true);
    expect(isBloomStatus("in_bloom")).toBe(false);
    expect(isBloomStatus(null)).toBe(false);
  });

  it("sorteert volle bloei eerst en uitbloeiend laatst", () => {
    const sorted = [...BLOOM_STATUSES].sort((a, b) => BLOOM_RANK[a] - BLOOM_RANK[b]);
    expect(sorted).toEqual(["peak", "blooming", "early", "ending"]);
  });

  it("heeft een toon voor elke status", () => {
    for (const s of BLOOM_STATUSES) expect(BLOOM_TONE[s].dot).toMatch(/^bg-/);
  });
});

describe("fromPartnerPhase", () => {
  it("vertaalt elke partner-fase", () => {
    expect(fromPartnerPhase("not_yet")).toBe("early");
    expect(fromPartnerPhase("first_buds")).toBe("early");
    expect(fromPartnerPhase("starting")).toBe("blooming");
    expect(fromPartnerPhase("peak")).toBe("peak");
    expect(fromPartnerPhase("fading")).toBe("ending");
    expect(fromPartnerPhase("onzin")).toBeNull();
  });
});

describe("reportBloom", () => {
  beforeEach(() => {
    rpc.mockReset();
    ensureUser.mockReset();
  });

  it("stuurt de melding naar report_bloom", async () => {
    ensureUser.mockResolvedValue("user-1");
    rpc.mockResolvedValue({ data: "ok", error: null });
    await expect(reportBloom("loc-1", "peak")).resolves.toBe("ok");
    expect(rpc).toHaveBeenCalledWith("report_bloom", { p_location_id: "loc-1", p_status: "peak" });
  });

  it("geeft too_often door", async () => {
    ensureUser.mockResolvedValue("user-1");
    rpc.mockResolvedValue({ data: "too_often", error: null });
    await expect(reportBloom("loc-1", "peak")).resolves.toBe("too_often");
  });

  it("geeft error zonder gebruiker of bij een databasefout", async () => {
    ensureUser.mockResolvedValue(null);
    await expect(reportBloom("loc-1", "peak")).resolves.toBe("error");
    expect(rpc).not.toHaveBeenCalled();

    ensureUser.mockResolvedValue("user-1");
    rpc.mockResolvedValue({ data: null, error: { message: "fout" } });
    await expect(reportBloom("loc-1", "peak")).resolves.toBe("error");
  });
});
