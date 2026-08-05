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

export interface Mention {
  id: string;
  businessId: string;
  /** anonymized author id, e.g. "member_3f2a" — never a real name */
  authorId: string;
  date: string; // ISO date
  /** short excerpt of the original message, PII-stripped */
  excerpt: string;
  sentiment: "positive" | "neutral" | "negative";
  sourcePhone?: string;
}

export interface Business {
  id: string;
  name: string;
  category: Category;
  phone?: string;
  address?: string;
  mentionCount: number;
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
