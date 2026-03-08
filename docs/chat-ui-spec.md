# Chat UI Specification

Detailed component spec and layout guide for Phase 2c — the conversation interface.

References: `docs/style-guide.html` for design tokens, `docs/hank-spec.md` for voice, `docs/hank-scoring-engine.md` for verdict states.

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      viewport                           │
│  ┌──────────┐  ┌────────────────────────────────────┐   │
│  │          │  │                                    │   │
│  │ Sidebar  │  │         Chat Content               │   │
│  │  280px   │  │     max-width: 720px               │   │
│  │          │  │     centered in remaining           │   │
│  │          │  │                                    │   │
│  │          │  │                                    │   │
│  │          │  │                                    │   │
│  └──────────┘  └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- **Sidebar**: 280px fixed width, collapsible
- **Chat area**: fills remaining space, content max-width 720px centered
- **Breakpoint**: 768px (Tailwind `md`)
- **Mobile top bar**: 56px height

---

## Responsive Behavior

| Element | Desktop (>=768px) | Mobile (<768px) |
|---|---|---|
| Sidebar | Inline, collapsible via toggle | Hidden, overlay drawer from left |
| Chat content | Centered in remaining space, max-w 720px | Full width, 16px horizontal padding |
| Top bar | Hidden (sidebar has logo) | Visible: hamburger + logo + credits badge |
| Input bar | Sticky bottom of chat area, 16px padding | Sticky bottom, safe-area-inset-bottom |
| Verdict card | Inline in message flow | Same, full width |

---

## State Mockups

### 1. Desktop — Sidebar Open

```
┌──────────────────────────────────────────────────────────────┐
│ ┌─────────────┐  ┌──────────────────────────────────────┐    │
│ │ Ask Hank    │  │                                      │    │
│ │             │  │   ┌────────────────────────────┐     │    │
│ │ [+] New     │  │   │ I want to buy AirPods Max  │──┐  │    │
│ │             │  │   └────────────────────────────┘  │  │    │
│ │ HISTORY     │  │                           (user)  │  │    │
│ │             │  │   ┌────────────────────────────┐  │  │    │
│ │ x AirPods   │  │   │ You already own headphones.│  │  │    │
│ │   Max       │  │   │ What's wrong with them?    │  │  │    │
│ │   3d DENIED │  │   └────────────────────────────┘  │  │    │
│ │             │  │   (hank)                          │  │    │
│ │ x Nike Dunk │  │                                   │  │    │
│ │   5d DENIED │  │   ┌────────────────────────────┐  │  │    │
│ │             │  │   │ Nothing, but these are way  │──┘  │    │
│ │ ✓ Winter    │  │   │ better.                    │     │    │
│ │   Coat      │  │   └────────────────────────────┘     │    │
│ │   1w APPR.  │  │                                      │    │
│ │             │  │   ┌────────────────────────────┐     │    │
│ │             │  │   │ So your current ones work   │     │    │
│ │             │  │   │ fine. That's a want, not a  │     │    │
│ │─────────────│  │   │ need. Keep your $549.       │     │    │
│ │ Hank saved  │  │   └────────────────────────────┘     │    │
│ │ you $847    │  │                                      │    │
│ │─────────────│  │  ┌──────────────────────────────┐    │    │
│ │ JM Settings │  │  │ [cam] What do you want? [->] │    │    │
│ └─────────────┘  └──┴──────────────────────────────┴────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 2. Desktop — Sidebar Collapsed

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──┐     ┌──────────────────────────────────────────┐        │
│ │≡ │     │                                          │        │
│ └──┘     │      ┌────────────────────────────┐      │        │
│          │      │ I want to buy AirPods Max  │──┐   │        │
│          │      └────────────────────────────┘  │   │        │
│          │                              (user)  │   │        │
│          │      ┌────────────────────────────┐  │   │        │
│          │      │ You already own headphones.│  │   │        │
│          │      │ What's wrong with them?    │  │   │        │
│          │      └────────────────────────────┘  │   │        │
│          │      (hank)                          │   │        │
│          │                                      │   │        │
│          │                                      │   │        │
│          │                                      │   │        │
│          │                                      │   │        │
│          │                                      │   │        │
│          │     ┌──────────────────────────────┐ │   │        │
│          │     │ [cam] What do you want? [->] │ │   │        │
│          └─────┴──────────────────────────────┴─┘   │        │
└──────────────────────────────────────────────────────────────┘
```

