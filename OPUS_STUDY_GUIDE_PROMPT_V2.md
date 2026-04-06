Write a Node.js ESM script called generate-study-guides.mjs that uses PDFKit (npm install pdfkit) to generate 41 SAT/PSAT study guide PDFs. No other dependencies. Run with: node generate-study-guides.mjs

Output directory: ./data/study-guides/ (auto-create if missing). Also write a manifest.json listing each file.

---

TOPICS (41 total) — one PDF each, filename format: {section}-{slugified-skill}.pdf

MATH (23):
1. Advanced Math — Complex Numbers
2. Advanced Math — Equivalent Expressions
3. Advanced Math — Nonlinear Functions
4. Advanced Math — Polynomials
5. Advanced Math — Quadratics
6. Advanced Math — Radicals and Rational Exponents
7. Algebra — Linear Functions
8. Algebra — Linear Inequalities
9. Algebra — One-Variable Linear Equations
10. Algebra — Slope and Intercept
11. Algebra — Systems of Equations
12. Geometry and Trigonometry — Area and Volume
13. Geometry and Trigonometry — Circles
14. Geometry and Trigonometry — Coordinate Geometry
15. Geometry and Trigonometry — Right-Triangle Trigonometry
16. Geometry and Trigonometry — Triangles
17. Problem-Solving and Data Analysis — Percentages
18. Problem-Solving and Data Analysis — Probability
19. Problem-Solving and Data Analysis — Rates and Unit Conversion
20. Problem-Solving and Data Analysis — Ratios and Proportions
21. Problem-Solving and Data Analysis — Scatterplots and Line of Best Fit
22. Problem-Solving and Data Analysis — Statistics
23. Problem-Solving and Data Analysis — Table and Graph Interpretation

READING & WRITING (18):
24. Craft and Structure — Cross-Text Connections
25. Craft and Structure — Rhetorical Purpose
26. Craft and Structure — Text Structure
27. Craft and Structure — Words in Context
28. Expression of Ideas — Concision
29. Expression of Ideas — Rhetorical Synthesis
30. Expression of Ideas — Sentence Placement
31. Expression of Ideas — Transitions
32. Information and Ideas — Central Idea
33. Information and Ideas — Command of Evidence
34. Information and Ideas — Inference
35. Information and Ideas — Quantitative Information in Text and Graphics
36. Standard English Conventions — Grammar
37. Standard English Conventions — Modifier Placement
38. Standard English Conventions — Parallel Structure
39. Standard English Conventions — Pronoun Clarity
40. Standard English Conventions — Punctuation
41. Standard English Conventions — Verb Tense and Agreement

---

EACH PDF IS 4-5 PAGES WITH THIS LAYOUT:

Page 1 — Cover and Overview
- Navy rectangle header band (full width, 140pt) with gold kicker "BUDY.STUDY | SAT PREP STUDY GUIDE", large white skill name, gray subtitle showing Section and Domain, small line "5-Page Study Guide | budy.study"
- Below the band: Topic Overview (2-3 sentences), Key Concepts (5 bullets), Why This Matters on the SAT (short paragraph)

Page 2 — Rules, Formulas, Strategies
- Thin blue bar at top (6pt)
- Core Strategies: 5 numbered items specific to the topic
- Key Formulas/Rules (math) or Key Patterns/Signals (R&W): the actual formulas, grammar rules, transition lists, etc. Be specific — real quadratic formula, real slope formula, real punctuation rules, real transition word categories.
- Step-by-Step Approach: 5 numbered steps for solving this question type
- Time Management Tip in a box

Page 3 — Worked Examples
- Thin gold bar at top (6pt)
- Two fully worked SAT-style examples, each with: problem or passage, question, 4 choices A-D, correct answer, explanation of why it's right and why each wrong answer is wrong
- These must be original, not from any real test, but formatted and styled like real SAT questions

