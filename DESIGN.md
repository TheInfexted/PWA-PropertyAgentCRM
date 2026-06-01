---
name: Property CRM
description: A warm, dependable call-list CRM for property agents.
colors:
  terracotta: "#9e5733"
  terracotta-deep: "#854a2b"
  terracotta-wash: "#f7ece4"
  paper: "#faf8f5"
  card: "#fffefc"
  ink: "#2a2520"
  muted: "#5d564e"
  faint: "#837b71"
  line: "#e8e3dc"
  line-strong: "#d6cfc5"
  whatsapp-green: "#2f9c63"
  whatsapp-green-deep: "#248050"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-deep}"
  button-whatsapp:
    textColor: "{colors.whatsapp-green}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  input-text:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  status-pill:
    rounded: "{rounded.full}"
    padding: "4px 10px"
  nav-item-active:
    backgroundColor: "{colors.terracotta-wash}"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "0"
---

# Design System: Property CRM

## 1. Overview

**Creative North Star: "The Daylight Ledger"**

A warm paper logbook seen in good morning light. The agent opens it, runs down the list, and trusts that nothing is lost. The whole product is the daily worklist, so the system gets out of the way: warm neutrals that read like good paper, ink that sits softly rather than stabbing, and a single terracotta accent reserved for the one thing that matters on each row, the next action. Warmth comes from the paper tone, the softened corners, and plain human language, never from decoration.

It is precise where precision earns trust. Phone numbers line up in a tabular monospace column. Borders are single hairlines, not heavy frames. Alignment is exact even while the edges are soft. This is the "warm but precise" balance: friendly to sit in for an hour of calls, but never loose or toy-like.

It explicitly rejects four things. It is not a generic SaaS template (no cream-and-indigo, no rounded-card grids, no three-equal-feature columns). It is not a cluttered enterprise CRM (no wall of menus, no intimidating control panels). It is not a playful consumer app (no bright bubbles, no mascots, no emoji). It is not a flashy marketing site (no hero imagery, no gradient washes, no attention-grabbing motion).

**Key Characteristics:**
- Warm paper neutrals (OKLCH, tinted toward the terracotta hue), never pure white or black.
- One restrained accent: terracotta, used only for actions, current selection, and state.
- Tabular monospace for every phone number.
- Soft corners (8 to 20px), hairline borders, warm-tinted shadows.
- Calm at volume: a long call list stays legible and quiet.

## 2. Colors

A warm, paper-and-clay palette: tinted neutrals carrying the surface, one earthy accent carrying the action.

### Primary
- **Terracotta** (`#9e5733`, `oklch(0.505 0.135 42)`): The single accent. Primary buttons, the Call action, the active navigation item, focus rings, links. Deepened deliberately so white text on it clears WCAG AA (about 5.5:1).
- **Terracotta Deep** (`#854a2b`): Hover and pressed state for terracotta surfaces. Never a resting color.
- **Terracotta Wash** (`#f7ece4`): The soft tint behind the active nav item and other selected states. Pairs with Terracotta text at AA.

### Secondary
- **WhatsApp Green** (`#2f9c63`, deep `#248050`): The one semantic exception we keep, because users recognize it. Used only on the WhatsApp action. Not a brand color, not for decoration.

### Neutral
- **Paper** (`#faf8f5`): The content background. Warm off-white, the "ledger page".
- **Card** (`#fffefc`): The raised surface, one step lighter than Paper, for the sidebar, topbar, table, panels, and inputs.
- **Ink** (`#2a2520`): Primary text. A warm charcoal, never `#000`.
- **Muted** (`#5d564e`): Secondary text, labels, supporting copy.
- **Faint** (`#837b71`): Tertiary text, placeholders, the empty-cell dash.
- **Line** (`#e8e3dc`): Default hairline borders and dividers.
- **Line Strong** (`#d6cfc5`): Heavier separation and the auth-screen dot grid.

### Named Rules
**The One Action Rule.** Terracotta marks the next thing to do and nothing else. If more than roughly one tenth of a screen is terracotta, something decorative has crept in. Remove it.

**The Paper Rule.** Backgrounds are warm paper, surfaces are one step lighter. There is never a cool gray, never a pure white card, never `#000` text.

## 3. Typography

**Display / Body Font:** Geist (with system-ui, -apple-system fallback)
**Number / Label Font:** Geist Mono (with ui-monospace fallback)

**Character:** One humanist grotesk carries everything, headings through labels, so the tool feels coherent and unfussy. Geist Mono appears only where digits must align. The pairing reads modern and warm, not technical or corporate.

