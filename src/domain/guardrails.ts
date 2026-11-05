// guardrails.ts — the guardrail checks every AI string must pass (section 7, R2, R5, R11).

/** Advice words that imply recommending a financial product (R2, R3). */
const ADVICE_PATTERNS = [
  /\byou should take out\b/i,
  /\bapply for\b/i,
  /\bborrow\b/i,
  /\binvest(ing|ment)?\b/i,
  /\bloan\b/i,
  /\bcredit card\b/i,
  /\bbuy now pay later\b/i,
  /\bpay[- ]?later\b/i,
  /\boverdraft\b/i,
];

/** Shaming words (R5). */
const SHAMING_PATTERNS = [
  /\bwasted\b/i,
  /\birresponsible\b/i,
  /\bbad with money\b/i,
];

/**
 * Extra checks for Sassy (new R5): Sassy may judge the spending playfully, never the
 * person. No comments on income, body, looks or worth; no real swear words ("what the
 * hell" is the limit); no fear or fake urgency; never pushes spending.
 */
const SASSY_PERSON_PATTERNS = [
  /\bbroke\b/i,
  /\bpoor\b/i,
  /\bloser\b/i,
  /\bpathetic\b/i,
  /\bstupid\b/i,
  /\bidiot\b/i,
  /\bdumb\b/i,
  /\bworthless\b/i,
  /\bfailure\b/i,
  /\bincome\b/i,
  /\bsalary\b/i,
  /\bwages?\b/i,
  /\bbody\b/i,
  /\bweight\b/i,
  /\bfat\b/i,
  /\bugly\b/i,
  /\byour looks\b/i,
];

const SWEAR_PATTERNS = [
  /f+u+c+k/i,
  /\bsh[i1]t/i,
  /\bbitch/i,
  /\bdamn/i,
  /\bcrap\b/i,
  /\bbastard/i,
  /\bbloody\b/i,
  /\bpiss/i,
  /\basshole|\barse\b/i,
  /\bwtf\b/i,
  // "hell" is only allowed inside "what the hell".
  /(?<!what the )\bhell\b/i,
];

const PUSH_OR_FEAR_PATTERNS = [
  /\btreat yourself\b/i,
  /\byou deserve (it|this)\b/i,
  /\bgo shopping\b/i,
  /\bspend it\b/i,
  /\bbuy it\b/i,
  /\bact now\b/i,
  /\bbefore it'?s too late\b/i,
  /\bhurry\b/i,
  /\bdisaster\b/i,
  /\bpanic\b/i,
];

export interface GuardrailResult {
  ok: boolean;
  reasons: string[];
}

function collect(text: string, groups: [string, RegExp[]][]): string[] {
  const reasons: string[] = [];
  for (const [name, patterns] of groups) {
    for (const re of patterns) if (re.test(text)) reasons.push(`${name}: ${re.source}`);
  }
  return reasons;
}

/** Check generic AI text for advice/shaming words. */
export function checkText(text: string): GuardrailResult {
  const reasons = collect(text, [
    ["advice phrase", ADVICE_PATTERNS],
    ["shaming phrase", SHAMING_PATTERNS],
  ]);
  return { ok: reasons.length === 0, reasons };
}

/** Matches one emoji (pictographic symbols, with optional variation selector). */
const EMOJI_RE = /\p{Extended_Pictographic}\uFE0F?/gu;

export function countEmoji(text: string): number {
  return text.match(EMOJI_RE)?.length ?? 0;
}

/** Sassy text: the generic checks, plus person-shaming, swears and spending pushes, and 1 to 3 emojis. */
export function checkSassy(text: string): GuardrailResult {
  const reasons = [
    ...checkText(text).reasons,
    ...collect(text, [
      ["about the person", SASSY_PERSON_PATTERNS],
      ["swear word", SWEAR_PATTERNS],
      ["pushes spending or uses fear", PUSH_OR_FEAR_PATTERNS],
    ]),
  ];
  const emojis = countEmoji(text);
  if (emojis < 1 || emojis > 3) reasons.push(`needs 1 to 3 emojis, has ${emojis}`);
  return { ok: reasons.length === 0, reasons };
}

/**
 * A tip must additionally contain no merchant/brand name (R11). The caller passes the
 * list of known merchant/brand names to screen against.
 */
export function checkTip(text: string, knownMerchants: string[]): GuardrailResult {
  const base = checkText(text);
  const reasons = [...base.reasons];
  for (const m of knownMerchants) {
    if (!m) continue;
    const re = new RegExp(`\\b${escapeRegExp(m)}\\b`, "i");
    if (re.test(text)) reasons.push(`merchant/brand name in tip: ${m}`);
  }
  return { ok: reasons.length === 0, reasons };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