Chat content re-centers in the wider available space. Hamburger icon in top-left toggles sidebar back open.

### 3. Mobile — Fullscreen Chat

```
┌────────────────────────┐
│ [≡]  Ask Hank   [2 cr] │  <- 56px top bar
│────────────────────────│
│                        │
│ ┌────────────────────┐ │
│ │ I want AirPods Max │ │
│ └────────────────────┘ │
│                (user)  │
│                        │
│ ┌────────────────────┐ │
│ │ You already own    │ │
│ │ headphones. What's │ │
│ │ wrong with them?   │ │
│ └────────────────────┘ │
│ (hank)                 │
│                        │
│ ┌────────────────────┐ │
│ │ Nothing, but these │ │
│ │ are way better.    │ │
│ └────────────────────┘ │
│                        │
│────────────────────────│
│ [cam] What do you w [>]│  <- sticky bottom
└────────────────────────┘
```

### 4. Mobile — Sidebar Drawer

```
┌────────────────────────┐
│ Ask Hank          [X]  │
│────────────────────────│
│                        │
│ [+] New conversation   │
│                        │
│ HISTORY                │
│                        │
│ x  AirPods Max         │
│    3d ago    DENIED     │
│                        │
│ x  Nike Dunk Low       │
│    5d ago    DENIED     │
│                        │
│ ✓  Winter Coat         │
│    1w ago    APPROVED   │
│                        │
│ x  Espresso Machine    │
│    2w ago    DENIED     │
│                        │
│────────────────────────│
│ Hank saved you $847    │
│────────────────────────│
│ JM              Settings│
└────────────────────────┘
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  <- scrim overlay
│▒▒▒(rest of chat dimmed)│     over chat area
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
```

Drawer slides from left over chat. Scrim (semi-transparent black) covers chat area. Tap scrim or X to close.

### 5. Onboarding — Display Name

Shown once after first sign-in if `displayName` is null.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│            ┌──────────────────────────────┐              │
│            │                              │              │
│            │     What should Hank         │              │
│            │     call you?                │              │
│            │                              │              │
│            │  ┌──────────────────────┐    │              │
│            │  │ Your first name      │    │              │
│            │  └──────────────────────┘    │              │
│            │                              │              │
│            │      [ Continue ]            │              │
│            │                              │              │
│            │  Skip — Hank doesn't care    │              │
│            │                              │              │
│            └──────────────────────────────┘              │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Card: max-width 380px, centered vertically and horizontally
- Background: `--bg`
- Card: `--bg-card`, 16px radius, `--shadow-lg`
- Input: standard auth-input styling
- "Continue" button: `btn-primary`, full-width
- "Skip" link: `--text-secondary`, ghost style, sets displayName to "friend" or similar default
- After submit, calls `setDisplayName` mutation, then navigates to chat

### 6. Active Conversation

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              ┌──────────────────────────────┐          │
│              │ I want to buy a standing     │          │
│              │ desk. My back is killing me. │──┐       │
│              └──────────────────────────────┘  │       │
│                                        (user)  │       │
│                                                │       │
│  ┌──────────────────────────────┐              │       │
│  │ Have you tried not sitting   │              │       │
│  │ like a question mark? What's │              │       │
│  │ your current desk setup?     │              │       │
│  └──────────────────────────────┘              │       │
│  (hank)                                        │       │
│                                                │       │
│              ┌──────────────────────────────┐  │       │
│              │ Standard IKEA desk. I've had │  │       │
│              │ it for 6 years. No height    │──┘       │
│              │ adjustment.                  │          │
│              └──────────────────────────────┘          │
│                                                        │
│  ┌──────────────────────────────┐                      │
│  │ Six years on an IKEA desk    │                      │
│  │ and now your back hurts.     │                      │
│  │ Shocking. How often are you  │                      │
│  │ actually at this desk?       │                      │
│  └──────────────────────────────┘                      │
│  (hank)                                                │
│                                                        │
│  ┌───┐                                                 │
│  │...│  <- typing indicator                            │
│  └───┘                                                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [cam]  8 hours a day, 5 days a week. I w  [->]  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- Messages alternate: user right-aligned (orange), Hank left-aligned (white/bordered)
- Hank messages support **inline markdown**: `**bold**` renders in `--accent` color (from Hopshelf AdvisorChat pattern)
- Auto-scroll to latest message
- **Scroll-to-bottom button**: appears when user scrolls up >200px from bottom, circular, bottom-right of message area, fades in/out
- Typing indicator appears while waiting for Hank's response
- Input bar textarea auto-resizes: min-height 44px, max-height 30vh on mobile / 200px on desktop, then scrolls internally

