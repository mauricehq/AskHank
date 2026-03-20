type Decision = "buying" | "skipping";
type Outcome = "purchased" | "skipped";

// --- Nudge quips (shown on greeting card) ---

const NUDGE_QUIPS: Record<Decision, string[]> = {
  skipping: [
    "Those {item} you said you were skipping. You hold strong?",
    "Remember {item}? You said no. Did it stay no?",
    "You walked away from {item}. Still standing firm?",
    "{item}. You said skip. Hank Score was {score}. Did you mean it?",
    "Quick check on {item}. You said you were skipping.",
  ],
  buying: [
    "Those {item} you said you were buying. Did you follow through?",
    "{item}. You said you were buying. Did it happen?",
    "You committed to buying {item}. Hank Score was {score}. Well?",
    "Checking in on {item}. You said buying.",
    "{item}. You said you'd buy it. Did you?",
  ],
};

// --- Outcome reaction lines (shown after recording) ---

const OUTCOME_REACTIONS: Record<`${Decision}_${Outcome}`, string[]> = {
  skipping_skipped: [
    "Good. That's what you said you'd do.",
    "Kept your word. Respect.",
    "Said skip, did skip. Consistent.",
  ],
  skipping_purchased: [
    "You said you were skipping this. Hank Score was {score}. I have questions.",
    "Skipping, you said. Purchased, you did. Noted.",
    "So that 'no' was more of a 'not yet.' Got it.",
  ],
  buying_purchased: [
    "You said you would. You did. Fair enough.",
    "Bought it as planned. At least you're honest.",
    "Followed through. Can't argue with that.",
  ],
  buying_skipped: [
    "You said you were buying it and then didn't. ...Respect.",
    "Changed your mind after saying yes? That's growth.",
    "Said buying, ended up skipping. Hank approves.",
  ],
};

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function interpolate(
  template: string,
  item?: string | null,
  score?: number | null
): string {
  let result = template;
  if (item) {
    result = result.replace(/\{item\}/g, item);
  } else {
    result = result.replace(/\{item\}/g, "that thing");
  }
  if (score != null) {
    result = result.replace(/\{score\}/g, String(score));
  } else {
    result = result.replace(/ Hank Score was \{score\}\./g, "");
    result = result.replace(/ Hank Score was \{score\}/g, "");
  }
  return result;
}

export function getNudgeQuip(
  decision: Decision,
  item?: string | null,
  hankScore?: number | null
): string {
  const template = pickRandom(NUDGE_QUIPS[decision]);
  return interpolate(template, item, hankScore);
}

export function getOutcomeReaction(
  decision: Decision,
  outcome: Outcome,
  item?: string | null,
  hankScore?: number | null
): string {
  const key = `${decision}_${outcome}` as `${Decision}_${Outcome}`;
  const template = pickRandom(OUTCOME_REACTIONS[key]);
  return interpolate(template, item, hankScore);
}
