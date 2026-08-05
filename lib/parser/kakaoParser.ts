export interface RawMessage {
  date: string; // ISO 8601
  sender: string; // original display name — caller must anonymize before persisting
  text: string;
}

const MESSAGE_LINE =
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s?(.*)$/;

const DATE_ONLY_LINE =
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{2})$/;

const CHAT_TITLE_LINE = /님과\s*카카오톡\s*대화\s*$/;
const SAVED_DATE_LINE = /^저장한\s*날짜/;

function toIso(
  year: string,
  month: string,
  day: string,
  ampm: string,
  hour: string,
  minute: string
): string {
  let h = parseInt(hour, 10) % 12;
  if (ampm === "오후") h += 12;
  const pad = (n: number | string) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(h)}:${pad(minute)}:00`;
}

/**
 * Parses a KakaoTalk "대화 내보내기" (.txt) export into structured messages.
 * Handles multi-line messages that continue on following lines until the
 * next timestamped line appears.
 */
export function parseKakaoExport(raw: string): RawMessage[] {
  // Strip BOM
  const text = raw.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/);

  const messages: RawMessage[] = [];
  let current: RawMessage | null = null;

  for (const line of lines) {
    if (CHAT_TITLE_LINE.test(line) || SAVED_DATE_LINE.test(line)) {
      continue;
    }
    if (DATE_ONLY_LINE.test(line)) {
      // day/time separator with no sender — not a message
      continue;
    }

    const m = MESSAGE_LINE.exec(line);
    if (m) {
      if (current) messages.push(current);
      const [, year, month, day, ampm, hour, minute, sender, text] = m;
      current = {
        date: toIso(year, month, day, ampm, hour, minute),
        sender: sender.trim(),
        text: text.trim(),
      };
      continue;
    }

    // continuation of the previous message
    if (current && line.trim().length > 0) {
      current.text += (current.text ? "\n" : "") + line.trim();
    }
  }
  if (current) messages.push(current);

  return messages;
}