### 7. Verdict — Denied and Approved

**Denied (common):**
```
┌────────────────────────────────────────────────┐
│                                                │
│  ...previous messages...                       │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │         CASE CLOSED — DENIED             │  │
│  │                                          │  │
│  │  "You came to me with 'I want it' and    │  │
│  │   you're leaving with 'I want it.'       │  │
│  │   Nothing changed. $549 saved."          │  │
│  │                                          │  │
│  │  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │   Share    │  │  New conversation  │  │  │
│  │  └────────────┘  └────────────────────┘  │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

- Border: 1.5px `--denied` (#C65A2E)
- Background: `rgba(198, 90, 46, 0.08)`
- Label: 0.8rem, 700 weight, uppercase, 0.12em tracking, `--denied` color
- Quote: 0.9rem, italic, `--text-secondary`
- Buttons: "Share" (secondary) + "New conversation" (primary)

**Approved (rare):**
```
┌──────────────────────────────────────────────┐
│                                              │
│         CASE CLOSED — APPROVED               │
│                                              │
│  "Your laptop is 7 years old and crashes     │
│   daily. I've grilled you for 5 messages     │
│   and your story held up. Get the new one."  │
│                                              │
│  ┌────────────┐  ┌────────────────────┐      │
│  │   Share    │  │  New conversation  │      │
│  └────────────┘  └────────────────────┘      │
│                                              │
└──────────────────────────────────────────────┘
```

- Border: 1.5px `--approved` (#5A8A5E)
- Background: `rgba(90, 138, 94, 0.08)`
- Same structure, different color

### 8. Empty State — No Conversations

```
┌──────────────────────────────────────────────────────────┐
│ ┌─────────────┐  ┌──────────────────────────────────┐    │
│ │ Ask Hank    │  │                                  │    │
│ │             │  │                                  │    │
│ │ [+] New     │  │                                  │    │
│ │             │  │    ┌──────────────────────┐      │    │
│ │ HISTORY     │  │    │  Hank saved you $0   │      │    │
│ │             │  │    └──────────────────────┘      │    │
│ │ (no items)  │  │                                  │    │
│ │             │  │    Nothing here yet.              │    │
│ │             │  │                                  │    │
│ │             │  │    Next time you want to buy     │    │
│ │             │  │    something, tell Hank.         │    │
│ │             │  │    He'll talk you out of it.     │    │
│ │             │  │                                  │    │
│ │             │  │    [ Talk to Hank ]              │    │
│ │             │  │                                  │    │
│ │─────────────│  │                                  │    │
│ │ Hank saved  │  │                                  │    │
│ │ you $0      │  │                                  │    │
│ │─────────────│  │                                  │    │
│ │ JM Settings │  │                                  │    │
│ └─────────────┘  └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

- Saved counter shows $0
- Sidebar history section is empty
- Center area shows empty state card (from style guide)
- "Talk to Hank" button starts a new conversation

---

## Component Specs

### Chat Bubble

```
User bubble:
  background:    var(--user-bubble)     #C65A2E
  color:         var(--user-text)       #F4EFEA
  border-radius: 16px, bottom-right 4px
  max-width:     85%
  padding:       12px 16px
  font-size:     0.95rem
  alignment:     flex-end (right)

Hank bubble:
  background:    var(--hank-bubble)     #FFFFFF (light) / #2A2520 (dark)
  color:         var(--hank-text)       #1F1F1F (light) / #F4EFEA (dark)
  border:        1px solid var(--border)
  border-radius: 16px, bottom-left 4px
  box-shadow:    var(--shadow)
  max-width:     85%
  padding:       12px 16px
  font-size:     0.95rem
  alignment:     flex-start (left)
```

