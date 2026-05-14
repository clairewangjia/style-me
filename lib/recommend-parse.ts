// Parse a recommend-API markdown response into discrete outfit blocks.
//
// Outfit headings vary between LLM runs. Observed conventions:
//   - "### 方案一：xxx"          (H3 with Chinese ordinal)
//   - "### 🌟 Look 1：xxx"        (H3 with emoji + English)
//   - "🌿 Day 1-2: xxx"           (no H3, leading emoji + English)
//   - "**Day 3:** xxx"            (bold-only)
//   - "👒 套二：xxx"               (Chinese 套 + ordinal)
//
// Strategy: a line is an outfit heading if, after stripping leading
// markdown bold (`**`), spaces, and emojis, it starts with one of
// {Day, Look, Outfit, 方案, 套, Day-N} and ends with `:` or `：`.
// `### ` headings always count.

const ITEM_ID_RE = /item_[a-z0-9_]+/gi;

// Emoji + variation selectors + ZWJ. Pragmatic — not a full Unicode list.
const LEADING_DECOR_RE = /^[\s*_#>\-•·]*(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+\s*)*\**\s*/u;

const OUTFIT_KEYWORD_RE =
  /^(?:Day|Look|Outfit|方案|套|搭配|Set)[\s\-－一二三四五六七八九十0-9]+[:：]/i;

function isOutfitHeader(line: string): boolean {
  // Markdown ATX heading
  if (/^#{1,6}\s+\S/.test(line)) return true;
  const stripped = line.replace(LEADING_DECOR_RE, "").trim();
  return OUTFIT_KEYWORD_RE.test(stripped);
}

function cleanTitle(line: string): string {
  // Drop leading `###`, bold markers, and trailing `**` if any.
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*\*\*/, "")
    .replace(/\*\*\s*$/, "")
    .trim();
}

export interface ParsedOutfit {
  /** Heading text (cleaned). Empty if no heading. */
  title: string;
  /** Markdown body for this outfit (excludes the heading line). */
  body: string;
  /** Unique item IDs referenced in this body, in first-seen order. */
  itemIds: string[];
}

export function extractItemIds(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(ITEM_ID_RE)) {
    const id = m[0].toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function parseOutfits(markdown: string): ParsedOutfit[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split("\n");
  const sections: { title: string; bodyLines: string[] }[] = [];
  let current: { title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    if (isOutfitHeader(line)) {
      if (current) sections.push(current);
      current = { title: cleanTitle(line), bodyLines: [] };
    } else {
      if (!current) current = { title: "", bodyLines: [] };
      current.bodyLines.push(line);
    }
  }
  if (current) sections.push(current);

  const parsed = sections.map((s) => ({
    title: s.title,
    body: s.bodyLines.join("\n").trim(),
    itemIds: extractItemIds(s.bodyLines.join("\n")),
  }));

  // Drop leading preamble block (no title AND no items) when there
  // are titled outfits after it.
  if (
    parsed.length > 1 &&
    parsed[0].title === "" &&
    parsed[0].itemIds.length === 0
  ) {
    return parsed.slice(1);
  }

  return parsed;
}
