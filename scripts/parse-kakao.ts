/**
 * Usage: npx tsx scripts/parse-kakao.ts <path-to-kakao-export.txt>
 *
 * Reads a raw KakaoTalk export, extracts business mentions, anonymizes
 * senders, and writes the result to data/seed.json. The raw export itself
 * must never be committed to the repo — it contains real names.
 */
import { readFileSync, writeFileSync } from "fs";
import { parseKakaoExport } from "../lib/parser/kakaoParser";
import { extractBusinesses } from "../lib/parser/extractBusinesses";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npx tsx scripts/parse-kakao.ts <path-to-kakao-export.txt>");
  process.exit(1);
}

const salt = process.env.ANONYMIZE_SALT ?? "dev-only-salt-change-me";
const raw = readFileSync(inputPath, "utf-8");
const messages = parseKakaoExport(raw);
const seed = extractBusinesses(messages, salt);

writeFileSync("data/seed.json", JSON.stringify(seed, null, 2));

console.log(`parsed ${messages.length} messages`);
console.log(`extracted ${seed.businesses.length} businesses, ${seed.mentions.length} mentions`);
