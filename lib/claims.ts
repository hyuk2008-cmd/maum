import type { Claim, ClaimStatus } from "@/lib/types";

const KEY = "maum:claims";

function load(): Claim[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Claim[]) : [];
  } catch {
    return [];
  }
}

function save(claims: Claim[]) {
  localStorage.setItem(KEY, JSON.stringify(claims));
}

export function getAllClaims(): Claim[] {
  return load().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getClaimsForBusiness(businessId: string): Claim[] {
  return getAllClaims().filter((c) => c.businessId === businessId);
}

export function getApprovedCode(businessId: string): string | undefined {
  return load().find((c) => c.businessId === businessId && c.status === "승인")?.ownerCode;
}

export function createClaim(input: {
  businessId: string;
  claimantName: string;
  contact: string;
  note: string;
}): Claim {
  const now = new Date().toISOString();
  const claim: Claim = {
    id: `clm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "대기",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  const claims = load();
  claims.unshift(claim);
  save(claims);
  return claim;
}

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function updateClaimStatus(id: string, status: ClaimStatus): Claim | undefined {
  const claims = load();
  const claim = claims.find((c) => c.id === id);
  if (!claim) return undefined;
  claim.status = status;
  claim.updatedAt = new Date().toISOString();
  if (status === "승인" && !claim.ownerCode) {
    claim.ownerCode = generateCode();
  }
  save(claims);
  return claim;
}
