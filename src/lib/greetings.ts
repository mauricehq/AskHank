type TimePeriod = "morning" | "afternoon" | "evening" | "night";

const GREETINGS: Record<TimePeriod, string[]> = {
  morning: [
    "Coffee's barely cold and you're already shopping, {name}.",
    "Morning. What are we talking you out of today?",
    "Early bird gets the... unnecessary purchase. What is it, {name}?",
    "You're up early. Let me guess — you saw an ad.",
    "Alright, {name}. What's the morning damage?",
  ],
  afternoon: [
    "Lunch break shopping, {name}? Classic.",
    "Afternoon. What's caught your eye?",
    "Post-lunch impulse. The most dangerous kind, {name}.",
    "Alright, {name}. What are we looking at?",
    "The afternoon slump is not a shopping event, {name}.",
  ],
  evening: [
    "Long day, {name}? Shopping won't fix it.",
    "Evening. What are you telling yourself you deserve?",
    "Winding down with some retail therapy, {name}?",
    "End of day. Guard's down. What is it?",
    "The 'treat yourself' hour. What is it this time, {name}?",
  ],
  night: [
    "Nothing bought after 9pm was ever a good idea, {name}.",
    "Late night. This is when wallets get hurt.",
    "Can't sleep? Tell me what you're eyeing, {name}.",
    "The midnight scroll. Always dangerous, {name}.",
    "You should be sleeping, not shopping, {name}.",
  ],
};

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function hashDateString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getGreeting(firstName?: string | null): string {
  const now = new Date();
  const period = getTimePeriod(now.getHours());
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  const pool = GREETINGS[period];
  const index = hashDateString(dateStr + period) % pool.length;
  let greeting = pool[index];

  if (firstName) {
    greeting = greeting.replace(/\{name\}/g, firstName);
  } else {
    greeting = greeting.replace(/, \{name\}/g, "").replace(/ \{name\}/g, "");
  }

  return greeting;
}
