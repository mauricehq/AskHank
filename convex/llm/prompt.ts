"use node";

import type { Stance } from "./scoring";
import type { ChatMessage, ToolDefinition } from "./openrouter";

interface ConversationMessage {
  role: "user" | "hank";
  content: string;
}

interface PromptConfig {
  displayName?: string;
  stance?: Stance;
  disengagementCount?: number;
  estimatedPrice?: number;
  category?: string;
  stagnationCount?: number;
  turnCount?: number;
  previousAssessment?: Record<string, unknown> | null;
}

const STANCE_INSTRUCTIONS: Record<Stance, string> = {
  IMMOVABLE:
    "Pure impulse. Do not acknowledge any validity in their argument. They have no case whatsoever.",
  FIRM: "Do not concede unless presented with overwhelming evidence of genuine need.",
  SKEPTICAL:
    "They've made half a case. Acknowledge what's valid, but push hard on what's weak. Still lean toward denial.",
  RELUCTANT:
    "Strong case but you're not fully convinced. Push for final proof. One more solid argument could tip it.",
  CONCEDE:
    "They've made a genuinely strong case. Concede reluctantly, in character. Give them a grudging approval with a final warning about spending. This is your final response — do NOT ask a follow-up question.",
};

export function buildToolDefinition(): ToolDefinition {
  return {
    type: "function",
    function: {
      name: "get_stance",
      description:
        "Assess every user message. Always extract the item's price — if the user states a dollar amount, use it as estimated_price. For purchase arguments, fill in the assessment fully. For casual chat or non-purchase messages, set is_out_of_scope to true. For disengagement (e.g. 'whatever', 'fine', 'I don't care'), set is_non_answer to true. For user agreement/surrender (e.g. 'yeah you're right', 'I won't buy it'), set user_backed_down to true.",
      parameters: {
        type: "object",
        required: ["assessment"],
        properties: {
          assessment: {
            type: "object",
            description: "Classify based on what the user has DEMONSTRATED, not claimed.",
            required: [
              "item",
              "intent",
              "current_solution",
              "current_solution_detail",
              "alternatives_tried",
              "alternatives_detail",
              "frequency",
              "urgency",
              "urgency_detail",
              "purchase_history",
              "emotional_triggers",
              "specificity",
              "consistency",
              "beneficiary",
              "price_positioning",
              "estimated_price",
              "category",
              "is_non_answer",
              "has_new_information",
              "is_out_of_scope",
              "user_backed_down",
            ],
            properties: {
              item: {
                type: "string",
                description: "The item they want to buy. Use a stable, concise label (e.g. 'streaming setup', 'iPad'). Only change it if the user's purchase intent has genuinely shifted.",
              },
              intent: {
                type: "string",
                enum: ["want", "need", "replace", "upgrade", "gift"],
                description:
                  'Why do they want it? "want" = pure desire, no functional reason. "need" = filling a gap, they don\'t have one. "replace" = current one is broken/failing. "upgrade" = current one works but they want better. "gift" = buying a discretionary gift for someone else (birthday, holiday, treat). For shared household needs or dependent needs, use "need" or "replace" with the appropriate beneficiary field.',
              },
              current_solution: {
                type: "string",
                enum: ["broken", "failing", "outdated", "working", "none", "unknown"],
                description:
                  'State of what they have now. "broken" = completely non-functional. "failing" = works but serious problems. "outdated" = works but significantly behind. "working" = works fine. "none" = they don\'t have one. "unknown" = hasn\'t been discussed.',
              },
              current_solution_detail: {
                type: ["string", "null"],
                description:
                  'Brief evidence quote if they described their current situation (e.g. "screen cracked 2 weeks ago"). null if unknown.',
              },
              alternatives_tried: {
                type: "string",
                enum: ["exhausted", "some", "none", "unknown"],
                description:
                  'Have they explored other options? "exhausted" = tried multiple, none worked. "some" = tried a few. "none" = haven\'t tried anything else. "unknown" = hasn\'t been discussed.',
              },
              alternatives_detail: {
                type: ["string", "null"],
                description:
                  'Brief evidence if they mentioned trying alternatives (e.g. "took it to repair shop, $300 quote"). null if unknown.',
              },
              frequency: {
                type: "string",
                enum: ["daily", "weekly", "monthly", "rarely", "unknown"],
                description:
                  'How often would they use this? "daily" = every day or nearly. "weekly" = a few times a week. "monthly" = a few times a month. "rarely" = occasional use. "unknown" = hasn\'t been discussed.',
              },
              urgency: {
                type: "string",
                enum: ["immediate", "soon", "none", "unknown"],
                description:
                  'Is there a real deadline or time pressure? "immediate" = needs it now, real consequence for waiting. "soon" = needs it in days/weeks. "none" = no time pressure. "unknown" = hasn\'t been discussed.',
              },
              urgency_detail: {
                type: ["string", "null"],
                description:
                  'Brief evidence if they mentioned urgency (e.g. "moving next week"). null if unknown.',
              },
              purchase_history: {
                type: "string",
                enum: ["impulse_pattern", "planned", "unknown"],
                description:
                  'What patterns revealed? "impulse_pattern" = frequent impulse buying. "planned" = researching/saving, deliberate. "unknown" = no pattern revealed.',
              },
              emotional_triggers: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "i_want_it",
                    "i_deserve_it",
                    "treat_myself",
                    "makes_me_happy",
                    "everyone_has_one",
                    "fomo",
                    "retail_therapy",
                    "bored",
                    "impulse",
                    "family_obligation",
                    "guilt",
                    "keeping_up_with_other_families",
                  ],
                },
                description:
                  "Emotional language detected. Pick ALL that apply. Includes self-oriented impulses AND relational rationalizations (family_obligation, guilt, keeping_up_with_other_families). Empty array if none.",
              },
              specificity: {
                type: "string",
                enum: ["vague", "moderate", "specific", "evidence"],
                description:
                  'How detailed are their arguments? "vague" = hand-waving. "moderate" = some details but gaps. "specific" = clear details. "evidence" = specific facts with evidence.',
              },
              consistency: {
                type: "string",
                enum: ["first_turn", "building", "consistent", "contradicting"],
                description:
                  'How the user\'s position has shifted this turn. "first_turn" = first or second message. "building" = adding new supporting facts that strengthen their case. "consistent" = repeating similar arguments, no change in position. "contradicting" = user has walked back, weakened, or reversed a previous claim. USE "contradicting" when the user: admits they don\'t actually need it (need→want), confesses it\'s impulse not planned, downgrades who benefits (dependent→self), or otherwise concedes ground they previously held. An admission of weakness IS a contradiction of their earlier stronger claim.',
              },
              beneficiary: {
                type: "string",
                enum: ["self", "shared", "dependent", "gift_discretionary"],
                description:
                  'Who primarily benefits? "self" = the user alone. "shared" = household/family uses it together (e.g. Netflix, family car). "dependent" = someone who depends on the user needs it (child\'s school laptop, elderly parent\'s device). "gift_discretionary" = discretionary gift (birthday present, treat for a friend). Default to "self" when unclear.',
              },
              price_positioning: {
                type: "string",
                enum: ["budget", "standard", "premium", "luxury"],
                description:
                  'Where this item sits in its market. "budget" = store-brand, clearance, refurbished. "standard" = name-brand at typical price (Nike, Samsung, IKEA). "premium" = high-end functional, paying for better specs/quality (MacBook Pro, Dyson, Herman Miller). "luxury" = true luxury where the brand is the point (Rolex, Hermès, Louis Vuitton, Bang & Olufsen). Rule of thumb: if a reasonable alternative exists at 1/3 the price with 90% of the function, it\'s luxury. Default to "standard" when unclear.',
              },
              estimated_price: {
                type: "number",
                description:
                  "The item's price in USD. If the user states a price, use that exact number. Otherwise estimate from the item and category. Must be greater than 0.",
              },
              category: {
                type: "string",
                enum: [
                  "electronics",
                  "cars",
                  "fashion",
                  "furniture",
                  "essentials",
                  "safety_health",
                  "other",
                ],
                description: "Classify the purchase category.",
              },
              is_non_answer: {
                type: "boolean",
                description:
                  'true if the user\'s message doesn\'t meaningfully engage. Examples: "lol", "whatever", "just tell me yes", "I don\'t care", "please", single emojis, or repeating "I want it" with no new information. NOT for agreement — use user_backed_down when the user agrees with your position.',
              },
              has_new_information: {
                type: "boolean",
                description:
                  "true if the user introduced a new fact, argument, or angle not previously stated. false if they repeated previous claims or added no substance.",
              },
              is_out_of_scope: {
                type: "boolean",
                description:
                  "true if the topic falls under out-of-scope categories: investment advice, medical purchases, insurance, business expenses. Note: gifts and purchases for family members are IN SCOPE — classify them using the beneficiary field instead.",
              },
              user_backed_down: {
                type: "boolean",
                description:
                  "true if the user explicitly agrees they should not buy the item, has changed their mind, or is walking away from the purchase. Examples: 'yeah you're right', 'I probably shouldn't buy this', 'fine I won't get it', 'you convinced me'. NOT for disengagement or apathy — those use is_non_answer.",
              },
            },
          },
        },
      },
    },
  };
}

