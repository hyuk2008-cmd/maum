import type { RawMessage } from "./kakaoParser";
import { anonymizeSender } from "./anonymize";
import type { Business, Category, Mention, SeedData } from "@/lib/types";

const PHONE_RE = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})|(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})/g;

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  "부동산": ["부동산", "리얼티", "realty", "매물", "렌트", "lease", "for lease", "for sale", "콘도", "오픈하우스", "open house"],
  "이사": ["이사", "moving", "용달", "포장이사"],
  "핸디맨/집수리": ["핸디맨", "집수리", "리모델링", "플러밍", "hvac", "에어컨", "용접", "인테리어", "루핑", "콘크리트"],
  "미용/피부": ["보톡스", "피부", "에스테틱", "aesthetic", "미용", "네일", "왁싱", "반영구", "속눈썹", "탈모"],
  "건강/병원": ["클리닉", "한의원", "치과", "병원", "메디케어", "medicare", "치료", "테라피"],
  "식품/마켓": ["haccp", "정육", "순대", "부대찌개", "식품", "마켓", "수산", "한우", "해산물"],
  "금융/보험/융자": ["보험", "인슈어런스", "insurance", "융자", "펀딩", "크레딧", "iul", "401k", "모기지"],
  "교육": ["학원", "운전학교", "driving", "아카데미", "academy", "교육"],
  "자동차": ["카센터", "정비", "타이어", "오토", "auto repair"],
  "법률/세무": ["변호사", "회계사", "세무", "law", "cpa", "택스"],
  "여행/레저": ["여행", "온천", "hot spring", "리조트", "투어"],
  "기타": [],
};

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

function guessCategory(text: string): Category {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return category;
    }
  }
  return "기타";
}

const GENERIC_LINE_RE =
  /^(안녕하세요|안녕하십니까|반갑습니다|hello|hi)[\s!?.~ㅎ]*$/i;

function isMostlySymbols(line: string): boolean {
  const letters = line.match(/[\p{L}\p{N}]/gu) ?? [];
  return letters.length < Math.max(2, line.length * 0.4);
}

function guessBusinessName(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // prefer a short line (likely a business/brand name) near the top that
  // isn't a greeting, isn't the phone number, and isn't mostly emoji/symbols
  const candidate = lines.find((l) => {
    if (l.length < 2 || l.length > 30) return false;
    if (PHONE_RE.test(l)) return false;
    PHONE_RE.lastIndex = 0;
    if (GENERIC_LINE_RE.test(l)) return false;
    if (isMostlySymbols(l)) return false;
    return true;
  });
  return candidate ?? lines[0]?.slice(0, 30) ?? "이름 미상 업체";
}

function excerptOf(text: string): string {
  const flat = text.replace(/\n+/g, " ").trim();
  return flat.length > 140 ? flat.slice(0, 140) + "…" : flat;
}

const PROMO_HINTS = [
  "문의", "예약", "상담", "할인", "이벤트", "call", "text", "카톡",
  "추천", "강추", "잘해요", "친절", "만족", "가성비",
];

/**
 * Rule-based extraction of business listings + community mentions from
 * parsed KakaoTalk messages. This is intentionally conservative: a message
 * is only treated as a business signal when it contains a phone number,
 * since phone number is the most reliable de-duplication key across years
 * of reposts.
 *
 * `salt` anonymizes sender identity — pass a secret not committed to the
 * repo when processing real chat exports.
 */
export function extractBusinesses(messages: RawMessage[], salt: string): SeedData {
  const businessByPhone = new Map<string, Business>();
  const mentions: Mention[] = [];

  for (const msg of messages) {
    const phones = msg.text.match(PHONE_RE);
    if (!phones || phones.length === 0) continue;

    const hasPromoHint = PROMO_HINTS.some((h) => msg.text.includes(h));
    if (msg.text.length < 15) continue; // too short to be a real listing
    if (!hasPromoHint && msg.text.length < 40) continue;

    const phone = normalizePhone(phones[0]);
    if (phone.length < 9) continue;

    let business = businessByPhone.get(phone);
    if (!business) {
      business = {
        id: `biz_${phone}`,
        name: guessBusinessName(msg.text),
        category: guessCategory(msg.text),
        phone: phones[0].trim(),
        mentionCount: 0,
        firstMentionDate: msg.date,
        lastMentionDate: msg.date,
        trustScore: 0,
        mentionIds: [],
      };
      businessByPhone.set(phone, business);
    }

    const mentionId = `men_${phone}_${mentions.length}`;
    const mention: Mention = {
      id: mentionId,
      businessId: business.id,
      authorId: anonymizeSender(msg.sender, salt),
      date: msg.date,
      excerpt: excerptOf(msg.text),
      sentiment: /강추|추천|잘해요|친절|만족/.test(msg.text) ? "positive" : "neutral",
      sourcePhone: phone,
    };
    mentions.push(mention);

    business.mentionCount += 1;
    business.mentionIds.push(mentionId);
    if (msg.date < business.firstMentionDate) business.firstMentionDate = msg.date;
    if (msg.date > business.lastMentionDate) business.lastMentionDate = msg.date;
  }

  const now = Date.now();
  for (const business of businessByPhone.values()) {
    const ageMonths =
      (now - new Date(business.lastMentionDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const recencyFactor = Math.max(0, 1 - ageMonths / 36); // decays to 0 over 3 years
    const countFactor = Math.min(1, business.mentionCount / 10);
    business.trustScore = Math.round((0.6 * recencyFactor + 0.4 * countFactor) * 100);
  }

  return {
    generatedAt: new Date().toISOString(),
    businesses: Array.from(businessByPhone.values()).sort(
      (a, b) => b.trustScore - a.trustScore
    ),
    mentions,
  };
}