### Input Bar

```
Container:
  position:    sticky bottom
  padding:     12px 16px
  padding-bottom: max(12px, env(safe-area-inset-bottom))
  background:  var(--bg) with backdrop-blur
  border-top:  1px solid var(--border)
  display:     flex, gap 8px, align-items end

Camera button:
  40x40px, border-radius 10px
  border: 1.5px solid var(--border)
  icon: camera SVG, 18px
  hover: border-color var(--accent), color var(--accent)

Textarea:
  flex: 1
  font-family: DM Sans
  font-size: 0.9rem
  padding: 10px 16px
  border-radius: 12px
  border: 1.5px solid var(--border)
  background: var(--input-bg)
  min-height: 44px
  max-height: 30vh (mobile) / 200px (desktop)
  resize: none
  placeholder: "What do you want to buy?"
  focus: border-color var(--accent)

Send button:
  40x40px, border-radius 10px
  background: var(--accent)
  color: #F4EFEA
  icon: send arrow SVG, 18px
  hover: background var(--accent-hover)
  disabled: opacity 0.4, pointer-events none (when textarea empty)

Credits indicator (above input, Hopshelf pattern):
  Visible during active conversation: "1 credit will be used" (subtle, --text-secondary)
  Visible when low: "Last free credit today" in --denied color
  font-size: 0.75rem
  text-align: center
  padding: 4px 0
```

### Typing Indicator

```
Container:
  display: flex, gap 4px
  padding: 12px 16px
  background: var(--hank-bubble)
  border-radius: 16px, bottom-left 4px
  border: 1px solid var(--border)
  box-shadow: var(--shadow)
  width: fit-content

Dots (3):
  width: 8px, height: 8px
  border-radius: 50%
  background: var(--text-secondary)
  animation: typing 1.4s ease-in-out infinite
  nth-child(2): delay 0.2s
  nth-child(3): delay 0.4s

@keyframes typing:
  0%, 60%, 100%: opacity 0.3, translateY(0)
  30%: opacity 1, translateY(-4px)
```

### Verdict Card

```
Container:
  text-align: center
  padding: 20px
  border-radius: 12px
  margin: 16px 0

Denied variant:
  background: rgba(198, 90, 46, 0.08)
  border: 1.5px solid var(--denied)

Approved variant:
  background: rgba(90, 138, 94, 0.08)
  border: 1.5px solid var(--approved)

Label:
  font-size: 0.8rem
  font-weight: 700
  text-transform: uppercase
  letter-spacing: 0.12em
  margin-bottom: 6px
  color: var(--denied) or var(--approved)

Quote:
  font-size: 0.9rem
  font-style: italic
  color: var(--text-secondary)
  margin-bottom: 16px

Actions:
  display: flex, gap 12px, justify-content center
  "Share" — btn-secondary
  "New conversation" — btn-primary
```

### History Item

```
Container:
  display: flex, align-items center, gap 16px
  padding: 16px
  background: var(--bg-card)
  border-radius: 12px
  border: 1px solid var(--border)
  box-shadow: var(--shadow)
  cursor: pointer
  hover: border-color var(--accent)

Icon:
  40x40px, border-radius 10px
  denied: background rgba(198,90,46,0.1), content "x" glyph
  approved: background rgba(90,138,94,0.1), content checkmark glyph

Details:
  flex: 1, min-width 0
  Name: 0.9rem, 600 weight, truncate with ellipsis
  Meta: 0.75rem, var(--text-secondary), relative date + amount saved

Verdict badge:
  0.7rem, 600 weight, uppercase, 0.05em tracking
  padding: 4px 10px, border-radius 6px
  denied: color var(--denied), bg rgba(198,90,46,0.1)
  approved: color var(--approved), bg rgba(90,138,94,0.1)
```

### Sidebar