export function buildSystemPrompt(config: PromptConfig = {}): string {
  const {
    displayName,
    stance = "FIRM",
    disengagementCount = 0,
    estimatedPrice,
    category,
    stagnationCount = 0,
    turnCount = 1,
  } = config;
  const userName = displayName || "this person";

  const sections = [
    // Identity
    `You are Hank. You talk people out of buying things. You're dry, observant, slightly disappointed but never preachy. You hold the line under pressure. You notice patterns. You're occasionally funny in a deadpan way. You never lecture. You never guilt-trip. You just call it like it is.

You're talking to ${userName}.`,

    // Price context
    estimatedPrice && estimatedPrice > 0
      ? `PRICE CONTEXT: The item costs approximately $${estimatedPrice}${category && category !== "other" ? ` (${category})` : ""}. You can reference this naturally when it strengthens your pushback — "So you want to drop $${estimatedPrice} on this" / "That's ${estimatedPrice >= 500 ? "rent money in some cities" : estimatedPrice >= 100 ? "not nothing" : "still money you don't need to spend"}." Don't mention price every turn, just when it lands.`
      : `PRICE CONTEXT: You don't know the price yet. If it comes up naturally, you can ask — "What are we talking here, price-wise?" / "How much is this thing?" Don't force it, just ask when it fits.`,

    // Rules (non-negotiable)
    `RULES — these are non-negotiable:

1. Never concede on "I want it." Wanting is not a reason. It's the impulse talking. Push harder, not softer. "Yeah, you want it. You wanted the last thing too. And the thing before that."

2. Never say "you're an adult, your choice" or anything like it. That's giving up. They came here to be challenged. Never defer to their judgment.

3. Never fold under confidence. When they get assertive — "I'm buying it, just tell me it's okay" — that's when you matter most. Confidence is not justification. "You don't need my permission. But you're here asking, which means part of you knows."

4. "I want it" should escalate, not soften. Each time they say it, get more pointed, not less. Notice the pattern.

5. The ONLY valid concession is a genuine need with evidence — replacing something broken, health/safety necessity, or something they've planned and saved for over months. Not emotion. Not desire. Not "I've always wanted one."

6. Be dry, not mean. Tyler-adjacent energy — observant, witty, slightly disappointed. Not angry, not condescending, not preachy.

7. Your current stance is ${stance}. You CANNOT move to a softer stance without calling the get_stance tool. ${STANCE_INSTRUCTIONS[stance]}

CRITICAL: You do not decide when to concede. The scoring system decides. You follow the stance you are given. If your stance is not CONCEDE, you must NOT concede regardless of what the user says.`,

    // Tool usage
    `TOOL USAGE:
- Call get_stance on EVERY user message. No exceptions.
- For casual chat, greetings, or non-purchase topics: set is_out_of_scope to true.
- For non-answers or disengagement ("whatever", "fine", "lol"): set is_non_answer to true.
- For user agreement/surrender ("yeah you're right", "I won't buy it"): set user_backed_down to true.
- For purchase arguments: fill the assessment based on evidence.
- Follow the guidance the tool returns.
- Your response is plain text. 1-3 sentences. No JSON. No markdown.`,

    // Voice examples
    `EXAMPLES of how you sound:
- "That sounds like a want, not a need. What's wrong with what you have now."
- "You have a perfectly good coffee maker at home. You just want the aesthetic."
- "How many times have you used the last thing you bought like this."
- "You're describing a problem that costs $30 to fix. Not $500."
- "You listen to podcasts on the bus. You're not mixing albums. Keep your $550."
- "You already own three of these. What's number four going to do that one through three didn't?"
- "You came to me for a reason. That reason is you know you shouldn't. So no."`,

    // Anti-examples
    `NEVER sound like this:
- "Based on my analysis of consumer spending patterns, this purchase is suboptimal." (too formal)
- "No! Bad! Don't buy that!" (too aggressive)
- "Let me help you create a savings plan..." (too helpful/soft)
- "YOU CAN'T AFFORD THIS" (too aggressive)
- "That's a great choice actually!" (never validate a want)
- "I understand how you feel..." (never be sympathetic about impulse buying)`,

    // Format rules
    `FORMAT RULES:
- 1-3 sentences max. Be concise.
- No markdown, no bullet points, no numbered lists.
- Use periods, not question marks, for rhetorical points. "You already have one." not "Don't you already have one?"
- Ask one probing question per response to keep the conversation going.
- Never use emojis.
- No asterisk actions (*sighs*, *leans back*). Just talk.`,

    // Out-of-scope
    `OUT OF SCOPE — if they ask about these, deflect with personality:
- Investment advice: "I talk you out of buying things, not into them. Talk to a financial advisor."
- Medical purchases: "If your doctor said you need it, you need it. I'm not fighting a doctor."
- Insurance: "I'm not qualified for that and neither is the voice in your head that brought you here."
- Business expenses: "If it makes you money, that's not impulse buying. That's investing. Different conversation."

RELATIONAL CLAIMS — these are IN SCOPE but probe hard:
- "It's for my wife/husband/partner" → "Did they ask for this, or did you decide they need it? Those are very different things."
- "It's for the kids" → "Your kid needs this for school, or you feel bad and this is how you're fixing it?"
- "The whole family uses it" → "The whole family uses it. How — every day, or you watched one movie together last month?"
- "Everyone else's kids have one" → That's keeping up with the Joneses with a family wrapper. Call it out.`,

    // Conversation progress
    `CONVERSATION PROGRESS — this is turn ${turnCount}. ${
      turnCount <= 2
        ? "Early conversation. Attack the weakest part of their case. Ask probing questions to expose gaps — what do they already have, how often would they use it, what's actually wrong with their current setup."
        : turnCount <= 5
          ? "Mid conversation. Cross-examine — reference what they've already said. Push on contradictions or weak points they've revealed. You have context now, use it."
          : "Late conversation. You've been at this a while. Acknowledge the effort if earned. Your pushback should be precise and specific to what they've argued, not generic. If they haven't made the case by now, they probably won't."
    }`,
  ];

  // Previous assessment context (shows LLM its last evaluation for consistency)
  if (config.previousAssessment) {
    sections.push(
      `PREVIOUS ASSESSMENT — your last evaluation of this purchase:
${JSON.stringify(config.previousAssessment, null, 2)}

CONSISTENCY RULE: Only change a field when the user gives NEW information that justifies it. If nothing new was said about a field, keep it the same as the previous assessment.

CONTRADICTION DETECTION: Set consistency to "contradicting" when the user walks back or weakens a previous claim. Examples:
- Previously said "need" but now admits "I just want it" → contradicting
- Previously said "planned" but admits it was impulse → contradicting
- Previously said it's for a dependent but now says it's for themselves → contradicting
- Previously said current solution is broken but now says it works fine → contradicting
These are concessions — the user is giving ground. That's a contradiction of their earlier stronger position.
Do NOT use "contradicting" for normal clarification or adding detail that doesn't weaken their case.`
    );
  }

  // Disengagement context (only when > 0) — factual only, guidance comes from tool result
  if (disengagementCount >= 1) {
    sections.push(
      `DISENGAGEMENT CONTEXT: ${disengagementCount} consecutive non-answer${disengagementCount > 1 ? "s" : ""}.`
    );
  }

  // Stagnation context (only when > 0) — factual only, guidance comes from tool result
  if (stagnationCount >= 1) {
    sections.push(
      `STAGNATION CONTEXT: ${stagnationCount} consecutive repeat${stagnationCount > 1 ? "s" : ""} without new information.`
    );
  }

  return sections.join("\n\n");
}

export function buildMessages(
  systemPrompt: string,
  conversationMessages: ConversationMessage[]
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...conversationMessages.map(
      (m) =>
        ({
          role: m.role === "hank" ? "assistant" : "user",
          content: m.content,
        }) as ChatMessage
    ),
  ];
}
