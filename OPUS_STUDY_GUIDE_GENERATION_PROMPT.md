# One-Shot Prompt: Generate 41 SAT/PSAT 5-Page Study Guide PDFs

> **Instructions:** Paste this entire prompt into a fresh Claude Opus session. It contains everything needed to generate a self-contained Node.js script that produces 41 professional PDF study guides — no additional context required.

---

## Your Task

You are a senior developer and SAT content expert. Write a **single, self-contained Node.js script** called `generate-study-guides.mjs` that generates **41 PDF study guides** (one per SAT/PSAT skill topic). Each PDF is **exactly 5 pages**, modeled after real high school study guides — clean, scannable, educational, and visually cohesive. The script must also be able to run end-to-end with `node generate-study-guides.mjs`.

---

## Technology

- **Runtime:** Node.js (ESM — use `import` syntax)
- **PDF library:** [PDFKit](https://www.npmjs.com/package/pdfkit) (`npm install pdfkit`)
- **No other dependencies.** Everything (content, layout, styling) is self-contained in this one file.
- Output directory: `./data/study-guides/` (created automatically if missing)
- Also output a `manifest.json` listing every generated file with metadata

---

## The 41 Topics

Generate one 5-page PDF for each of these skills. The filename uses the format `{section}-{slugified-skill}.pdf`.

### Math (23 topics)

| # | Domain | Skill | Filename |
|---|--------|-------|----------|
| 1 | Advanced Math | Complex Numbers | `math-complex-numbers.pdf` |
| 2 | Advanced Math | Equivalent Expressions | `math-equivalent-expressions.pdf` |
| 3 | Advanced Math | Nonlinear Functions | `math-nonlinear-functions.pdf` |
| 4 | Advanced Math | Polynomials | `math-polynomials.pdf` |
| 5 | Advanced Math | Quadratics | `math-quadratics.pdf` |
| 6 | Advanced Math | Radicals and Rational Exponents | `math-radicals-and-rational-exponents.pdf` |
| 7 | Algebra | Linear Functions | `math-linear-functions.pdf` |
| 8 | Algebra | Linear Inequalities | `math-linear-inequalities.pdf` |
| 9 | Algebra | One-Variable Linear Equations | `math-one-variable-linear-equations.pdf` |
| 10 | Algebra | Slope and Intercept | `math-slope-and-intercept.pdf` |
| 11 | Algebra | Systems of Equations | `math-systems-of-equations.pdf` |
| 12 | Geometry and Trigonometry | Area and Volume | `math-area-and-volume.pdf` |
| 13 | Geometry and Trigonometry | Circles | `math-circles.pdf` |
| 14 | Geometry and Trigonometry | Coordinate Geometry | `math-coordinate-geometry.pdf` |
| 15 | Geometry and Trigonometry | Right-Triangle Trigonometry | `math-right-triangle-trigonometry.pdf` |
| 16 | Geometry and Trigonometry | Triangles | `math-triangles.pdf` |
| 17 | Problem-Solving and Data Analysis | Percentages | `math-percentages.pdf` |
| 18 | Problem-Solving and Data Analysis | Probability | `math-probability.pdf` |
| 19 | Problem-Solving and Data Analysis | Rates and Unit Conversion | `math-rates-and-unit-conversion.pdf` |
| 20 | Problem-Solving and Data Analysis | Ratios and Proportions | `math-ratios-and-proportions.pdf` |
| 21 | Problem-Solving and Data Analysis | Scatterplots and Line of Best Fit | `math-scatterplots-and-line-of-best-fit.pdf` |
| 22 | Problem-Solving and Data Analysis | Statistics | `math-statistics.pdf` |
| 23 | Problem-Solving and Data Analysis | Table and Graph Interpretation | `math-table-and-graph-interpretation.pdf` |

### Reading & Writing (18 topics)

| # | Domain | Skill | Filename |
|---|--------|-------|----------|
| 24 | Craft and Structure | Cross-Text Connections | `reading_writing-cross-text-connections.pdf` |
| 25 | Craft and Structure | Rhetorical Purpose | `reading_writing-rhetorical-purpose.pdf` |
| 26 | Craft and Structure | Text Structure | `reading_writing-text-structure.pdf` |
| 27 | Craft and Structure | Words in Context | `reading_writing-words-in-context.pdf` |
| 28 | Expression of Ideas | Concision | `reading_writing-concision.pdf` |
| 29 | Expression of Ideas | Rhetorical Synthesis | `reading_writing-rhetorical-synthesis.pdf` |
| 30 | Expression of Ideas | Sentence Placement | `reading_writing-sentence-placement.pdf` |
| 31 | Expression of Ideas | Transitions | `reading_writing-transitions.pdf` |
| 32 | Information and Ideas | Central Idea | `reading_writing-central-idea.pdf` |
| 33 | Information and Ideas | Command of Evidence | `reading_writing-command-of-evidence.pdf` |
| 34 | Information and Ideas | Inference | `reading_writing-inference.pdf` |
| 35 | Information and Ideas | Quantitative Information in Text and Graphics | `reading_writing-quantitative-information-in-text-and-graphics.pdf` |
| 36 | Standard English Conventions | Grammar | `reading_writing-grammar.pdf` |
| 37 | Standard English Conventions | Modifier Placement | `reading_writing-modifier-placement.pdf` |
| 38 | Standard English Conventions | Parallel Structure | `reading_writing-parallel-structure.pdf` |
| 39 | Standard English Conventions | Pronoun Clarity | `reading_writing-pronoun-clarity.pdf` |
| 40 | Standard English Conventions | Punctuation | `reading_writing-punctuation.pdf` |
| 41 | Standard English Conventions | Verb Tense and Agreement | `reading_writing-verb-tense-and-agreement.pdf` |

---

## PDF Page Structure (All 41 Guides Follow This Exact Layout)

### Page 1: Cover + Topic Overview
- **Navy header band** (full width, ~140pt tall) containing:
  - Gold kicker text: `BUDY.STUDY | SAT PREP STUDY GUIDE`
  - Large white bold title: Skill name
  - Light gray subtitle: `{Section} • {Domain}`
  - Small gray footer: `5-Page Study Guide | budy.study`
- Below the band:
  - **"Topic Overview"** header with blue underline → 2-3 sentence overview of the skill
  - **"Key Concepts"** header → 5 bullet points covering the essential ideas
  - **"Why This Matters on the SAT"** header → Short paragraph on how often this appears and why it matters

### Page 2: Core Rules, Formulas & Strategies
- Thin blue accent bar across top (6pt)
- **"Core Strategies"** → 5 numbered strategies specific to THIS topic
- **"Key Formulas / Rules"** (math topics) or **"Key Patterns & Signals"** (reading/writing topics) → The actual formulas, rules, grammar rules, or text patterns students need to memorize. **Be specific.** For math: show real formulas (quadratic formula, slope formula, etc.). For R&W: show real grammar rules, transition word lists, sentence structure patterns.
- **"Step-by-Step Approach"** → 5 numbered steps for attacking questions of this type
- **"Time Management Tip"** → Boxed tip with ⏱ icon. Math: ~90 sec/question. R&W: ~75 sec/question.

### Page 3: Worked Examples
- Thin gold accent bar across top (6pt)
- **"Worked Example 1"** → Full worked example with:
  - Passage (for R&W) or Problem setup (for Math)
  - Question stem
  - 4 answer choices (A–D)
  - Correct answer highlighted
  - Step-by-step explanation of WHY the answer is correct
  - Brief explanation of why each wrong answer is wrong
- **"Worked Example 2"** → A second, different worked example (harder difficulty) with the same structure
- These examples must be **original** — created by you, not pulled from any existing test. They should feel like real SAT questions in style, difficulty, and format.

### Page 4: Practice Questions (3–4 per guide)
- Thin green accent bar across top (6pt)
- **"Practice Questions"** header
- Instruction line: *"Try these on your own first, then check the answer key on the next page."*
- 3–4 original multiple-choice questions in SAT style:
  - For R&W: short passage + question + 4 choices (A–D)
  - For Math: problem + 4 choices (A–D); include at least one Student-Produced Response (SPR/grid-in) style formatted as "What is the value of x?"
  - Mix of easy, medium, and hard difficulty
  - **"Your answer: ____"** line after each question
- These questions must feel like real SAT questions but be **completely original**. They should test the same skill from different angles. Do NOT use generic filler questions — each one should be a legitimate practice item.

### Page 5: Answer Key + Common Mistakes + Quick Reference
- Thin blue accent bar across top (6pt)
- **"Answer Key"** → For each practice question: the correct letter + 2-3 sentence rationale
- **"Common Mistakes to Avoid"** → 4 bullet points of frequent errors students make on this topic
- **"Quick Reference Card"** → Boxed summary (1-2 lines) — the single most important thing to remember
- **Bottom branding:** `Need more help? Visit budy.study for practice tests, AI explanations, and score tracking.`

---

## Design Specifications

### Colors (use these exactly)
```javascript
const NAVY = [13, 17, 23];        // Page backgrounds, body text
const BRAND_BLUE = [26, 86, 219]; // Headers, accent bars, underlines
const GOLD = [245, 158, 11];      // Kicker text, Page 3 accent
const WHITE = [255, 255, 255];    // Text on dark backgrounds
const LIGHT_GRAY = [240, 244, 255]; // Subtitle text
const MID_GRAY = [148, 163, 184];  // Footers, timestamps
const GREEN = [16, 185, 129];      // Page 4 accent, success color
const ROSE = [244, 63, 94];        // Error highlights
```

### Typography
- **Headings:** Helvetica-Bold, 16pt, BRAND_BLUE
- **Subheadings:** Helvetica-Bold, 11pt, NAVY
- **Body text:** Helvetica, 9.5pt, NAVY, lineGap 4
- **Bullets/lists:** Helvetica, 9.5pt, indented with `•` or numbers
- **Kicker:** Helvetica-Bold, 10pt, GOLD
- **Title:** Helvetica-Bold, 24pt, WHITE (on navy band)
- **Footer:** 7pt, MID_GRAY, centered: `Budy.Study | {Section} | {Skill} | Page X of 5`

### Layout
- **Paper size:** US Letter (612 × 792 pt)
- **Margins:** 40pt left/right, 50pt top/bottom
- **Section headers:** 16pt blue text with 1pt blue underline divider below
- **Accent bars:** Full-width 6pt colored rectangle at top of pages 2–5
- **Boxed tips:** Rounded rectangle background (light blue or light gold fill) with text inside
- **Page breaks:** Each page is exactly one PDF page — no overflow

---

## Content Quality Requirements

### For EVERY topic, you must provide:

1. **Topic-specific overview** — Not generic. Mention what types of SAT questions test this skill and what the student will face.

2. **Real formulas and rules:**
   - **Quadratics:** Quadratic formula, vertex form, factoring patterns, discriminant
   - **Slope and Intercept:** y = mx + b, slope formula, point-slope form, parallel/perpendicular slopes
   - **Circles:** (x-h)² + (y-k)² = r², arc length, sector area, central vs. inscribed angles
   - **Probability:** P(A) = favorable/total, complement rule, P(A and B), P(A or B)
   - **Grammar:** Subject-verb agreement rules, comma splices, fragments, run-ons
   - **Punctuation:** Semicolons, colons, dashes, commas in lists, restrictive vs. non-restrictive clauses
   - **Transitions:** Common transition categories (contrast, addition, cause-effect, example)
   - etc. — for ALL 41 topics, include the actual subject-matter content, not placeholders.

3. **Two fully worked examples per guide (on Page 3)** — real SAT-style, with passage (R&W) or problem (Math), 4 choices, correct answer, and full explanation including why distractors are wrong.

4. **3–4 original practice questions per guide (on Page 4)** that:
   - Cover the skill from different angles
   - Include a mix of easy/medium/hard
   - Feel like real SAT questions (proper format, realistic passages/problems)
   - Are NOT copied from any existing test — they're original
   - For math: include at least one that uses a graph/table description or student-produced response format

5. **4 common mistakes** — specific to the skill (not generic "read carefully" advice)

6. **Quick reference card** — One memorable summary rule/formula

---

## Manifest Output

After generating all 41 PDFs, write a `manifest.json` in the output directory:

```json
[
  {
    "section": "math",
    "domain": "Advanced Math",
    "skill": "Complex Numbers",
    "filename": "math-complex-numbers.pdf",
    "pages": 5
  },
  ...
]
```

---

## Script Structure

The script should be structured as:

1. **Imports and setup** (PDFKit, fs, path)
2. **Color/typography constants**
3. **TOPIC_CONTENT object** — A massive object keyed by `"{section}:{domain}:{skill}"` containing ALL content for all 41 topics. Every single topic gets its own hand-crafted entry. No fallback/default generators for production.
4. **PDF rendering functions** (drawHeader, drawBody, drawBullets, etc.)
5. **`generateStudyGuidePDF(topic)`** — Takes a topic object and returns a PDF buffer
6. **`main()`** — Iterates all 41 topics, generates PDFs, writes files, writes manifest
7. Console output: progress for each PDF generated

---

## Critical Rules

1. **All 41 topics MUST have unique, topic-specific content.** No two guides should share the same overview, examples, or practice questions. No placeholder or "lorem ipsum" text.
2. **Practice questions must be original SAT-style.** They should look and feel like real Digital SAT questions — proper stem, 4 choices, one correct answer, plausible distractors.
3. **Math guides must include real formulas** rendered as text (e.g., `x = (-b ± √(b²-4ac)) / 2a`). Use Unicode symbols where helpful (√, ², ±, π, ≤, ≥, ≠).
4. **Reading & Writing guides must include real grammar rules, transition word lists, and evidence analysis strategies** — not vague advice.
5. **Every PDF must be exactly 5 pages.** Manage content density so nothing overflows and nothing is too sparse.
6. **The script must run to completion with `node generate-study-guides.mjs`** after `npm install pdfkit`. Zero errors.
7. **The output must be 41 PDF files plus manifest.json** in `./data/study-guides/`.

---

## Example Content Depth (What "Good" Looks Like)

Here's the level of detail expected for ONE topic. Apply this same depth to all 41.

### Example: Quadratics (Math → Advanced Math)

**Overview:** Quadratic questions are among the most common on the SAT Math section. You'll be asked to solve quadratic equations, interpret vertex form, identify roots from graphs, and analyze the discriminant. These questions test algebraic manipulation and conceptual understanding.

**Key Formulas:**
- Standard form: ax² + bx + c = 0
- Quadratic formula: x = (-b ± √(b²-4ac)) / 2a
- Vertex form: y = a(x-h)² + k, where (h,k) is the vertex
- Factored form: y = a(x-r₁)(x-r₂), where r₁ and r₂ are roots
- Discriminant: b²-4ac (positive = 2 real roots, zero = 1 root, negative = no real roots)
- Sum of roots: -b/a | Product of roots: c/a

**Worked Example 1:**
Problem: If 2x² - 8x + 6 = 0, what are the solutions for x?
(A) x = 1 and x = 3   (B) x = 2 and x = 6   (C) x = -1 and x = -3   (D) x = -2 and x = 3

Solution: Divide by 2: x² - 4x + 3 = 0. Factor: (x-1)(x-3) = 0. So x = 1 or x = 3. Answer: A.
Why B is wrong: 2 and 6 don't satisfy the equation. Why C is wrong: negatives don't factor correctly. Why D: mixed signs don't match.

**Practice Question 1 (medium):**
The function f(x) = x² - 6x + k has exactly one real zero. What is the value of k?
(A) 6   (B) 9   (C) 12   (D) 36
Answer: B. For one real zero, discriminant = 0: (-6)²-4(1)(k) = 0 → 36-4k = 0 → k = 9.

**This level of specificity and mathematical rigor is required for ALL 41 topics.**

---

## Output

Write the complete `generate-study-guides.mjs` script. It will be very long (likely 3,000-6,000+ lines) because it contains all content for 41 topics. That's expected and correct — do not abbreviate, truncate, or use placeholders.

Start writing the script now. Include every topic. Do not summarize or skip any. The file must be ready to run.
