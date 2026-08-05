/**
 * Usage:
 *   npx tsx scripts/build-seed.ts <kakao-export.txt> [photos.json]
 *
 * Combines a KakaoTalk chat export with (optionally) a JSON array of
 * OCR'd flyer/photo text — [{ id, title, text, createdTime }] — into a
 * single anonymized data/seed.json. Neither raw input file should ever be
 * committed to the repo (they may contain real names / uploader identity).
 */
import { readFileSync, writeFileSync } from "fs";
import { parseKakaoExport } from "../lib/parser/kakaoParser";
import { extractBusinesses, messagesToSignals, type Signal } from "../lib/parser/extractBusinesses";

const [chatPath, photosPath] = process.argv.slice(2);
if (!chatPath) {
  console.error("Usage: npx tsx scripts/build-seed.ts <kakao-export.txt> [photos.json]");
  process.exit(1);
}

const salt = process.env.ANONYMIZE_SALT ?? "dev-only-salt-change-me";

const raw = readFileSync(chatPath, "utf-8");
const messages = parseKakaoExport(raw);
const signals: Signal[] = messagesToSignals(messages);

if (photosPath) {
  interface PhotoRecord {
    id: string;
    title: string;
    text: string;
    createdTime: string;
  }
  const photos: PhotoRecord[] = JSON.parse(readFileSync(photosPath, "utf-8"));
  for (const p of photos) {
    if (!p.text || p.text.trim().length < 15) continue;
    signals.push({
      text: p.text,
      date: p.createdTime || new Date().toISOString(),
      authorLabel: p.id, // no real identity attached to a flyer photo
      source: "photo",
    });
  }
  console.log(`loaded ${photos.length} photo records`);
}

const seed = extractBusinesses(signals, salt);
writeFileSync("data/seed.json", JSON.stringify(seed, null, 2));

console.log(`parsed ${messages.length} chat messages, ${signals.length} total signals`);
console.log(`extracted ${seed.businesses.length} businesses, ${seed.mentions.length} deduped mentions`);
