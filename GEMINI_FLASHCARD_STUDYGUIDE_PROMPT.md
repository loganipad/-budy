# Budy.Study — Flashcard & Study Guide UI Prompt (One-Shot for Google AI Studio)

> Paste this entire prompt into Google AI Studio to generate a polished, production-ready UI for the flashcard game and study guide download experience.

---

## Context

Budy.Study is a SAT/PSAT prep platform for high school students. The study page has three tabs: **Review Tests**, **Study Guides**, and **Flashcards**. Each tab shows a Finder-style topic grid (41 topics across Math and Reading & Writing). Clicking a topic opens a detail panel.

The target user is a **high school student** — design should be intuitive enough for a sixth grader to navigate without instructions.

---

## Design System

### Colors
| Token         | Value                    | Usage                          |
|---------------|--------------------------|--------------------------------|
| `--ink`       | `#0d1117`                | Page background (very dark navy) |
| `--panel`     | `rgba(20,29,45,.82)`     | Card/panel background          |
| `--line`      | `rgba(255,255,255,.1)`   | Borders                        |
| `--text`      | `#f8fafc`                | Primary text (near white)      |
| `--muted`     | `rgba(240,244,255,.66)`  | Secondary text                 |
| `--brand`     | `#1a56db`                | Primary blue                   |
| `--gold`      | `#f59e0b`                | Accent / streak / highlight    |
| `--green`     | `#10b981`                | Success / "Know it" state      |
| `--rose`      | `#f43f5e`                | Error / "Study more" state     |

### Typography
- **Headings & body:** `'Sora', system-ui, sans-serif` — weights 400–800
- **Italic accent:** `'Lora', serif` — italic 500
- Letter-spacing: tight for headings (`-0.04em`), slightly open for labels (`0.06–0.1em`)

### Component Patterns
- **Cards:** `border-radius: 22px`, glass-like backdrop with `backdrop-filter: blur(14px)`, faint white borders
- **Buttons:** pill-shaped (`border-radius: 999px`), 2px colored borders, subtle transparent backgrounds, bold 800-weight text
- **Chips/Tags:** small pill badges in uppercase with 0.08em letter-spacing
- **Transitions:** smooth 200–400ms eases, cubic-bezier for card flips

### Layout
- Max width: `1260px` centered
- Navy background with radial gradient glows (blue top-center, gold bottom-right)
- Grid-based layouts, responsive down to 380px mobile

---

## Flashcard Game UI

### Requirements
Build an interactive flashcard experience that feels like a game. Students select a topic, choose how many cards (4, 6, 8, 10, or 12), then play through the deck.

### Structure

1. **Header**: Topic name + card count selector (pill buttons)
2. **Progress bar**: Horizontal bar that fills as cards are reviewed, with `X / N` counter
3. **Streak indicator**: Shows "🔥 3 in a row!" when they're on a roll (gold text)
4. **3D Flip Card**:
   - Full-width card with perspective-based 3D flip animation
   - Front: blue-tinted gradient, shows label + question text + "Tap to flip" hint
   - Back: gold-tinted gradient, shows "Answer" label + explanation text
   - Click/tap anywhere on card to flip
5. **Action buttons** (below card):
   - When showing front: **🔄 Flip card** (blue pill) + **🔀 Shuffle** (neutral pill)
   - When showing back: **✓ Know it** (green pill) + **✗ Study more** (rose pill) + **🔀 Shuffle**
6. **Download PDF** button: always visible at bottom, generates a printable flashcard PDF on-the-fly

### Completion Screen
When all cards are reviewed:
- Large emoji (🎉 if ≥80% known, 💪 if ≥50%, 📚 otherwise)
- Encouraging title text
- Stats: Known count (green), Study More count (rose), Best Streak (gold)
- Actions: "🔄 Review missed cards" (only if any missed) + "🔁 Start over"

### Animations
- Card flip: `transform: rotateY(180deg)` with `transition: 0.5s cubic-bezier(.4,.2,.2,1)` and `transform-style: preserve-3d`
- Bounce on sort: `scale(1) → scale(1.08) → scale(0.96) → scale(1)` over 400ms
- Progress bar fill: `transition: width 0.4s ease`

---

## Study Guide Download UI

### Requirements
When a student opens a topic in the Study Guides tab, show a preview of the PDF study guide with a prominent download button.

### Structure
1. **Back button**: "← Back to topics"
2. **Hero section**:
   - Kicker: "Printable Study Guide" (uppercase label)
   - Title: Topic name
   - Description: Brief summary of what the PDF covers
   - Meta chips: "PDF preview", "5 pages", section name, domain name
   - **📥 Download PDF Study Guide** button (blue gradient pill, large, prominent)
3. **Page strip**: 5 mini-cards showing what each PDF page covers (Cover, Strategies, Worked Example, Practice Questions, Answer Key)
4. **Content preview**: Two-column layout showing highlights list and answer breakdown

### PDF File Structure (Pre-generated)
Each PDF is 5 pages:
- **Page 1**: Navy header band with topic name + overview + key concepts
- **Page 2**: Core strategies + step-by-step approach + time management tip
- **Page 3**: Worked example with passage, question, choices, and walkthrough
- **Page 4**: 3-4 original practice questions with space for student answers
- **Page 5**: Answer key + common mistakes + quick reference card

---

## Flashcard PDF (On-the-fly Generation)

### Requirements
Generate a printable PDF based on the student's current flashcard configuration using jsPDF in the browser.

### Layout
- Letter size (8.5" × 11"), portrait orientation
- Title at top: "Budy.Study Flashcards: [Topic Name]"
- Instruction line: "Print, fold along the dashed center line, and cut along the dotted horizontal lines."
- Cards arranged in rows:
  - Left half: Front (question) — label "FRONT" + bold question text
  - Right half: Back (answer) — label "BACK" + explanation text
  - Vertical dashed line down center (fold line)
  - Horizontal dotted lines between rows (cut lines)
- ~6 cards per page, overflow to additional pages
- Footer: "budy.study | [Topic] | Page X of Y"

---

## Key Principles

1. **Minimal text, maximum clarity**: Use icons, colors, and spacing to communicate — not paragraphs
2. **Game-first flashcards**: The flashcard tab should feel like playing a card game, not reading a textbook
3. **One action at a time**: Show only the buttons relevant to the current state (front vs. back)
4. **Navy + white contrast**: Dark background, white content sections, blue and gold accents
5. **Mobile-first responsive**: Every element should work on a phone held in one hand
6. **Encouraging tone**: Every completion message should be positive and forward-looking
7. **Physical + digital**: Support both on-screen study and printable/foldable materials

---

## Output Format

Generate clean, production-ready HTML + CSS + vanilla JavaScript (no frameworks). Use the exact design tokens listed above. The code should be a self-contained `<style>` + `<script>` block that can be dropped into an existing page.
