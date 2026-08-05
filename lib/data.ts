import seed from "@/data/seed.json";
import type { Business, Mention, SeedData } from "@/lib/types";

const data = seed as SeedData;

export function getBusinesses(): Business[] {
  return data.businesses;
}

export function getBusiness(id: string): Business | undefined {
  return data.businesses.find((b) => b.id === id);
}

export function getMentionsFor(businessId: string): Mention[] {
  return data.mentions
    .filter((m) => m.businessId === businessId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getCategories(): string[] {
  return Array.from(new Set(data.businesses.map((b) => b.category)));
}

export function recencyLabel(dateIso: string): string {
  const months =
    (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months < 1) return "이번 달 추천됨";
  if (months < 12) return `${Math.round(months)}개월 전 추천됨`;
  return `${Math.round(months / 12)}년 전 추천됨`;
}
