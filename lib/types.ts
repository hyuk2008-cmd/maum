export type Category =
  | "부동산"
  | "이사"
  | "핸디맨/집수리"
  | "미용/피부"
  | "건강/병원"
  | "식품/마켓"
  | "금융/보험/융자"
  | "교육"
  | "자동차"
  | "법률/세무"
  | "여행/레저"
  | "기타";

export type MentionSource = "chat" | "photo";

export interface Mention {
  id: string;
  businessId: string;
  /** anonymized author id, e.g. "member_3f2a" — never a real name */
  authorId: string;
  date: string; // ISO date of the most recent occurrence
  /** short excerpt of the original message, PII-stripped */
  excerpt: string;
  sentiment: "positive" | "neutral" | "negative";
  sourcePhone?: string;
  source: MentionSource;
  /** how many times this same message/flyer was posted (dedup count) */
  repostCount: number;
  /** Google Drive file id of the source flyer photo, when source is "photo" */
  imageId?: string;
}

export interface Business {
  id: string;
  name: string;
  category: Category;
  phone?: string;
  /** KakaoTalk ID/채널 posted as a contact method, when no phone number was given */
  kakaoId?: string;
  address?: string;
  /** number of distinct (deduped) mention groups */
  mentionCount: number;
  /** total raw posts/reposts across all mention groups */
  totalPostCount: number;
  postCountBySource: { chat: number; photo: number };
  firstMentionDate: string;
  lastMentionDate: string;
  trustScore: number; // 0-100, weighted by recency + mention count
  mentionIds: string[];
}

export interface SeedData {
  generatedAt: string;
  businesses: Business[];
  mentions: Mention[];
}

/** Locally-stored user review — not part of the seed dataset. */
export interface Review {
  id: string;
  businessId: string;
  authorName: string;
  rating: number; // 1-5
  body: string;
  createdAt: string; // ISO
}

/**
 * A 개인거래 (peer-to-peer) listing's safe-trade workflow stage. This is a
 * *concept model* only — no real money moves through this app yet. Once a
 * payment gateway (e.g. 토스페이먼츠) is integrated, "결제대기" would be the
 * point where the buyer's payment is actually captured and held.
 */
export type TradeStatus =
  | "판매중"
  | "구매요청됨"
  | "결제대기"
  | "수령확인대기"
  | "정산완료"
  | "거래취소";

export const TRADE_STATUS_ORDER: TradeStatus[] = [
  "판매중",
  "구매요청됨",
  "결제대기",
  "수령확인대기",
  "정산완료",
];

/** Locally-stored 개인거래 listing — not part of the seed dataset. */
export interface Listing {
  id: string;
  title: string;
  price: number;
  category: Category;
  description: string;
  sellerName: string;
  status: TradeStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type ClaimStatus = "대기" | "승인" | "거절";

/**
 * A request from someone claiming to be a business's owner/representative,
 * asking for edit rights to that one listing. The site owner reviews and
 * approves manually — approval mints an `ownerCode` that's relayed to the
 * claimant out-of-band (e.g. KakaoTalk), who then enters it on the
 * business page to unlock editing. This is a concept-level permission
 * model for a no-backend app, not real authentication.
 */
export interface Claim {
  id: string;
  businessId: string;
  claimantName: string;
  contact: string; // phone or KakaoTalk ID
  note: string;
  status: ClaimStatus;
  ownerCode?: string; // set once approved
  createdAt: string;
  updatedAt: string;
}

/** Owner-submitted edits to a business's listing — layered over the static seed data. */
export interface BusinessOverride {
  name?: string;
  phone?: string;
  kakaoId?: string;
  address?: string;
  category?: Category;
  updatedAt: string;
}
