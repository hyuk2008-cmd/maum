import type { Listing, TradeStatus } from "@/lib/types";

const STORAGE_KEY = "maum:listings";

export function loadListings(): Listing[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const listings: Listing[] = raw ? JSON.parse(raw) : [];
    return listings.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

function saveListings(listings: Listing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

export function getListing(id: string): Listing | undefined {
  return loadListings().find((l) => l.id === id);
}

export function createListing(input: {
  title: string;
  price: number;
  category: Listing["category"];
  description: string;
  sellerName: string;
}): Listing {
  const now = new Date().toISOString();
  const listing: Listing = {
    id: `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "판매중",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  const listings = loadListings();
  listings.unshift(listing);
  saveListings(listings);
  return listing;
}

export function advanceListingStatus(id: string, status: TradeStatus): Listing[] {
  const listings = loadListings();
  const target = listings.find((l) => l.id === id);
  if (target) {
    target.status = status;
    target.updatedAt = new Date().toISOString();
    saveListings(listings);
  }
  return listings;
}
