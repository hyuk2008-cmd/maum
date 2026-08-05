import type { RawMessage } from "./kakaoParser";
import { anonymizeSender } from "./anonymize";
import type { Business, Category, Mention, MentionSource, SeedData } from "@/lib/types";

const PHONE_RE = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})|(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})/g;

// KakaoTalk photo message bodies are just long hex filenames (the image
// hash), e.g. "1dd2f46e...998daa.jpg" — these can accidentally contain a
// run of digits that looks like a phone number, and are never real ad
// content, so strip them before any extraction logic runs.
const FILENAME_RE = /\b[0-9a-f]{12,}\.(jpe?g|png|gif|heic|heif|mp4|mov|webp)\b/gi;
const HEX_HASH_RE = /^[0-9a-f]{12,}$/i;

function stripFilenames(text: string): string {
  return text.replace(FILENAME_RE, " ").replace(/\s+/g, " ").trim();
}

// Some emoji (4-byte UTF-8 sequences, lead byte 0xF0) were mis-decoded
// byte-by-byte as Latin-1 somewhere upstream, showing up as "ð" followed by
// 1-3 stray Latin-1 supplement characters (e.g. "ð\x9f¥°"). "ð" as a lead
// byte never occurs in real Korean/English ad text, so it's safe to strip.
// Markdown-style backslash-escaping ("\!", "\~", "\#") from the source
// extraction is unescaped too.
function cleanText(text: string): string {
  return text
    // Google Drive's auto-generated image label list, not real content
    .replace(/Image labels?:\s*\\?\[[^\]]*\\?\]/gi, "")
    .replace(/ð[-¿]{1,3}/g, "")
    .replace(/\\([!~#.\-[\]()>*_])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const STREET_SUFFIX =
  "(?:Blvd|Boulevard|St|Street|Ave|Avenue|Dr|Drive|Rd|Road|Ct|Court|Way|Pkwy|Parkway|Ln|Lane|Cir|Circle|Hwy|Highway|Ste|Suite|Pl|Place)";
const ADDRESS_RE = new RegExp(
  `\\d{2,6}\\s+[A-Za-z0-9.'\\s]{2,40}\\b${STREET_SUFFIX}\\b[A-Za-z0-9.,#\\s]{0,40}`,
  "i"
);

function guessAddress(text: string): string | undefined {
  const match = text.match(ADDRESS_RE);
  if (!match) return undefined;
  const cleaned = match[0].replace(/\s+/g, " ").trim();
  return cleaned.length > 60 ? cleaned.slice(0, 60) : cleaned;
}

const KAKAO_ID_RE =
  /(?:카카오톡|카톡)\s*(?:아이디|id|ID)?\s*[:：]\s*([A-Za-z0-9._-]{3,20})/;

const KAKAO_ID_STOPWORDS = new Set([
  "id", "or", "and", "the", "to", "is", "채널", "문의", "상담", "가능",
]);

function guessKakaoId(text: string): string | undefined {
  const match = text.match(KAKAO_ID_RE);
  if (!match) return undefined;
  const id = match[1].trim();
  // avoid capturing stray filler words that slip past the id charset
  if (KAKAO_ID_STOPWORDS.has(id.toLowerCase())) return undefined;
  return id;
}

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

/** A single piece of raw text to consider for business/mention extraction. */
export interface Signal {
  text: string;
  date: string; // ISO
  /** display name (chat) or a stable per-upload label (photo) — anonymized before storage */
  authorLabel: string;
  source: MentionSource;
  /** Google Drive file id, when source is "photo" — not personal data, safe to keep as-is */
  imageId?: string;
}

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
  const candidate = lines.find((l) => {
    if (l.length < 2 || l.length > 30) return false;
    if (PHONE_RE.test(l)) return false;
    PHONE_RE.lastIndex = 0;
    if (GENERIC_LINE_RE.test(l)) return false;
    if (isMostlySymbols(l)) return false;
    if (HEX_HASH_RE.test(l.replace(/\s/g, ""))) return false;
    return true;
  });
  return candidate ?? lines[0]?.slice(0, 30) ?? "이름 미상 업체";
}

function excerptOf(text: string): string {
  // Show the full cleaned text (collapsing runs of blank lines) rather than
  // truncating — users asked to see the whole post, not a snippet.
  return text.replace(/\n{2,}/g, "\n").trim();
}

/**
 * Normalized key used to detect the "same" ad/message posted multiple
 * times — including reposts of the same campaign with a tweaked price or
 * date. Digits/punctuation are stripped so those edits don't create a new
 * group, and only the opening ~50 characters are compared.
 */
function dedupeKey(text: string): string {
  return text
    .replace(/[\d\W_]+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 50);
}

const PROMO_HINTS = [
  "문의", "예약", "상담", "할인", "이벤트", "call", "text", "카톡",
  "추천", "강추", "잘해요", "친절", "만족", "가성비",
];

export function messagesToSignals(messages: RawMessage[]): Signal[] {
  return messages.map((m) => ({
    text: m.text,
    date: m.date,
    authorLabel: m.sender,
    source: "chat" as const,
  }));
}

/**
 * Rule-based extraction of business listings + community mentions from a
 * list of text signals (chat messages and/or OCR'd flyer photos). A signal
 * is only treated as a business mention when it contains a phone number,
 * since phone number is the most reliable de-duplication key across years
 * of reposts. Identical reposts of the same message are collapsed into a
 * single Mention with a `repostCount`.
 *
 * `salt` anonymizes chat sender identity — pass a secret not committed to
 * the repo when processing real chat exports.
 */
export function extractBusinesses(signals: Signal[], salt: string): SeedData {
  const businessByPhone = new Map<string, Business>();
  // per business: dedupeKey -> mention accumulator
  const mentionGroups = new Map<string, Map<string, Mention & { authorIds: Set<string> }>>();
  const postCounts = new Map<string, { chat: number; photo: number }>();

  for (const signal of signals) {
    const text = cleanText(stripFilenames(signal.text));
    if (!text) continue;

    const phones = text.match(PHONE_RE);
    if (!phones || phones.length === 0) continue;

    const hasPromoHint = PROMO_HINTS.some((h) => text.includes(h));
    if (text.length < 15) continue;
    if (!hasPromoHint && text.length < 40) continue;

    const phone = normalizePhone(phones[0]);
    if (phone.length < 9) continue;

    const guessedName = guessBusinessName(text);
    if (HEX_HASH_RE.test(guessedName.replace(/\s/g, ""))) continue;

    let business = businessByPhone.get(phone);
    if (!business) {
      business = {
        id: `biz_${phone}`,
        name: guessedName,
        category: guessCategory(text),
        phone: phones[0].trim(),
        kakaoId: guessKakaoId(text),
        address: guessAddress(text),
        mentionCount: 0,
        totalPostCount: 0,
        postCountBySource: { chat: 0, photo: 0 },
        firstMentionDate: signal.date,
        lastMentionDate: signal.date,
        trustScore: 0,
        mentionIds: [],
      };
      businessByPhone.set(phone, business);
      mentionGroups.set(phone, new Map());
      postCounts.set(phone, { chat: 0, photo: 0 });
    } else {
      if (!business.address) business.address = guessAddress(text);
      if (!business.kakaoId) business.kakaoId = guessKakaoId(text);
    }

    postCounts.get(phone)![signal.source] += 1;

    const groups = mentionGroups.get(phone)!;
    const key = dedupeKey(text);
    const authorId =
      signal.source === "chat"
        ? anonymizeSender(signal.authorLabel, salt)
        : `photo_${anonymizeSender(signal.authorLabel, salt).slice(-8)}`;

    const existing = groups.get(key);
    if (existing) {
      existing.repostCount += 1;
      existing.authorIds.add(authorId);
      if (signal.date > existing.date) existing.date = signal.date;
      if (!existing.imageId && signal.imageId) existing.imageId = signal.imageId;
    } else {
      groups.set(key, {
        id: `men_${phone}_${groups.size}`,
        businessId: business.id,
        authorId,
        authorIds: new Set([authorId]),
        date: signal.date,
        excerpt: excerptOf(text),
        sentiment: /강추|추천|잘해요|친절|만족/.test(text) ? "positive" : "neutral",
        sourcePhone: phone,
        source: signal.source,
        repostCount: 1,
        imageId: signal.imageId,
      });
    }

    if (signal.date < business.firstMentionDate) business.firstMentionDate = signal.date;
    if (signal.date > business.lastMentionDate) business.lastMentionDate = signal.date;
  }

  const mentions: Mention[] = [];
  for (const [phone, groups] of mentionGroups) {
    const business = businessByPhone.get(phone)!;
    for (const g of groups.values()) {
      const { authorIds, ...mention } = g;
      // if multiple distinct people posted the same text, note it in authorId
      mention.authorId =
        authorIds.size > 1 ? `${mention.authorId} 외 ${authorIds.size - 1}명` : mention.authorId;
      mentions.push(mention);
      business.mentionIds.push(mention.id);
    }
    business.mentionCount = business.mentionIds.length;
    const counts = postCounts.get(phone)!;
    business.postCountBySource = counts;
    business.totalPostCount = counts.chat + counts.photo;
  }

  const now = Date.now();
  for (const business of businessByPhone.values()) {
    const ageMonths =
      (now - new Date(business.lastMentionDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const recencyFactor = Math.max(0, 1 - ageMonths / 36);
    const countFactor = Math.min(1, business.totalPostCount / 10);
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