### Hierarchy
- **Display** (600, 1.5rem, 1.15, -0.02em): Page titles, for example the "Leads" heading.
- **Title** (600, 1.125rem, 1.3): Panel and lead-detail headings.
- **Body** (400 to 500, 0.875rem, 1.5): All standard UI text, table cells, form values. Prose caps at 65 to 75ch; data tables may run wider.
- **Label** (500, 0.6875rem, 0.06em, uppercase): Table column headers and field labels.
- **Mono** (500, 0.8125rem, tabular): Phone numbers only.

### Named Rules
**The Tabular Rule.** Every phone number renders in Geist Mono with `tabular-nums`. Numbers that do not line up are a bug.

## 4. Elevation

Mostly flat, with warm depth used sparingly. The interface is built from hairline borders and tonal layering (Paper behind, Card in front), not from shadows. Shadows appear only on things that genuinely float, and they are tinted warm (toward `rgba(67,47,33,...)`), never cool gray or black.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgba(67,47,33,0.05), 0 2px 8px rgba(67,47,33,0.06)`): The leads table and other resting surfaces. Barely-there lift.
- **Pop** (`box-shadow: 0 16px 36px -12px rgba(67,47,33,0.22), 0 2px 6px rgba(67,47,33,0.07)`): Modals, the lead-detail slide-over, and the auth cards. The only real elevation in the system.

### Named Rules
**The Hairline-First Rule.** Reach for a 1px Line border or a tonal step before reaching for a shadow. Shadows are for things that overlay content, nothing else.

## 5. Components

Components are "warm but precise": soft corners, exact alignment, full interaction states (default, hover, focus-visible, active, disabled, loading, empty).

### Buttons
- **Shape:** Softly rounded (10px, `rounded.md`).
- **Primary:** Terracotta background, Card-white text, `8px 16px` padding, 600 weight. Hover deepens to Terracotta Deep; active nudges down 1px.
- **Secondary / Ghost:** Text-only in Muted, hover to Ink. No competing fills. Cancel actions are ghost, never a second solid button.

### Buttons: Call and WhatsApp
- **Call:** A Primary (terracotta) button with a phone glyph. Calling is the headline job, so it owns the accent. Disabled state (no valid number) drops to a Paper background with Faint text.
- **WhatsApp:** A bordered button in WhatsApp Green with a chat glyph, `bg-wa/5` tint. Quieter than Call, recognizable by color.

### Chips: Status Pill
- **Style:** Fully rounded (`rounded.full`), a 6px color dot plus label, background and border mixed from the status color at 12% and 24%. The dot plus label means status never relies on color alone.

### Cards / Containers
- **Corner Style:** 14px (`rounded.lg`); modals and auth cards go to 20px (`rounded.xl`).
- **Background:** Card white on Paper.
- **Shadow Strategy:** Card shadow at rest, Pop only when floating. See Elevation.
- **Border:** 1px Line.
- **Internal Padding:** 24 to 28px on panels; table rows use `20px` horizontal, `14px` vertical.

### Inputs / Fields
- **Style:** 1px Line border, Card background, 10px radius, label always above the field (Label type, Muted).
- **Focus:** The global terracotta focus ring (2px, 2px offset). No glow.
- **Error:** Inline message below the field. Disabled fields drop to Paper.

### Navigation
- **Style:** A left sidebar on Card. Items are Muted text with an icon. Hover tints to Paper and Ink. The active item uses Terracotta Wash background with Terracotta text.

### Signature Component: The Leads Table
The daily driver. Hairline rows on Card, Faint uppercase column labels, Ink names, a Mono phone column, an inline status select, and right-aligned Call and WhatsApp. Hovering a row tints it Terracotta Wash at 40%. Loading shows skeleton rows (pulsing Line bars), not a spinner. Empty shows a composed prompt, not "no data".

## 6. Do's and Don'ts

### Do:
- **Do** keep terracotta for the next action, current selection, and state only. The One Action Rule.
- **Do** render every phone number in Geist Mono with tabular figures.
- **Do** use warm paper neutrals in OKLCH, tinted toward the terracotta hue.
- **Do** separate with 1px Line hairlines and tonal layering before reaching for a shadow.
- **Do** pair every status color with a dot and a text label, so status never depends on color alone.
- **Do** soften corners (8 to 20px) while keeping alignment mathematically exact.
- **Do** hold WCAG AA: white-on-terracotta clears it, focus rings are visible, motion respects prefers-reduced-motion.

### Don't:
- **Don't** ship the generic SaaS template: no cream-and-indigo, no rounded-card grids, no three-equal-feature columns.
- **Don't** drift toward a cluttered enterprise CRM: no wall of menus, no intimidating control panels.
- **Don't** go playful or consumer: no bright bubbles, no mascots, no emoji, no gamification.
- **Don't** add flashy-marketing motion: no hero imagery, no gradient washes, no attention-grabbing animation. This is a tool.
- **Don't** use `#000`, `#fff`, or cool grays. Don't use side-stripe (border-left) accents. Don't use gradient text. Don't reach for a modal when an inline panel will do.
