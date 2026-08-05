import { createHash } from "crypto";

/**
 * One-way hash of a KakaoTalk display name into a stable pseudonymous id.
 * The salt is required so ids aren't reversible via a rainbow table of
 * common Korean/English names.
 */
export function anonymizeSender(name: string, salt: string): string {
  const hash = createHash("sha256").update(salt + "::" + name).digest("hex");
  return `member_${hash.slice(0, 8)}`;
}