Page 4 — Practice Questions
- Thin green bar at top (6pt)
- 3-4 original multiple-choice questions in SAT style
- For R&W: short passage + question + 4 choices
- For Math: problem + 4 choices, include at least one grid-in style
- Mix easy/medium/hard
- "Your answer: ____" after each

Page 5 — Answer Key and Reference
- Thin blue bar at top (6pt)
- Answer key with correct letter and 2-3 sentence rationale per question
- Common Mistakes to Avoid: 4 bullets specific to this topic
- Quick Reference Card: boxed 1-2 line summary of the most important thing
- Footer: "Need more help? Visit budy.study for practice tests, AI explanations, and score tracking."

If content fits in 4 pages (answer key fits on page 4 after questions), that's fine. Don't pad to 5 if 4 is cleaner.

---

COLORS:
NAVY = [13, 17, 23]
BRAND_BLUE = [26, 86, 219]
GOLD = [245, 158, 11]
WHITE = [255, 255, 255]
LIGHT_GRAY = [240, 244, 255]
MID_GRAY = [148, 163, 184]
GREEN = [16, 185, 129]

TYPOGRAPHY:
- Headings: Helvetica-Bold 16pt BRAND_BLUE with 1pt underline
- Subheadings: Helvetica-Bold 11pt NAVY
- Body: Helvetica 9.5pt NAVY lineGap 4
- Kicker: Helvetica-Bold 10pt GOLD
- Title: Helvetica-Bold 24pt WHITE
- Footer each page: 7pt MID_GRAY centered "Budy.Study | Section | Skill | Page X of Y"

LAYOUT: US Letter, margins 40pt left/right 50pt top/bottom.

---

CONTENT QUALITY:

Every single one of the 41 topics must have unique content written into the script as a big TOPIC_CONTENT object keyed by "section:domain:skill". No default/fallback generator. Each entry needs: overview, concepts, strategies, formulas/rules, two worked examples, 3-4 practice questions with answers and rationales, common mistakes, quick reference.

Math topics must include real formulas using Unicode where helpful (use text like "x = (-b +/- sqrt(b^2-4ac)) / 2a" rather than LaTeX).

R&W topics must include real grammar rules, real transition word lists, real evidence analysis patterns.

Practice questions must be original and feel like real SAT questions but not copied from any test. They should be adjacent to our question bank content — testing the same skills from similar angles but never identical.

---

EXAMPLE OF EXPECTED DEPTH (Quadratics):

Overview: Quadratic questions appear frequently on SAT Math. You solve equations, interpret vertex form, find roots, and use the discriminant.

Formulas: Standard form ax^2+bx+c=0, Quadratic formula x=(-b+/-sqrt(b^2-4ac))/2a, Vertex form y=a(x-h)^2+k, Discriminant b^2-4ac (positive=2 roots, zero=1, negative=none), Sum of roots -b/a, Product of roots c/a.

Worked Example: If 2x^2-8x+6=0, what are the solutions? Divide by 2: x^2-4x+3=0. Factor: (x-1)(x-3)=0. x=1 or x=3.

Practice: f(x)=x^2-6x+k has exactly one real zero. What is k? Discriminant=0: 36-4k=0, k=9.

Apply this depth to all 41 topics.

---

SCRIPT STRUCTURE:
1. Imports (PDFKit, fs, path)
2. Color constants
3. TOPIC_CONTENT object with all 41 entries
4. PDF helper functions (drawHeader, drawBody, drawBullets, drawNumberedList, drawBox)
5. generateStudyGuidePDF(topic) returns a PDF buffer
6. main() iterates topics, writes PDFs, writes manifest.json
7. Console progress output

The script will be long (all 41 topics inline). That's expected. Do not abbreviate or skip topics. Write the complete runnable file.

MANIFEST FORMAT:
[{"section":"math","domain":"Advanced Math","skill":"Complex Numbers","filename":"math-complex-numbers.pdf","pages":5}, ...]
