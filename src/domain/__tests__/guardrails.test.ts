// guardrails.test.ts — section 7 guardrail checks block/rewrite bad AI text.

import { describe, it, expect } from "vitest";
import { checkText, checkTip } from "../guardrails";

describe("guardrail word checks", () => {
  it("blocks advice phrases", () => {
    expect(checkText("you should take out a loan").ok).toBe(false);
    expect(checkText("apply for a credit card today").ok).toBe(false);
    expect(checkText("why not invest the rest?").ok).toBe(false);
    expect(checkText("try buy now pay later").ok).toBe(false);
  });

  it("blocks shaming phrases", () => {
    expect(checkText("you wasted money this week").ok).toBe(false);
    expect(checkText("that was irresponsible").ok).toBe(false);
    expect(checkText("you're bad with money").ok).toBe(false);
  });

  it("allows calm, neutral text", () => {
    expect(checkText("Takeaways are up a bit this week.").ok).toBe(true);
    expect(checkText("Heads up: you could be about £40 short before Fri 13 Nov.").ok).toBe(true);
  });

  it("blocks a merchant/brand name inside a tip", () => {
    expect(checkTip("Pause your GlowRoom subscription", ["GlowRoom", "StreamFlix"]).ok).toBe(false);
    expect(checkTip("Pause your £12.99 subscription that renews tomorrow", ["GlowRoom", "StreamFlix"]).ok).toBe(true);
  });
});
