import type { BusinessOverride } from "@/lib/types";

const OVERRIDES_KEY = "maum:business-overrides";
const UNLOCKED_KEY_PREFIX = "maum:unlocked:";

function loadAll(): Record<string, BusinessOverride> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, BusinessOverride>) : {};
  } catch {
    return {};
  }
}

export function getOverride(businessId: string): BusinessOverride | undefined {
  return loadAll()[businessId];
}

export function setOverride(
  businessId: string,
  patch: Omit<BusinessOverride, "updatedAt">
) {
  const all = loadAll();
  all[businessId] = { ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

export function isUnlocked(businessId: string): boolean {
  return localStorage.getItem(UNLOCKED_KEY_PREFIX + businessId) === "1";
}

export function unlock(businessId: string) {
  localStorage.setItem(UNLOCKED_KEY_PREFIX + businessId, "1");
}