```
Container:
  width: 280px
  height: 100vh
  position: fixed left
  background: var(--bg-card)
  border-right: 1px solid var(--border)
  display: flex, flex-direction column
  z-index: 40

Header:
  padding: 20px
  "Ask Hank" — h1 style, accent on "Hank"

New conversation button:
  margin: 0 16px
  btn-primary, full-width
  "New conversation"

History section:
  flex: 1, overflow-y auto
  padding: 16px
  "HISTORY" label: section-title style (0.75rem, 600, uppercase, accent)
  List of history items (compact variant, no box-shadow, border-bottom instead)

Saved counter:
  padding: 16px
  border-top: 1px solid var(--border)
  "Hank saved you" label + "$X" amount

Footer:
  padding: 16px
  border-top: 1px solid var(--border)
  display: flex, justify-content space-between, align-items center
  Left: avatar circle (32px, initials, var(--accent) bg) + display name
  Right: "Settings" ghost link
```

### Mobile Top Bar

```
Container:
  height: 56px
  padding: 0 16px
  display: flex, align-items center, justify-content space-between
  background: var(--bg)
  border-bottom: 1px solid var(--border)
  position: sticky top
  z-index: 30

Left: hamburger icon button (24px)
Center: "Ask Hank" — 1rem, 700 weight
Right: credits badge component
```

### Scroll-to-Bottom Button

```
Appears when user scrolls >200px from bottom of message list.

Container:
  position: absolute, bottom 80px, right 16px (above input bar)
  width: 36px, height: 36px
  border-radius: 50%
  background: var(--bg-card)
  border: 1px solid var(--border)
  box-shadow: var(--shadow-lg)
  icon: chevron-down, 16px, var(--text-secondary)
  cursor: pointer
  z-index: 10

Animation:
  fade in/out with Framer Motion (opacity 0→1, scale 0.9→1, 150ms)

Behavior:
  click: smooth-scroll to bottom of messages
  hides when user is within 200px of bottom
```

### Credits Badge

```
Container:
  display: inline-flex, align-items center, gap 6px
  font-size: 0.8rem, font-weight 600
  color: var(--text-secondary)
  background: var(--bg-surface)
  padding: 6px 12px
  border-radius: 99px
  border: 1px solid var(--border)

Dot:
  8x8px, border-radius 50%
  background: var(--accent)

Text: "2 credits left today" / "12 credits"
```

### Saved Counter

```
Container:
  display: inline-flex, align-items baseline, gap 8px
  background: var(--bg-card)
  padding: 16px 24px
  border-radius: 12px
  border: 1px solid var(--border)
  box-shadow: var(--shadow)

Label: 0.8rem, var(--text-secondary), 500 weight, "Hank saved you"
Amount: 2rem, 700 weight, var(--accent), -0.03em tracking, "$847"
```

---

## Animations (Framer Motion)

### Sidebar Toggle (Desktop)

```tsx
// Sidebar container
<motion.aside
  animate={{ width: isOpen ? 280 : 0 }}
  transition={{ duration: 0.25, ease: "easeInOut" }}
/>

// Chat area adjusts via CSS flex — no animation needed, layout reflow handles it
```

### Mobile Drawer

```tsx
// Overlay scrim
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 0.5 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="fixed inset-0 bg-black z-40"
  onClick={onClose}
/>

// Drawer panel
<motion.aside
  initial={{ x: "-100%" }}
  animate={{ x: 0 }}
  exit={{ x: "-100%" }}
  transition={{ duration: 0.25, ease: "easeOut" }}
  className="fixed left-0 top-0 h-full w-[280px] z-50"
/>
```

### Message Appear

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>
```

### Verdict Reveal

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 24,
    delay: 0.3,
  }}
/>
```

### Typing Dots

Pure CSS, no Framer Motion needed — matches style guide animation:

```css
@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

.typing-dot {
  animation: typing 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
```

---

## State Management

### Client State (React / useState / zustand)

| State | Type | Purpose |
|---|---|---|
| `sidebarOpen` | boolean | Sidebar visibility toggle |
| `inputText` | string | Current textarea content |
| `isComposing` | boolean | IME composition guard |

### Convex (Server State — reactive queries)

| Query / Mutation | Purpose |
|---|---|
| `currentUser` | User profile (displayName, email) |
| `setDisplayName` | Onboarding name submission |
| `listConversations` | Sidebar history (future) |
| `getConversation` | Current conversation messages (future) |
| `sendMessage` | User sends a message (future) |

The chat interface reads all conversation data reactively from Convex. No local caching of messages — Convex handles real-time sync.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus input (when not already focused) |
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Esc` | Close sidebar (mobile) / blur input |

---

## Accessibility

| Element | Role / ARIA |
|---|---|
| Sidebar | `<nav aria-label="Conversation history">` |
| Mobile drawer | `role="dialog"`, `aria-modal="true"` |
| Scrim | `aria-hidden="true"` |
| Chat area | `<main role="log" aria-live="polite">` |
| Message | `role="article"` with `aria-label="Hank said..."` or `aria-label="You said..."` |
| Input | `aria-label="Message input"` |
| Send button | `aria-label="Send message"` |
| Camera button | `aria-label="Attach photo"` |
| Verdict card | `role="status"` |
| Credits badge | `aria-label="2 credits remaining today"` |

---

## Edge Cases

### Out of Credits

When user has 0 credits and tries to send:

```
┌────────────────────────────────────────────┐
│                                            │
│  You're out of credits for today.          │
│                                            │
│  Free credits reset at midnight, or you    │
│  can buy more.                             │
│                                            │
│       [ Buy Credits ]                      │
│                                            │
└────────────────────────────────────────────┘
```

- Appears inline in chat area where the next message would be
- Input bar disabled with placeholder "Out of credits"
- Credits badge shows "0 credits" with dot dimmed

### Network Error (Retry Countdown — Hopshelf pattern)

```
┌────────────────────────────────────────────┐
│  Something went wrong. Retrying in 3s...   │
│                          [ Retry now ]      │
└────────────────────────────────────────────┘
```

- Appears as a small inline banner below the last message
- Auto-retries with countdown (3s, then 5s, then 10s — exponential backoff, 3 attempts max)
- "Retry now" button to skip the countdown
- After 3 failed attempts: static message "Could not reach Hank. Check your connection." with manual retry button
- Input bar remains enabled

### Long Messages

- User messages: no hard limit, but textarea maxes at 4 lines visible then scrolls
- Hank messages: rendered in full, word-wrap as normal
- History item names: truncate with ellipsis (single line)

### Conversation in Progress

- Input is disabled while Hank is "typing" (waiting for AI response)
- Send button shows a small spinner or goes disabled
- User cannot send until response is complete

### Post-Verdict State

- After verdict, input bar is hidden (conversation is closed)
- Two buttons appear in verdict card: "Share" and "New conversation"
- History updates immediately with verdict badge

---

## Component File Structure

```
src/
  components/
    chat/
      ChatScreen.tsx         Main chat layout (sidebar + content)
      MessageList.tsx         Scrollable message area
      MessageBubble.tsx       Single message (user or Hank, renders inline markdown)
      TypingIndicator.tsx     Three-dot animation
      ChatInput.tsx           Camera + textarea + send
      VerdictCard.tsx         Denied/approved result card
    sidebar/
      Sidebar.tsx             Desktop sidebar container
      MobileDrawer.tsx        Mobile overlay drawer
      SidebarHeader.tsx       Logo + new conversation button
      HistoryList.tsx         List of past conversations
      HistoryItem.tsx         Single history entry
      SidebarFooter.tsx       Avatar + name + settings
      SavedCounter.tsx        "Hank saved you $X"
    onboarding/
      DisplayNameCard.tsx     "What should Hank call you?"
    shared/
      CreditsBadge.tsx        Credits remaining indicator
      MobileTopBar.tsx        Hamburger + logo + credits
      ScrollToBottom.tsx       Scroll-to-bottom FAB
      EmptyState.tsx          No conversations yet
```

---

## Design Tokens Reference

All values from `globals.css`:

```
Backgrounds:   --bg (#F4EFEA)  --bg-surface (#EDE7E0)  --bg-card (#FFFFFF)
Text:           --text (#1F1F1F)  --text-secondary (#7A7A7A)
Accent:         --accent (#C65A2E)  --accent-hover (#B04E26)  --accent-soft (rgba)
Border:         --border (#D9D3CC)
Chat:           --user-bubble (#C65A2E)  --hank-bubble (#FFFFFF)
Verdicts:       --denied (#C65A2E)  --approved (#5A8A5E)
Input:          --input-bg (#FFFFFF)
Shadows:        --shadow (1px 3px)  --shadow-lg (4px 12px)
Fonts:          DM Sans (body)  DM Mono (monospace accents)
```

Dark theme overrides all of the above — see `globals.css` `[data-theme="dark"]` block.
