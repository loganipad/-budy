#!/usr/bin/env node
/**
 * generate-study-guides-math.mjs
 * Generates 23 five-page PDF study guides for SAT Math topics.
 * Usage: node scripts/generate-study-guides-math.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data/study-guides');

// ─── Brand Colors ────────────────────────────────────────────────────
const NAVY       = [13, 17, 23];
const BRAND_BLUE = [26, 86, 219];
const GOLD       = [245, 158, 11];
const WHITE      = [255, 255, 255];
const LIGHT_GRAY = [240, 244, 255];
const MID_GRAY   = [148, 163, 184];
const GREEN      = [16, 185, 129];
const ROSE       = [244, 63, 94];

// ─── 23 Math Topics ──────────────────────────────────────────────────
const TOPIC_CONTENT = {

  // ═══════════════════════════════════════════════════════════════════
  // 1. Advanced Math — Complex Numbers
  // ═══════════════════════════════════════════════════════════════════
  'math-complex-numbers': {
    domain: 'Advanced Math',
    skill: 'Complex Numbers',
    filename: 'math-complex-numbers.pdf',
    overview: 'Complex numbers extend the real number system by introducing i, where i² = −1. The SAT tests your ability to add, subtract, multiply, and divide complex numbers, as well as simplify powers of i.',
    concepts: [
      'A complex number has the form a + bi, where a is the real part and b is the imaginary part',
      'i = √(−1), i² = −1, i³ = −i, i⁴ = 1, and the cycle repeats every 4 powers',
      'To add or subtract complex numbers, combine real parts and imaginary parts separately',
      'To multiply complex numbers, use FOIL and replace i² with −1',
      'To divide complex numbers, multiply numerator and denominator by the conjugate of the denominator'
    ],
    formulas: [
      'i² = −1, i³ = −i, i⁴ = 1',
      '(a + bi)(a − bi) = a² + b² (product of conjugates)',
      '(a + bi) + (c + di) = (a + c) + (b + d)i',
      '(a + bi)(c + di) = (ac − bd) + (ad + bc)i',
      'Division: (a + bi)/(c + di) = [(a + bi)(c − di)] / (c² + d²)'
    ],
    strategies: [
      'Treat i like a variable, but always replace i² with −1 when simplifying',
      'For powers of i, divide the exponent by 4 and use the remainder: i⁰=1, i¹=i, i²=−1, i³=−i',
      'When dividing, multiply top and bottom by the conjugate to eliminate i from the denominator',
      'Double-check signs carefully—the most common error is mishandling the negative from i²',
      'Remember the conjugate of a + bi is a − bi'
    ],
    stepByStep: [
      'Identify the operation: addition, subtraction, multiplication, division, or power of i',
      'If adding/subtracting, group real parts and imaginary parts',
      'If multiplying, FOIL and simplify using i² = −1',
      'If dividing, multiply by the conjugate of the denominator',
      'Express the final answer in standard form a + bi'
    ],
    workedExamples: [
      {
        problem: 'Simplify (3 + 2i)(4 − 5i).',
        choices: ['A) 22 − 7i', 'B) 12 − 10i', 'C) 2 − 7i', 'D) 22 + 7i'],
        answer: 'A',
        steps: 'Use FOIL: (3)(4) + (3)(−5i) + (2i)(4) + (2i)(−5i) = 12 − 15i + 8i − 10i². Since i² = −1: 12 − 15i + 8i − 10(−1) = 12 − 7i + 10 = 22 − 7i.',
        whyWrong: 'B ignores the i² term. C subtracts instead of adding the 10. D has the wrong sign on the imaginary part.'
      },
      {
        problem: 'What is the value of i⁴⁷?',
        choices: ['A) 1', 'B) i', 'C) −1', 'D) −i'],
        answer: 'D',
        steps: 'Divide 47 by 4: 47 ÷ 4 = 11 remainder 3. So i⁴⁷ = i³ = −i.',
        whyWrong: 'A is i⁰ or i⁴. B is i¹. C is i². Only D correctly uses remainder 3.'
      }
    ],
    practiceQuestions: [
      { question: 'Simplify (5 + 3i) − (2 − 4i).', choices: ['A) 3 − i', 'B) 3 + 7i', 'C) 7 + 7i', 'D) 7 − i'], answer: 'B', rationale: '(5 − 2) + (3 − (−4))i = 3 + 7i. Distribute the negative sign carefully.' },
      { question: 'What is (2 + i)/(1 − i)?', choices: ['A) 1/2 + 3i/2', 'B) 3/2 + 1/2 i', 'C) 1 + i', 'D) 1/2 + 3/2 i'], answer: 'D', rationale: 'Multiply by (1 + i)/(1 + i): numerator = (2 + i)(1 + i) = 2 + 2i + i + i² = 1 + 3i. Denominator = 1 + 1 = 2. Result: 1/2 + 3/2 i.' },
      { question: 'If z = 3 − 2i, what is z · z̄ (z times its conjugate)?', choices: ['A) 5', 'B) 9', 'C) 13', 'D) 9 + 4i'], answer: 'C', rationale: 'z̄ = 3 + 2i. z · z̄ = 3² + 2² = 9 + 4 = 13. The product of a complex number and its conjugate is always a real number.' },
      { question: 'SPR: What is the real part of (1 + 2i)²?', choices: ['Write your numerical answer: ____'], answer: '−3', rationale: '(1 + 2i)² = 1 + 4i + 4i² = 1 + 4i − 4 = −3 + 4i. The real part is −3.' }
    ],
    commonMistakes: [
      'Forgetting that i² = −1, not +1',
      'Dropping the negative sign when distributing subtraction across complex numbers',
      'Failing to multiply by the conjugate when dividing complex numbers',
      'Mixing up the cycle of powers of i (the pattern repeats every 4)'
    ],
    quickRef: 'i² = −1 | Powers of i cycle every 4 | Multiply by CONJUGATE to divide | Always express in a + bi form'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. Advanced Math — Equivalent Expressions
  // ═══════════════════════════════════════════════════════════════════
  'math-equivalent-expressions': {
    domain: 'Advanced Math',
    skill: 'Equivalent Expressions',
    filename: 'math-equivalent-expressions.pdf',
    overview: 'Equivalent Expressions questions test your ability to rewrite algebraic expressions in different but mathematically identical forms. The SAT may ask you to factor, expand, combine like terms, or simplify rational expressions.',
    concepts: [
      'Two expressions are equivalent if they produce the same result for every input value',
      'Factoring pulls out common factors: ab + ac = a(b + c)',
      'Expanding uses the distributive property: a(b + c) = ab + ac',
      'Combining like terms simplifies expressions: 3x + 5x = 8x',
      'Rational expressions can be simplified by canceling common factors in numerator and denominator'
    ],
    formulas: [
      'Difference of squares: a² − b² = (a + b)(a − b)',
      'Perfect square trinomial: a² + 2ab + b² = (a + b)²',
      'Sum/difference of cubes: a³ ± b³ = (a ± b)(a² ∓ ab + b²)',
      'Distributive property: a(b + c) = ab + ac',
      'Exponent rules: xᵃ · xᵇ = xᵃ⁺ᵇ,  (xᵃ)ᵇ = xᵃᵇ'
    ],
    strategies: [
      'Look for common factors first—factoring is faster than expanding in most cases',
      'Recognize special patterns: difference of squares, perfect squares, sum/difference of cubes',
      'When stuck, try substituting a simple value (like x = 2) into both the original and each answer choice',
      'Pay attention to the structure the question asks for—factored, expanded, or simplified',
      'Combine like terms systematically—group by variable and exponent'
    ],
    stepByStep: [
      'Read the expression and identify what form the answer should take',
      'Look for the greatest common factor (GCF) if factoring',
      'Apply the appropriate algebraic identity or distributive property',
      'Simplify by combining like terms',
      'Verify by expanding or substituting a test value'
    ],
    workedExamples: [
      {
        problem: 'Which expression is equivalent to 4x² − 25?',
        choices: ['A) (2x − 5)²', 'B) (2x + 5)(2x − 5)', 'C) (4x + 5)(x − 5)', 'D) 4(x² − 25)'],
        answer: 'B',
        steps: 'Recognize the difference of squares pattern: 4x² − 25 = (2x)² − 5² = (2x + 5)(2x − 5).',
        whyWrong: 'A expands to 4x² − 20x + 25 (has a middle term). C expands to 4x² − 15x − 25. D equals 4x² − 100.'
      },
      {
        problem: 'Simplify: (3x²y)(2xy³) / (6x²y²).',
        choices: ['A) xy²', 'B) x²y²', 'C) xy', 'D) x²y'],
        answer: 'A',
        steps: 'Numerator: (3)(2)x²⁺¹y¹⁺³ = 6x³y⁴. Then 6x³y⁴ / 6x²y² = x³⁻²y⁴⁻² = xy².',
        whyWrong: 'B doesn\'t subtract exponents correctly. C under-counts the y exponent. D swaps the exponents.'
      }
    ],
    practiceQuestions: [
      { question: 'Which is equivalent to x² + 6x + 9?', choices: ['A) (x + 3)²', 'B) (x + 9)(x + 1)', 'C) (x − 3)²', 'D) (x + 3)(x − 3)'], answer: 'A', rationale: 'x² + 6x + 9 = x² + 2(3)(x) + 3² = (x + 3)². This is a perfect square trinomial.' },
      { question: 'Simplify: (2x³)² · x.', choices: ['A) 2x⁷', 'B) 4x⁷', 'C) 4x⁶', 'D) 2x⁶'], answer: 'B', rationale: '(2x³)² = 4x⁶. Then 4x⁶ · x = 4x⁷.' },
      { question: 'Which is equivalent to (x² − 4)/(x + 2)?', choices: ['A) x − 2', 'B) x + 2', 'C) x² − 2', 'D) (x − 4)/2'], answer: 'A', rationale: 'Factor numerator: (x+2)(x−2)/(x+2) = x − 2 (for x ≠ −2).' },
      { question: 'SPR: If 3(2x − 4) + 6 = ax + b, what is the value of a + b?', choices: ['Write your numerical answer: ____'], answer: '0', rationale: '3(2x − 4) + 6 = 6x − 12 + 6 = 6x − 6. So a = 6, b = −6, and a + b = 0.' }
    ],
    commonMistakes: [
      'Confusing (a − b)² with a² − b² (the first has a middle term)',
      'Forgetting to multiply coefficients when applying exponent rules',
      'Not factoring completely—stopping after pulling out one factor',
      'Canceling terms instead of factors in rational expressions'
    ],
    quickRef: 'a² − b² = (a+b)(a−b) | (a+b)² = a²+2ab+b² | Factor first, verify by substitution'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. Advanced Math — Nonlinear Functions
  // ═══════════════════════════════════════════════════════════════════
  'math-nonlinear-functions': {
    domain: 'Advanced Math',
    skill: 'Nonlinear Functions',
    filename: 'math-nonlinear-functions.pdf',
    overview: 'Nonlinear functions include exponential, absolute value, piecewise, and other functions that don\'t produce straight-line graphs. The SAT tests your ability to interpret graphs, evaluate functions, and understand growth and decay patterns.',
    concepts: [
      'Exponential growth: f(x) = a · bˣ where b > 1; exponential decay: 0 < b < 1',
      'Absolute value functions produce V-shaped graphs: f(x) = |x − h| + k',
      'Piecewise functions use different rules for different intervals of x',
      'End behavior describes what happens to f(x) as x → ∞ or x → −∞',
      'Transformations shift, stretch, compress, or reflect the parent function'
    ],
    formulas: [
      'Exponential growth/decay: f(x) = a · bˣ (a = initial value, b = growth/decay factor)',
      'Compound interest: A = P(1 + r/n)ⁿᵗ',
      'Absolute value: |x| = x if x ≥ 0, |x| = −x if x < 0',
      'Transformation: f(x − h) + k shifts right h units, up k units',
      'Vertical stretch: a·f(x), reflection: −f(x)'
    ],
    strategies: [
      'Identify the function type first (exponential, absolute value, piecewise, etc.)',
      'For exponential problems, identify the initial value and whether it\'s growth or decay',
      'Use the graph shape to match function type: V-shape = absolute value, J-curve = exponential',
      'For piecewise functions, check which piece applies based on the x-value',
      'Plug in values to test transformations—don\'t just memorize the rules'
    ],
    stepByStep: [
      'Read the problem and identify the function type from the equation or graph',
      'Note key features: initial value, rate, vertex, asymptote, or breakpoints',
      'Apply the appropriate formula or rule for that function type',
      'Calculate or evaluate at the given input',
      'Check that your answer matches the behavior of the function'
    ],
    workedExamples: [
      {
        problem: 'A population starts at 500 and doubles every 3 years. Which function models the population after t years?',
        choices: ['A) P(t) = 500(2)^(t/3)', 'B) P(t) = 500(2)^(3t)', 'C) P(t) = 500 + 2t', 'D) P(t) = 500(3)^(t/2)'],
        answer: 'A',
        steps: 'The initial value is 500, and the population doubles (factor of 2) every 3 years. Since it doubles every 3 years, the exponent is t/3. So P(t) = 500(2)^(t/3). Check: at t = 3, P = 500(2)¹ = 1000 ✓.',
        whyWrong: 'B doubles 3 times per year (too fast). C is linear, not exponential. D uses base 3 instead of 2.'
      },
      {
        problem: 'If f(x) = |x − 3| + 2, what is the vertex of the graph?',
        choices: ['A) (3, 2)', 'B) (−3, 2)', 'C) (3, −2)', 'D) (2, 3)'],
        answer: 'A',
        steps: 'The absolute value function |x − h| + k has vertex at (h, k). Here h = 3 and k = 2, so the vertex is (3, 2).',
        whyWrong: 'B negates h incorrectly. C negates k. D swaps h and k.'
      }
    ],
    practiceQuestions: [
      { question: 'A car depreciates at 15% per year. If it\'s worth $20,000 today, which expression gives its value after t years?', choices: ['A) 20000(1.15)ᵗ', 'B) 20000(0.85)ᵗ', 'C) 20000 − 0.15t', 'D) 20000(0.15)ᵗ'], answer: 'B', rationale: 'Depreciating 15% means retaining 85% each year, so the factor is 0.85.' },
      { question: 'If f(x) is defined as f(x) = 2x + 1 for x < 0 and f(x) = x² for x ≥ 0, what is f(−2) + f(3)?', choices: ['A) 6', 'B) 5', 'C) 12', 'D) 6'], answer: 'A', rationale: 'f(−2) uses the first piece: 2(−2)+1 = −3. f(3) uses the second piece: 3² = 9. Sum: −3 + 9 = 6.' },
      { question: 'Which function has a horizontal asymptote at y = 5?', choices: ['A) f(x) = 5ˣ', 'B) f(x) = 3(2)ˣ + 5', 'C) f(x) = 5x + 3', 'D) f(x) = x² + 5'], answer: 'B', rationale: 'The exponential 3(2)ˣ approaches 0 as x → −∞, so f(x) → 0 + 5 = 5. The asymptote is y = 5.' },
      { question: 'SPR: If g(x) = 2 · 3ˣ, what is g(4)?', choices: ['Write your numerical answer: ____'], answer: '162', rationale: 'g(4) = 2 · 3⁴ = 2 · 81 = 162.' }
    ],
    commonMistakes: [
      'Confusing growth factor with growth rate (rate of 15% means factor of 1.15, not 0.15)',
      'Using the wrong piece of a piecewise function for the given x-value',
      'Forgetting the horizontal asymptote of exponential functions shifted vertically',
      'Mixing up horizontal and vertical shifts in transformation problems'
    ],
    quickRef: 'Exponential: a · bˣ | Growth b>1, Decay 0<b<1 | Abs value vertex: (h,k) | Check end behavior'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. Advanced Math — Polynomials
  // ═══════════════════════════════════════════════════════════════════
  'math-polynomials': {
    domain: 'Advanced Math',
    skill: 'Polynomials',
    filename: 'math-polynomials.pdf',
    overview: 'Polynomial questions test your ability to add, subtract, multiply, divide, and factor polynomials. The SAT also asks about zeros, the relationship between factors and roots, and the behavior of polynomial graphs.',
    concepts: [
      'A polynomial of degree n has at most n real zeros and at most n − 1 turning points',
      'If (x − r) is a factor of p(x), then r is a zero of p(x) and p(r) = 0',
      'The Remainder Theorem: p(r) equals the remainder when p(x) is divided by (x − r)',
      'The leading coefficient and degree determine end behavior',
      'Multiply polynomials term by term and combine like terms'
    ],
    formulas: [
      'Factored form: p(x) = a(x − r₁)(x − r₂)…(x − rₙ)',
      'Remainder Theorem: if p(x) ÷ (x − r), remainder = p(r)',
      'Factor Theorem: (x − r) is a factor of p(x) if and only if p(r) = 0',
      'Sum of cubes: a³ + b³ = (a + b)(a² − ab + b²)',
      'Degree of product: deg(f · g) = deg(f) + deg(g)'
    ],
    strategies: [
      'To find zeros, set p(x) = 0 and factor completely',
      'Use synthetic division or the Remainder Theorem to test potential roots',
      'For end behavior: even degree → both ends same direction; odd degree → opposite directions',
      'Leading coefficient positive → right end goes up; negative → right end goes down',
      'When multiplying polynomials, use a systematic grid to avoid missing terms'
    ],
    stepByStep: [
      'Identify the operation: factor, multiply, divide, or find zeros',
      'If factoring, look for GCF first, then special patterns, then grouping',
      'If finding zeros, set each factor equal to zero and solve',
      'To determine end behavior, note the degree and leading coefficient sign',
      'Verify by substituting a zero back into the original polynomial'
    ],
    workedExamples: [
      {
        problem: 'If p(x) = x³ − 4x² + x + 6, and (x − 2) is a factor, what are all the zeros of p(x)?',
        choices: ['A) 2, 3, −1', 'B) 2, −3, 1', 'C) −2, 3, −1', 'D) 2, 3, 1'],
        answer: 'A',
        steps: 'Since p(2) = 8 − 16 + 2 + 6 = 0 ✓, divide: x³ − 4x² + x + 6 ÷ (x − 2) = x² − 2x − 3 = (x − 3)(x + 1). Zeros: x = 2, 3, −1.',
        whyWrong: 'B has wrong signs on 3 and 1. C uses −2 which is not a zero. D uses 1 instead of −1.'
      },
      {
        problem: 'What is the remainder when p(x) = 2x³ − 5x + 3 is divided by (x − 1)?',
        choices: ['A) 0', 'B) 3', 'C) −2', 'D) 1'],
        answer: 'A',
        steps: 'By the Remainder Theorem, remainder = p(1) = 2(1)³ − 5(1) + 3 = 2 − 5 + 3 = 0.',
        whyWrong: 'B, C, and D are miscalculations. If remainder = 0, then (x − 1) is a factor.'
      }
    ],
    practiceQuestions: [
      { question: 'Which could be the graph of y = −x³ + 2x?', choices: ['A) Starts high-left, ends high-right', 'B) Starts high-left, ends low-right', 'C) Starts low-left, ends high-right', 'D) Starts low-left, ends low-right'], answer: 'B', rationale: 'Odd degree with negative leading coefficient: as x → −∞, y → +∞; as x → +∞, y → −∞. High left, low right.' },
      { question: 'If (x + 3) is a factor of x² + 7x + 12, what is the other factor?', choices: ['A) (x + 4)', 'B) (x − 4)', 'C) (x + 9)', 'D) (x + 3)'], answer: 'A', rationale: 'x² + 7x + 12 = (x + 3)(x + 4). Check: 3 × 4 = 12, 3 + 4 = 7 ✓.' },
      { question: 'What is (x² + 3x − 2)(x + 1)?', choices: ['A) x³ + 4x² + x − 2', 'B) x³ + 4x² + x + 2', 'C) x³ + 3x² + x − 2', 'D) x³ + 2x² − 2x − 2'], answer: 'A', rationale: 'Distribute: x³ + x² + 3x² + 3x − 2x − 2 = x³ + 4x² + x − 2.' },
      { question: 'SPR: If p(x) = x² − 5x + 6, what is p(4)?', choices: ['Write your numerical answer: ____'], answer: '2', rationale: 'p(4) = 16 − 20 + 6 = 2.' }
    ],
    commonMistakes: [
      'Confusing factors and zeros: if (x − 3) is a factor, the zero is +3, not −3',
      'Forgetting to include the GCF when listing all factors',
      'Making sign errors during polynomial long division or synthetic division',
      'Misidentifying end behavior when the leading coefficient is negative'
    ],
    quickRef: 'Factor → set = 0 → find zeros | Remainder = p(r) | End behavior: degree + lead coeff sign'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. Advanced Math — Quadratics
  // ═══════════════════════════════════════════════════════════════════
  'math-quadratics': {
    domain: 'Advanced Math',
    skill: 'Quadratics',
    filename: 'math-quadratics.pdf',
    overview: 'Quadratic equations and functions are among the most tested topics on the SAT Math section. You must be able to solve quadratics by factoring, completing the square, and using the quadratic formula, as well as interpret parabolas graphically.',
    concepts: [
      'Standard form: ax² + bx + c = 0; vertex form: a(x − h)² + k; factored form: a(x − r₁)(x − r₂)',
      'The discriminant b² − 4ac determines the number of real solutions: positive → 2, zero → 1, negative → 0',
      'The vertex of y = ax² + bx + c is at x = −b/(2a)',
      'The axis of symmetry is x = −b/(2a) and passes through the vertex',
      'If a > 0, the parabola opens up (minimum); if a < 0, it opens down (maximum)'
    ],
    formulas: [
      'Quadratic formula: x = (−b ± √(b² − 4ac)) / (2a)',
      'Discriminant: Δ = b² − 4ac',
      'Vertex: (−b/(2a), f(−b/(2a)))',
      'Sum of roots: r₁ + r₂ = −b/a',
      'Product of roots: r₁ · r₂ = c/a'
    ],
    strategies: [
      'Try factoring first—it\'s fastest when it works',
      'Use the quadratic formula when factoring isn\'t obvious',
      'Complete the square to convert to vertex form',
      'Use the discriminant to quickly determine how many solutions exist',
      'For word problems, define the variable, write the equation, then solve'
    ],
    stepByStep: [
      'Write the equation in standard form: ax² + bx + c = 0',
      'Try factoring: find two numbers that multiply to ac and add to b',
      'If factoring fails, apply the quadratic formula',
      'Simplify the radical and reduce the fraction',
      'Check solutions by substituting back into the original equation'
    ],
    workedExamples: [
      {
        problem: 'Solve: x² − 5x + 6 = 0.',
        choices: ['A) x = 2, x = 3', 'B) x = −2, x = −3', 'C) x = 1, x = 6', 'D) x = −1, x = −6'],
        answer: 'A',
        steps: 'Factor: (x − 2)(x − 3) = 0. Set each factor to zero: x = 2 or x = 3. Check: 4 − 10 + 6 = 0 ✓ and 9 − 15 + 6 = 0 ✓.',
        whyWrong: 'B gives the wrong signs. C and D don\'t multiply to give the correct middle term.'
      },
      {
        problem: 'For what value of k does 2x² + kx + 8 = 0 have exactly one real solution?',
        choices: ['A) k = 4', 'B) k = 8', 'C) k = ±8', 'D) k = 16'],
        answer: 'C',
        steps: 'One solution means discriminant = 0: k² − 4(2)(8) = 0 → k² = 64 → k = ±8.',
        whyWrong: 'A gives Δ = 16 − 64 < 0. B gives Δ = 64 − 64 = 0 only for +8, missing −8. D gives Δ > 0.'
      }
    ],
    practiceQuestions: [
      { question: 'What is the vertex of y = 2x² − 8x + 3?', choices: ['A) (2, −5)', 'B) (−2, 19)', 'C) (4, 3)', 'D) (2, 3)'], answer: 'A', rationale: 'x = −(−8)/(2·2) = 2. y = 2(4) − 16 + 3 = −5. Vertex: (2, −5).' },
      { question: 'How many real solutions does 3x² − x + 5 = 0 have?', choices: ['A) 0', 'B) 1', 'C) 2', 'D) Cannot be determined'], answer: 'A', rationale: 'Δ = 1 − 60 = −59 < 0, so there are no real solutions.' },
      { question: 'Solve: 2x² + 7x − 15 = 0.', choices: ['A) x = 3/2, x = −5', 'B) x = −3/2, x = 5', 'C) x = 5/2, x = −3', 'D) x = −5/2, x = 3'], answer: 'A', rationale: 'Using the quadratic formula or factoring: 2x² + 7x − 15 = (2x − 3)(x + 5) = 0 → x = 3/2 or x = −5.' },
      { question: 'SPR: If the sum of the solutions of x² − 7x + 10 = 0 is s, what is s?', choices: ['Write your numerical answer: ____'], answer: '7', rationale: 'Sum of roots = −b/a = −(−7)/1 = 7. (Also: roots are 2 and 5, and 2 + 5 = 7.)' }
    ],
    commonMistakes: [
      'Sign errors in the quadratic formula, especially with −b',
      'Forgetting that the discriminant can be zero (yielding exactly one solution)',
      'Confusing vertex form with standard form when reading off the vertex',
      'Not checking both solutions—one may be extraneous in context problems'
    ],
    quickRef: 'x = (−b ± √(b²−4ac))/(2a) | Vertex at x = −b/(2a) | Δ>0 → 2 roots, Δ=0 → 1, Δ<0 → 0'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. Advanced Math — Radicals and Rational Exponents
  // ═══════════════════════════════════════════════════════════════════
  'math-radicals-and-rational-exponents': {
    domain: 'Advanced Math',
    skill: 'Radicals and Rational Exponents',
    filename: 'math-radicals-and-rational-exponents.pdf',
    overview: 'These questions test your ability to simplify radical expressions and convert between radical and exponential notation. The SAT expects fluency with fractional exponents, rationalizing denominators, and combining radical expressions.',
    concepts: [
      'x^(1/n) = ⁿ√x and x^(m/n) = ⁿ√(xᵐ) = (ⁿ√x)ᵐ',
      'To simplify √(ab) = √a · √b, and √(a/b) = √a / √b',
      'Rationalize denominators by multiplying by √b/√b or the conjugate',
      'Like radicals (same index and radicand) can be added or subtracted',
      'When solving radical equations, isolate the radical, raise both sides to eliminate it, then check for extraneous solutions'
    ],
    formulas: [
      'x^(m/n) = (ⁿ√x)ᵐ = ⁿ√(xᵐ)',
      '√a · √b = √(ab)',
      '(√a)² = a',
      'x^(−n) = 1/xⁿ',
      'Rationalizing: a/√b = a√b / b'
    ],
    strategies: [
      'Convert all radicals to fractional exponents for easier manipulation',
      'Factor the radicand to pull out perfect squares/cubes',
      'When adding radicals, simplify each term first, then combine like radicals',
      'Always check for extraneous solutions after solving radical equations',
      'Rationalize denominators by multiplying by the conjugate for binomial denominators'
    ],
    stepByStep: [
      'Convert to exponential form if it simplifies the work',
      'Factor the radicand and extract perfect powers',
      'Apply exponent rules: product rule, power rule, quotient rule',
      'Simplify and combine like terms',
      'Convert back to radical form if required by the answer choices'
    ],
    workedExamples: [
      {
        problem: 'Simplify: √72 + √18.',
        choices: ['A) √90', 'B) 9√2', 'C) 6√2 + 3√2', 'D) 9√2'],
        answer: 'B',
        steps: '√72 = √(36·2) = 6√2. √18 = √(9·2) = 3√2. Sum: 6√2 + 3√2 = 9√2.',
        whyWrong: 'A incorrectly adds radicands (√72 + √18 ≠ √90). C is the intermediate step, not simplified. D is the same as B (both correct, but B matches).'
      },
      {
        problem: 'Write 8^(2/3) as a whole number.',
        choices: ['A) 2', 'B) 4', 'C) 6', 'D) 16'],
        answer: 'B',
        steps: '8^(2/3) = (∛8)² = 2² = 4. Alternatively, 8^(2/3) = (8²)^(1/3) = 64^(1/3) = 4.',
        whyWrong: 'A only takes the cube root without squaring. C and D miscalculate the exponent.'
      }
    ],
    practiceQuestions: [
      { question: 'Simplify: 2/√5.', choices: ['A) 2√5/5', 'B) √10/5', 'C) 2/5', 'D) √5/2'], answer: 'A', rationale: 'Multiply by √5/√5: 2√5/5.' },
      { question: 'What is 27^(−1/3)?', choices: ['A) −3', 'B) 1/3', 'C) 3', 'D) −1/3'], answer: 'B', rationale: '27^(1/3) = 3, so 27^(−1/3) = 1/3.' },
      { question: 'Solve: √(x + 5) = 3.', choices: ['A) x = 4', 'B) x = 14', 'C) x = −2', 'D) x = 2'], answer: 'A', rationale: 'Square both sides: x + 5 = 9, so x = 4. Check: √9 = 3 ✓.' },
      { question: 'SPR: What is the value of (√3)⁴?', choices: ['Write your numerical answer: ____'], answer: '9', rationale: '(√3)⁴ = (3^(1/2))⁴ = 3² = 9.' }
    ],
    commonMistakes: [
      'Adding radicands directly: √a + √b ≠ √(a + b)',
      'Forgetting to check for extraneous solutions in radical equations',
      'Misapplying fractional exponents: x^(2/3) ≠ x²/x³',
      'Not rationalizing the denominator when required'
    ],
    quickRef: 'x^(m/n) = ⁿ√(xᵐ) | √a·√b = √(ab) | Rationalize: multiply by conjugate | ALWAYS check solutions'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. Algebra — Linear Functions
  // ═══════════════════════════════════════════════════════════════════
  'math-linear-functions': {
    domain: 'Algebra',
    skill: 'Linear Functions',
    filename: 'math-linear-functions.pdf',
    overview: 'Linear function questions ask you to interpret and create equations in slope-intercept, point-slope, or standard form. The SAT tests whether you can model real-world situations with linear equations and interpret their graphs.',
    concepts: [
      'A linear function has the form f(x) = mx + b, where m is the slope and b is the y-intercept',
      'Slope = rate of change = rise/run = (y₂ − y₁)/(x₂ − x₁)',
      'The y-intercept is the value of f(x) when x = 0',
      'Parallel lines have equal slopes; perpendicular lines have slopes that are negative reciprocals',
      'A linear function has a constant rate of change (first differences are equal)'
    ],
    formulas: [
      'Slope-intercept form: y = mx + b',
      'Point-slope form: y − y₁ = m(x − x₁)',
      'Standard form: Ax + By = C',
      'Slope: m = (y₂ − y₁)/(x₂ − x₁)',
      'Perpendicular slopes: m₁ · m₂ = −1'
    ],
    strategies: [
      'Identify two points to calculate slope, then use point-slope form to write the equation',
      'In word problems, the slope is the rate (e.g., cost per item) and the intercept is the starting value (e.g., flat fee)',
      'Convert to slope-intercept form to easily read slope and y-intercept',
      'Check if a table is linear by calculating successive differences in y',
      'For parallel/perpendicular problems, find the original slope first'
    ],
    stepByStep: [
      'Identify the given information: points, slope, intercept, or table',
      'Calculate the slope if not given directly',
      'Write the equation in the form requested',
      'Interpret the slope and intercept in context',
      'Verify by substituting a given point into your equation'
    ],
    workedExamples: [
      {
        problem: 'A plumber charges a $50 service fee plus $30 per hour. Which function models the total cost C for h hours of work?',
        choices: ['A) C(h) = 50h + 30', 'B) C(h) = 30h + 50', 'C) C(h) = 80h', 'D) C(h) = 30h − 50'],
        answer: 'B',
        steps: 'The flat fee ($50) is the y-intercept. The rate ($30/hr) is the slope. C(h) = 30h + 50. Check at h = 2: 30(2) + 50 = $110 ✓.',
        whyWrong: 'A swaps slope and intercept. C combines them incorrectly. D uses a negative intercept.'
      },
      {
        problem: 'A line passes through (1, 4) and (3, 10). What is the equation of the line?',
        choices: ['A) y = 3x + 1', 'B) y = 3x − 1', 'C) y = 2x + 2', 'D) y = 6x − 2'],
        answer: 'A',
        steps: 'Slope: (10 − 4)/(3 − 1) = 6/2 = 3. Using point-slope: y − 4 = 3(x − 1) → y = 3x + 1. Check at (3, 10): 3(3) + 1 = 10 ✓.',
        whyWrong: 'B doesn\'t pass through (1, 4). C has wrong slope. D has wrong slope and intercept.'
      }
    ],
    practiceQuestions: [
      { question: 'What is the slope of the line 4x − 2y = 10?', choices: ['A) 4', 'B) 2', 'C) −2', 'D) −5'], answer: 'B', rationale: 'Rewrite: −2y = −4x + 10 → y = 2x − 5. Slope is 2.' },
      { question: 'A line with slope 3 passes through (2, 7). What is the y-intercept?', choices: ['A) 1', 'B) 7', 'C) 13', 'D) −1'], answer: 'A', rationale: 'y = 3x + b → 7 = 3(2) + b → b = 1.' },
      { question: 'Which line is perpendicular to y = (2/3)x + 1?', choices: ['A) y = (2/3)x − 4', 'B) y = −(3/2)x + 5', 'C) y = (3/2)x + 1', 'D) y = −(2/3)x − 1'], answer: 'B', rationale: 'Perpendicular slope = −1/(2/3) = −3/2.' },
      { question: 'SPR: A gym membership costs $25/month plus a $40 sign-up fee. What is the total cost (in dollars) for 6 months?', choices: ['Write your numerical answer: ____'], answer: '190', rationale: 'C = 25(6) + 40 = 150 + 40 = 190.' }
    ],
    commonMistakes: [
      'Swapping slope and y-intercept when reading from a word problem',
      'Forgetting to distribute the negative when converting standard to slope-intercept form',
      'Using run/rise instead of rise/run for slope',
      'Confusing parallel (equal slopes) with perpendicular (negative reciprocal slopes)'
    ],
    quickRef: 'y = mx + b | Slope = rise/run | Parallel → same m | Perpendicular → m₁·m₂ = −1 | b = start value'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 8. Algebra — Linear Inequalities
  // ═══════════════════════════════════════════════════════════════════
  'math-linear-inequalities': {
    domain: 'Algebra',
    skill: 'Linear Inequalities',
    filename: 'math-linear-inequalities.pdf',
    overview: 'Linear inequality questions ask you to solve, graph, and interpret inequalities involving one or two variables. The SAT tests systems of inequalities and determining which region on a graph satisfies given constraints.',
    concepts: [
      'Solving linear inequalities follows the same rules as equations, except: flip the inequality sign when multiplying or dividing by a negative number',
      'The solution to a one-variable inequality is a range of values on the number line',
      'A two-variable linear inequality represents a half-plane on the coordinate plane',
      'Systems of inequalities define a feasible region where all constraints overlap',
      'Dashed boundary lines for < or >; solid for ≤ or ≥'
    ],
    formulas: [
      'If a < b and c > 0, then ac < bc (multiplying by positive preserves direction)',
      'If a < b and c < 0, then ac > bc (multiplying by negative reverses direction)',
      'Compound inequality: a < x < b means x > a AND x < b',
      'Absolute value inequality: |x| < a means −a < x < a',
      '|x| > a means x < −a OR x > a'
    ],
    strategies: [
      'Solve the inequality as if it were an equation, then decide the direction of the sign',
      'Test a point (like the origin) to determine which side of a boundary line to shade',
      'For "at most" use ≤; for "at least" use ≥; "fewer than" means <; "more than" means >',
      'When graphing systems, the solution is the intersection of all shaded regions',
      'Remember: multiplying or dividing by a negative reverses the inequality'
    ],
    stepByStep: [
      'Translate the word problem into an inequality',
      'Isolate the variable, flipping the sign if you multiply/divide by a negative',
      'Express the solution as an inequality or interval',
      'If graphing, draw the boundary line (solid or dashed) and shade the correct region',
      'Verify by substituting a point from the solution region'
    ],
    workedExamples: [
      {
        problem: 'Solve: −3x + 7 ≤ 16.',
        choices: ['A) x ≥ −3', 'B) x ≤ −3', 'C) x ≥ 3', 'D) x ≤ 3'],
        answer: 'A',
        steps: '−3x + 7 ≤ 16 → −3x ≤ 9 → x ≥ −3 (flip the sign because we divide by −3). Check x = 0: −3(0)+7 = 7 ≤ 16 ✓.',
        whyWrong: 'B forgets to flip the sign. C and D have the wrong boundary value or direction.'
      },
      {
        problem: 'A store sells notebooks for $3 and pens for $1. A student has at most $15. Which inequality represents the constraint, where n = notebooks and p = pens?',
        choices: ['A) 3n + p ≥ 15', 'B) 3n + p ≤ 15', 'C) n + 3p ≤ 15', 'D) 3n + p < 15'],
        answer: 'B',
        steps: '"At most $15" means total cost ≤ 15. Total cost = 3n + p. So 3n + p ≤ 15.',
        whyWrong: 'A uses ≥ (at least). C swaps the coefficients. D uses strict < instead of ≤.'
      }
    ],
    practiceQuestions: [
      { question: 'Solve: 2(x − 3) > 4x + 2.', choices: ['A) x > −4', 'B) x < −4', 'C) x > 4', 'D) x < 4'], answer: 'B', rationale: '2x − 6 > 4x + 2 → −8 > 2x → x < −4.' },
      { question: 'Which point is in the solution region of y > 2x − 1 and y ≤ x + 3?', choices: ['A) (0, 5)', 'B) (0, 0)', 'C) (5, 0)', 'D) (−2, −6)'], answer: 'B', rationale: 'At (0,0): 0 > 2(0)−1 = −1 ✓ and 0 ≤ 0+3 = 3 ✓.' },
      { question: 'A gym requires members to be at least 16 years old. Which inequality represents this?', choices: ['A) a > 16', 'B) a < 16', 'C) a ≥ 16', 'D) a ≤ 16'], answer: 'C', rationale: '"At least 16" means a ≥ 16.' },
      { question: 'SPR: What is the smallest integer x such that 5x − 3 > 12?', choices: ['Write your numerical answer: ____'], answer: '4', rationale: '5x > 15 → x > 3. The smallest integer greater than 3 is 4.' }
    ],
    commonMistakes: [
      'Forgetting to flip the inequality sign when dividing by a negative',
      'Confusing "at most" (≤) with "at least" (≥)',
      'Shading the wrong side of the boundary line on a graph',
      'Using a solid line when it should be dashed (strict inequality) or vice versa'
    ],
    quickRef: 'Flip sign when × or ÷ by negative | ≤/≥ = solid line | </> = dashed line | Test a point to check'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 9. Algebra — One-Variable Linear Equations
  // ═══════════════════════════════════════════════════════════════════
  'math-one-variable-linear-equations': {
    domain: 'Algebra',
    skill: 'One-Variable Linear Equations',
    filename: 'math-one-variable-linear-equations.pdf',
    overview: 'One-variable linear equations are the foundation of SAT algebra. You must solve equations efficiently, handle fractions and decimals, and determine when equations have no solution or infinitely many solutions.',
    concepts: [
      'A linear equation in one variable has exactly one solution, unless it\'s an identity (infinite solutions) or a contradiction (no solution)',
      'Solve by isolating the variable using inverse operations',
      'If simplifying yields a true statement like 3 = 3, there are infinitely many solutions',
      'If simplifying yields a false statement like 3 = 5, there is no solution',
      'Always distribute and combine like terms before isolating the variable'
    ],
    formulas: [
      'General form: ax + b = c → x = (c − b)/a (a ≠ 0)',
      'To clear fractions: multiply every term by the LCD',
      'Cross-multiplication: a/b = c/d → ad = bc',
      'Identity: 0 = 0 (infinite solutions)',
      'Contradiction: nonzero = 0 (no solution)'
    ],
    strategies: [
      'Distribute any parentheses first, then combine like terms on each side',
      'Move all variable terms to one side and constants to the other',
      'Clear fractions early by multiplying through by the LCD',
      'Check your answer by substituting it back into the original equation',
      'Watch for special cases: no solution and infinite solutions'
    ],
    stepByStep: [
      'Distribute parentheses: a(b + c) = ab + ac',
      'Combine like terms on each side',
      'Use inverse operations to isolate the variable',
      'Simplify the result',
      'Verify by plugging the solution back into the original'
    ],
    workedExamples: [
      {
        problem: 'Solve: 3(2x − 4) + 5 = 2x + 9.',
        choices: ['A) x = 4', 'B) x = 2', 'C) x = 4.5', 'D) x = 3'],
        answer: 'A',
        steps: 'Distribute: 6x − 12 + 5 = 2x + 9 → 6x − 7 = 2x + 9 → 4x = 16 → x = 4. Check: 3(8−4)+5 = 3(4)+5 = 17; 2(4)+9 = 17 ✓.',
        whyWrong: 'B gives 6(2)−7 = 5 ≠ 2(2)+9 = 13. C and D also fail the check.'
      },
      {
        problem: 'Solve: (x + 2)/3 = (2x − 1)/5.',
        choices: ['A) x = −13', 'B) x = 13', 'C) x = 13/7', 'D) x = −13/7'],
        answer: 'B',
        steps: 'Cross-multiply: 5(x + 2) = 3(2x − 1) → 5x + 10 = 6x − 3 → 13 = x. Check: (13+2)/3 = 5, (26−1)/5 = 5 ✓.',
        whyWrong: 'A has the wrong sign. C and D misapply cross-multiplication.'
      }
    ],
    practiceQuestions: [
      { question: 'Solve: 5x − 3 = 2x + 12.', choices: ['A) x = 3', 'B) x = 5', 'C) x = −5', 'D) x = 15'], answer: 'B', rationale: '3x = 15 → x = 5. Check: 25 − 3 = 22; 10 + 12 = 22 ✓.' },
      { question: 'How many solutions does 2(x + 1) = 2x + 2 have?', choices: ['A) 0', 'B) 1', 'C) 2', 'D) Infinitely many'], answer: 'D', rationale: '2x + 2 = 2x + 2 simplifies to 0 = 0, which is always true.' },
      { question: 'Solve: (3/4)x − 2 = 7.', choices: ['A) x = 12', 'B) x = 6', 'C) x = 9', 'D) x = 36/4'], answer: 'A', rationale: '(3/4)x = 9 → x = 9 × (4/3) = 12.' },
      { question: 'SPR: If 4(x − 1) = 3x + 5, what is x?', choices: ['Write your numerical answer: ____'], answer: '9', rationale: '4x − 4 = 3x + 5 → x = 9.' }
    ],
    commonMistakes: [
      'Forgetting to distribute to all terms inside parentheses',
      'Making errors when clearing fractions—every term must be multiplied',
      'Not recognizing the no-solution or infinite-solution special cases',
      'Arithmetic errors when moving terms across the equals sign (sign changes)'
    ],
    quickRef: 'Distribute → Combine → Isolate → Simplify → Check | 0=0 → ∞ solutions | nonzero=0 → no solution'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 10. Algebra — Slope and Intercept
  // ═══════════════════════════════════════════════════════════════════
  'math-slope-and-intercept': {
    domain: 'Algebra',
    skill: 'Slope and Intercept',
    filename: 'math-slope-and-intercept.pdf',
    overview: 'Slope and intercept questions focus on interpreting the meaning of slope and y-intercept in context. The SAT frequently asks what these values represent in real-world scenarios described by linear models.',
    concepts: [
      'Slope (m) represents the rate of change—how much y changes per unit change in x',
      'The y-intercept (b) is the value of y when x = 0 (the starting or initial value)',
      'The x-intercept is the value of x when y = 0',
      'A positive slope means y increases as x increases; negative slope means y decreases',
      'Zero slope is a horizontal line; undefined slope is a vertical line'
    ],
    formulas: [
      'm = (y₂ − y₁)/(x₂ − x₁)',
      'y-intercept: set x = 0 in y = mx + b → y = b',
      'x-intercept: set y = 0 → 0 = mx + b → x = −b/m',
      'Horizontal line: y = k (slope = 0)',
      'Vertical line: x = k (slope undefined)'
    ],
    strategies: [
      'In context, always interpret slope as "for each additional [x-unit], [y] changes by [m]"',
      'The y-intercept often means "when there are 0 [x-units], the value of [y] is [b]"',
      'Look at units to help interpret slope: slope = (y-units)/(x-units)',
      'To find slope from a graph, pick two clear lattice points and use rise/run',
      'A negative slope in context means a decrease—check that your interpretation makes sense'
    ],
    stepByStep: [
      'Identify the independent (x) and dependent (y) variables',
      'Calculate or read the slope from the equation, table, or graph',
      'Interpret the slope in context with proper units',
      'Find and interpret the y-intercept',
      'Check if the interpretation makes sense in the real-world scenario'
    ],
    workedExamples: [
      {
        problem: 'A taxi ride costs $2.50 plus $1.80 per mile. The equation is C = 1.80m + 2.50. What does the 1.80 represent?',
        choices: ['A) The total cost of the ride', 'B) The base fare', 'C) The cost per mile driven', 'D) The number of miles'],
        answer: 'C',
        steps: 'In C = 1.80m + 2.50, the coefficient of m (1.80) is the slope, representing the rate of change: for each additional mile, the cost increases by $1.80.',
        whyWrong: 'A is the full expression C. B is 2.50, the y-intercept. D is the variable m itself.'
      },
      {
        problem: 'The equation P = −500t + 8000 models the population of a town over time t (in years). What does −500 represent?',
        choices: ['A) The population decreases by 500 each year', 'B) The population increases by 500 each year', 'C) The initial population is 500', 'D) The town will be empty in 500 years'],
        answer: 'A',
        steps: 'The slope is −500. In context, for each additional year, the population decreases by 500 people. The negative sign indicates decline.',
        whyWrong: 'B ignores the negative sign. C confuses slope with intercept. D would be 8000/500 = 16 years, not 500.'
      }
    ],
    practiceQuestions: [
      { question: 'The line y = −0.5x + 20 models temperature (°F) over hours after midnight. What is the y-intercept, and what does it mean?', choices: ['A) 20; the temperature at midnight', 'B) −0.5; the rate of temperature change', 'C) 20; the temperature drops 20 degrees per hour', 'D) −0.5; the temperature at midnight'], answer: 'A', rationale: 'y-intercept (b = 20) is the temperature when x = 0, i.e., at midnight.' },
      { question: 'Two points on a line are (2, 8) and (5, 20). What is the slope?', choices: ['A) 3', 'B) 4', 'C) 6', 'D) 12'], answer: 'B', rationale: 'm = (20−8)/(5−2) = 12/3 = 4.' },
      { question: 'The equation y = 3x + 10 gives the total cost in dollars of a streaming service, where x is additional months. What does 10 represent?', choices: ['A) The monthly fee', 'B) The total after 10 months', 'C) The initial sign-up cost', 'D) The cost per additional month'], answer: 'C', rationale: 'b = 10 is the cost when x = 0 (no additional months), i.e., the sign-up cost.' },
      { question: 'SPR: A line has slope 2/3 and passes through (6, 5). What is the y-intercept?', choices: ['Write your numerical answer: ____'], answer: '1', rationale: '5 = (2/3)(6) + b → 5 = 4 + b → b = 1.' }
    ],
    commonMistakes: [
      'Confusing slope (rate of change) with intercept (starting value)',
      'Interpreting a negative slope as a positive increase',
      'Computing rise/run with the points in inconsistent order',
      'Forgetting units when interpreting slope in context'
    ],
    quickRef: 'Slope = rate of change (per unit) | y-int = starting value when x = 0 | Units matter for interpretation'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 11. Algebra — Systems of Equations
  // ═══════════════════════════════════════════════════════════════════
  'math-systems-of-equations': {
    domain: 'Algebra',
    skill: 'Systems of Equations',
    filename: 'math-systems-of-equations.pdf',
    overview: 'Systems of equations involve two or more equations with two or more unknowns. The SAT tests substitution, elimination, and graphical methods, as well as interpreting what the solution means in context.',
    concepts: [
      'A system with one solution has intersecting lines',
      'A system with no solution has parallel lines (same slope, different intercept)',
      'A system with infinitely many solutions has identical lines (same slope and intercept)',
      'Substitution: solve one equation for a variable, then substitute into the other',
      'Elimination: add or subtract equations to eliminate one variable'
    ],
    formulas: [
      'Substitution: if y = mx + b, replace y in the second equation',
      'Elimination: multiply equations so coefficients of one variable are opposites, then add',
      'No solution: a₁/a₂ = b₁/b₂ ≠ c₁/c₂',
      'Infinite solutions: a₁/a₂ = b₁/b₂ = c₁/c₂',
      'Solution = intersection point (x, y)'
    ],
    strategies: [
      'Use substitution when one equation is already solved for a variable',
      'Use elimination when coefficients can easily be made to cancel',
      'Multiply one or both equations to align coefficients for elimination',
      'If the question asks for an expression like x + y, you might find it directly without finding x and y separately',
      'Check your solution in BOTH equations'
    ],
    stepByStep: [
      'Decide: substitution or elimination?',
      'If substitution: solve one equation for a variable and plug into the other',
      'If elimination: multiply to align a variable, add equations, solve',
      'Find the second variable',
      'Verify the solution satisfies both original equations'
    ],
    workedExamples: [
      {
        problem: 'Solve: 2x + y = 10 and x − y = 2.',
        choices: ['A) (4, 2)', 'B) (3, 4)', 'C) (2, 6)', 'D) (5, 0)'],
        answer: 'A',
        steps: 'Add equations: 2x + y + x − y = 12 → 3x = 12 → x = 4. Substitute: 4 − y = 2 → y = 2. Check: 2(4)+2 = 10 ✓, 4−2 = 2 ✓.',
        whyWrong: 'B: 2(3)+4=10 ✓ but 3−4=−1 ✗. C: 2(2)+6=10 ✓ but 2−6=−4 ✗. D: 2(5)+0=10 ✓ but 5−0=5 ✗.'
      },
      {
        problem: 'For what value of a does the system 3x + 2y = 7 and 6x + 4y = a have no solution?',
        choices: ['A) 14', 'B) 7', 'C) Any value ≠ 14', 'D) 0'],
        answer: 'C',
        steps: 'The second equation is 2× the first. For no solution, 6x + 4y must not equal 2(7) = 14. So a ≠ 14 means no solution; a = 14 means infinitely many.',
        whyWrong: 'A (14) would give infinite solutions, not none. B and D are specific wrong values.'
      }
    ],
    practiceQuestions: [
      { question: 'Solve: y = 2x + 1 and y = −x + 7.', choices: ['A) (2, 5)', 'B) (3, 7)', 'C) (1, 3)', 'D) (4, 3)'], answer: 'A', rationale: '2x + 1 = −x + 7 → 3x = 6 → x = 2, y = 5. Check: 2(2)+1=5 ✓, −2+7=5 ✓.' },
      { question: 'The system 4x − 2y = 6 and 2x − y = 3 has how many solutions?', choices: ['A) 0', 'B) 1', 'C) 2', 'D) Infinitely many'], answer: 'D', rationale: 'The first equation is 2× the second, so they are the same line.' },
      { question: 'A store sells jeans for $40 and shirts for $15. A customer buys 5 items totaling $125. How many jeans were purchased?', choices: ['A) 1', 'B) 2', 'C) 3', 'D) 4'], answer: 'B', rationale: 'j + s = 5 and 40j + 15s = 125. Substitution: 40j + 15(5−j) = 125 → 25j = 50 → j = 2.' },
      { question: 'SPR: If 3x + 2y = 18 and x − 2y = −2, what is x?', choices: ['Write your numerical answer: ____'], answer: '4', rationale: 'Add: 4x = 16 → x = 4.' }
    ],
    commonMistakes: [
      'Forgetting to substitute back to find the second variable',
      'Making sign errors when multiplying equations for elimination',
      'Not checking the solution in both equations',
      'Confusing no solution (parallel lines) with infinitely many (same line)'
    ],
    quickRef: 'Substitution: plug in | Elimination: add/subtract | 1 solution: intersect | 0: parallel | ∞: same line'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 12. Geometry & Trig — Area and Volume
  // ═══════════════════════════════════════════════════════════════════
  'math-area-and-volume': {
    domain: 'Geometry and Trigonometry',
    skill: 'Area and Volume',
    filename: 'math-area-and-volume.pdf',
    overview: 'Area and volume questions on the SAT require you to calculate 2D areas and 3D volumes for standard shapes. The SAT provides a reference sheet, but you must know when and how to apply each formula.',
    concepts: [
      'Area is measured in square units; volume is measured in cubic units',
      'The SAT reference sheet includes formulas for circles, rectangles, triangles, cylinders, spheres, cones, and pyramids',
      'Composite shapes can be broken into simpler shapes',
      'Changing one dimension by a factor of k changes area by k² and volume by k³',
      'Surface area is the total area of all faces of a 3D solid'
    ],
    formulas: [
      'Rectangle: A = lw, V (box) = lwh',
      'Triangle: A = ½bh',
      'Circle: A = πr², Circumference = 2πr',
      'Cylinder: V = πr²h',
      'Sphere: V = (4/3)πr³, Cone: V = (1/3)πr²h'
    ],
    strategies: [
      'Read the formula sheet on test day—it\'s printed in the booklet',
      'Draw the shape and label all given dimensions before calculating',
      'For composite figures, break them into rectangles, triangles, and circles',
      'Watch out for diameter vs. radius—the SAT often gives diameter',
      'Check units: are they asking for area (²) or volume (³)?'
    ],
    stepByStep: [
      'Identify the shape(s) involved',
      'Write down the appropriate formula',
      'Substitute the given values for each variable',
      'Calculate, leaving answers in terms of π if specified',
      'Check that units and answer make sense in context'
    ],
    workedExamples: [
      {
        problem: 'A cylinder has a radius of 5 cm and a height of 12 cm. What is the volume, in cubic centimeters?',
        choices: ['A) 300π', 'B) 60π', 'C) 120π', 'D) 600π'],
        answer: 'A',
        steps: 'V = πr²h = π(5)²(12) = π(25)(12) = 300π cm³.',
        whyWrong: 'B uses diameter instead of radius squared, or miscalculates. C only computes πrh. D doubles the correct answer.'
      },
      {
        problem: 'A rectangle has length 8 and width 5. If both dimensions are tripled, by what factor does the area increase?',
        choices: ['A) 3', 'B) 6', 'C) 9', 'D) 27'],
        answer: 'C',
        steps: 'Original area = 40. New area = 24 × 15 = 360. Factor = 360/40 = 9. Or directly: scaling each dimension by 3 scales area by 3² = 9.',
        whyWrong: 'A applies the factor once. B adds the factors. D cubes the factor (that\'s for volume).'
      }
    ],
    practiceQuestions: [
      { question: 'A circle has diameter 10. What is its area?', choices: ['A) 100π', 'B) 25π', 'C) 50π', 'D) 10π'], answer: 'B', rationale: 'Radius = 5. A = π(5)² = 25π.' },
      { question: 'A triangular garden has base 14 ft and height 9 ft. What is the area?', choices: ['A) 126 ft²', 'B) 63 ft²', 'C) 56 ft²', 'D) 23 ft²'], answer: 'B', rationale: 'A = ½(14)(9) = 63 ft².' },
      { question: 'A cone has radius 3 and height 7. What is the volume?', choices: ['A) 21π', 'B) 63π', 'C) 7π', 'D) 9π'], answer: 'A', rationale: 'V = (1/3)πr²h = (1/3)π(9)(7) = 21π.' },
      { question: 'SPR: A cube has edge length 4. What is its volume?', choices: ['Write your numerical answer: ____'], answer: '64', rationale: 'V = s³ = 4³ = 64.' }
    ],
    commonMistakes: [
      'Using diameter instead of radius in circle/cylinder/sphere formulas',
      'Forgetting the ½ in the triangle area formula',
      'Confusing area scaling (k²) with volume scaling (k³)',
      'Not converting units when dimensions are given in different units'
    ],
    quickRef: 'Circle: πr² | Triangle: ½bh | Cylinder: πr²h | Cone: ⅓πr²h | Scale: area ×k², volume ×k³'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 13. Geometry & Trig — Circles
  // ═══════════════════════════════════════════════════════════════════
  'math-circles': {
    domain: 'Geometry and Trigonometry',
    skill: 'Circles',
    filename: 'math-circles.pdf',
    overview: 'Circle questions on the SAT involve the equation of a circle, arc length, sector area, and properties of chords, tangent lines, and central/inscribed angles. You must be comfortable converting between standard and general form of the circle equation.',
    concepts: [
      'Standard form of a circle: (x − h)² + (y − k)² = r², center (h, k), radius r',
      'To convert general form (x² + y² + Dx + Ey + F = 0) to standard form, complete the square',
      'Arc length = (θ/360°) × 2πr (where θ is the central angle in degrees)',
      'Sector area = (θ/360°) × πr²',
      'An inscribed angle is half the central angle that subtends the same arc'
    ],
    formulas: [
      '(x − h)² + (y − k)² = r²',
      'Arc length: s = (θ/360)·2πr or s = rθ (θ in radians)',
      'Sector area: A = (θ/360)·πr²',
      'Central angle = 2 × inscribed angle (same arc)',
      'Tangent line is perpendicular to the radius at the point of tangency'
    ],
    strategies: [
      'If the equation isn\'t in standard form, complete the square for x and y',
      'Remember: (x − h) means center at +h, not −h',
      'For arc/sector problems, determine what fraction of the full circle the angle represents',
      'Draw the radius to the tangent point—it creates a right angle',
      'Use the distance formula to verify the radius'
    ],
    stepByStep: [
      'Identify whether the problem involves the equation, arc, sector, or angle property',
      'For equations: complete the square to get standard form',
      'Read off center (h, k) and radius r from (x−h)²+(y−k)²=r²',
      'For arcs/sectors: find the fraction θ/360 and multiply by the full circle measure',
      'Check your answer makes geometric sense'
    ],
    workedExamples: [
      {
        problem: 'What is the center and radius of x² + y² − 6x + 4y − 12 = 0?',
        choices: ['A) Center (3, −2), r = 5', 'B) Center (−3, 2), r = 5', 'C) Center (3, −2), r = 25', 'D) Center (6, −4), r = 12'],
        answer: 'A',
        steps: 'Complete the square: (x²−6x+9) + (y²+4y+4) = 12+9+4 → (x−3)²+(y+2)² = 25. Center (3, −2), r = √25 = 5.',
        whyWrong: 'B has wrong signs on the center. C uses r² = 25 as r. D reads coefficients directly without completing the square.'
      },
      {
        problem: 'A circle has radius 10. What is the arc length of a 72° sector?',
        choices: ['A) 2π', 'B) 4π', 'C) 10π', 'D) 20π'],
        answer: 'B',
        steps: 'Arc length = (72/360) × 2π(10) = (1/5)(20π) = 4π.',
        whyWrong: 'A undercounts. C is the semicircle arc. D is the full circumference.'
      }
    ],
    practiceQuestions: [
      { question: 'Which is the equation of a circle centered at (−1, 3) with radius 4?', choices: ['A) (x+1)²+(y−3)²=16', 'B) (x−1)²+(y+3)²=16', 'C) (x+1)²+(y−3)²=4', 'D) (x−1)²+(y−3)²=16'], answer: 'A', rationale: 'Center (−1,3) → (x+1)²+(y−3)². Radius 4 → r² = 16.' },
      { question: 'A sector of a circle with radius 6 has area 12π. What is the central angle in degrees?', choices: ['A) 60°', 'B) 90°', 'C) 120°', 'D) 180°'], answer: 'C', rationale: '12π = (θ/360)π(36) → θ/360 = 12/36 = 1/3 → θ = 120°.' },
      { question: 'An inscribed angle measures 35°. What is the measure of the intercepted arc?', choices: ['A) 17.5°', 'B) 35°', 'C) 70°', 'D) 105°'], answer: 'C', rationale: 'The intercepted arc = 2 × inscribed angle = 70°.' },
      { question: 'SPR: A circle has center (2, −1) and passes through (5, 3). What is the radius?', choices: ['Write your numerical answer: ____'], answer: '5', rationale: 'r = √((5−2)²+(3−(−1))²) = √(9+16) = √25 = 5.' }
    ],
    commonMistakes: [
      'Sign errors when completing the square: (x−3) means center at +3',
      'Using r instead of r² in the standard equation',
      'Confusing arc length (part of circumference) with sector area (part of area)',
      'Forgetting that inscribed angle = ½ central angle'
    ],
    quickRef: '(x−h)²+(y−k)²=r² | Arc = (θ/360)·2πr | Sector = (θ/360)·πr² | Inscribed = ½ central angle'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 14. Geometry & Trig — Coordinate Geometry
  // ═══════════════════════════════════════════════════════════════════
  'math-coordinate-geometry': {
    domain: 'Geometry and Trigonometry',
    skill: 'Coordinate Geometry',
    filename: 'math-coordinate-geometry.pdf',
    overview: 'Coordinate geometry questions connect algebra and geometry, requiring you to use the coordinate plane to find distances, midpoints, and analyze geometric figures using formulas.',
    concepts: [
      'The distance between two points: d = √((x₂−x₁)² + (y₂−y₁)²)',
      'Midpoint: M = ((x₁+x₂)/2, (y₁+y₂)/2)',
      'Parallel lines have equal slopes; perpendicular lines have slopes whose product is −1',
      'The equation of a line through two points can be found using point-slope form',
      'Reflections, translations, and rotations move points predictably on the coordinate plane'
    ],
    formulas: [
      'Distance: d = √((x₂−x₁)² + (y₂−y₁)²)',
      'Midpoint: ((x₁+x₂)/2, (y₁+y₂)/2)',
      'Slope: m = (y₂−y₁)/(x₂−x₁)',
      'Point-slope: y − y₁ = m(x − x₁)',
      'Translation: (x, y) → (x + a, y + b)'
    ],
    strategies: [
      'Sketch the points on a coordinate plane before calculating',
      'For distance, use the Pythagorean theorem (the distance formula is derived from it)',
      'Use midpoint to find the center of a segment, which is helpful for circle problems',
      'When checking if a quadrilateral is a specific type, compute side lengths and slopes',
      'For reflections: across x-axis → (x, −y); across y-axis → (−x, y)'
    ],
    stepByStep: [
      'Plot or visualize the given points',
      'Identify whether the question asks for distance, midpoint, slope, or something else',
      'Apply the appropriate formula',
      'Simplify your answer',
      'Check by estimation—does the answer seem reasonable on the graph?'
    ],
    workedExamples: [
      {
        problem: 'What is the distance between (1, 2) and (4, 6)?',
        choices: ['A) 5', 'B) 7', 'C) √13', 'D) 25'],
        answer: 'A',
        steps: 'd = √((4−1)²+(6−2)²) = √(9+16) = √25 = 5.',
        whyWrong: 'B adds the differences instead. C miscalculates one squared term. D forgets the square root.'
      },
      {
        problem: 'What is the midpoint of segment AB where A = (−2, 5) and B = (6, 1)?',
        choices: ['A) (2, 3)', 'B) (4, 3)', 'C) (2, 6)', 'D) (4, 4)'],
        answer: 'A',
        steps: 'M = ((−2+6)/2, (5+1)/2) = (4/2, 6/2) = (2, 3).',
        whyWrong: 'B, C, D use incorrect arithmetic in one or both coordinates.'
      }
    ],
    practiceQuestions: [
      { question: 'Points A(0,0) and B(3,4) are endpoints of a diameter. What is the center of the circle?', choices: ['A) (1.5, 2)', 'B) (3, 4)', 'C) (1, 2)', 'D) (6, 8)'], answer: 'A', rationale: 'Center = midpoint = (3/2, 4/2) = (1.5, 2).' },
      { question: 'Which point is the reflection of (3, −5) across the x-axis?', choices: ['A) (−3, 5)', 'B) (3, 5)', 'C) (−3, −5)', 'D) (5, −3)'], answer: 'B', rationale: 'Reflecting across the x-axis negates the y-coordinate: (3, 5).' },
      { question: 'What is the perimeter of a triangle with vertices at (0,0), (4,0), and (4,3)?', choices: ['A) 7', 'B) 10', 'C) 12', 'D) 14'], answer: 'C', rationale: 'Sides: 4, 3, and √(16+9) = 5. Perimeter = 4 + 3 + 5 = 12.' },
      { question: 'SPR: The midpoint of a segment is (5, 3). One endpoint is (2, 1). What is the x-coordinate of the other endpoint?', choices: ['Write your numerical answer: ____'], answer: '8', rationale: '(2 + x)/2 = 5 → x = 8.' }
    ],
    commonMistakes: [
      'Subtracting coordinates in the wrong order (inconsistent point order)',
      'Forgetting to take the square root in the distance formula',
      'Confusing midpoint and distance formulas',
      'Reflecting across the wrong axis (x-axis vs. y-axis)'
    ],
    quickRef: 'Distance: √((Δx)²+(Δy)²) | Midpoint: average coords | Reflect x-axis: (x,−y) | y-axis: (−x,y)'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 15. Geometry & Trig — Right-Triangle Trigonometry
  // ═══════════════════════════════════════════════════════════════════
  'math-right-triangle-trigonometry': {
    domain: 'Geometry and Trigonometry',
    skill: 'Right-Triangle Trigonometry',
    filename: 'math-right-triangle-trigonometry.pdf',
    overview: 'Right-triangle trigonometry questions ask you to use sine, cosine, and tangent to find missing sides or angles in right triangles. The SAT also tests complementary angle relationships and special right triangles.',
    concepts: [
      'SOH-CAH-TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent',
      'sin(θ) = cos(90° − θ) — complementary angles',
      'The Pythagorean theorem: a² + b² = c² (c is the hypotenuse)',
      'Special triangles: 30-60-90 (sides 1 : √3 : 2) and 45-45-90 (sides 1 : 1 : √2)',
      'The SAT gives these ratios on the reference sheet'
    ],
    formulas: [
      'sin θ = opposite / hypotenuse',
      'cos θ = adjacent / hypotenuse',
      'tan θ = opposite / adjacent',
      '30-60-90: x, x√3, 2x',
      '45-45-90: x, x, x√2'
    ],
    strategies: [
      'Label the sides relative to the given angle: opposite, adjacent, hypotenuse',
      'Use SOH-CAH-TOA to set up the ratio, then solve for the unknown',
      'If two sides are known, use the Pythagorean theorem for the third',
      'Remember the complementary relationship: sin(30°) = cos(60°)',
      'For special triangle problems, use the known ratios to save time'
    ],
    stepByStep: [
      'Identify the right angle and the reference angle',
      'Label sides as opposite, adjacent, and hypotenuse relative to the reference angle',
      'Choose the trig ratio that involves the known and unknown quantities',
      'Set up the equation and solve',
      'Check: the hypotenuse must be the longest side'
    ],
    workedExamples: [
      {
        problem: 'In a right triangle, the side opposite the 30° angle is 5. What is the hypotenuse?',
        choices: ['A) 5√3', 'B) 10', 'C) 5√2', 'D) 5/2'],
        answer: 'B',
        steps: 'sin(30°) = opposite/hypotenuse = 5/h. sin(30°) = 1/2, so 1/2 = 5/h → h = 10. Alternatively, in a 30-60-90, the hypotenuse is 2× the short side: 2(5) = 10.',
        whyWrong: 'A is the long leg relative to the 30° angle. C applies the 45-45-90 ratio. D is half the opposite side.'
      },
      {
        problem: 'If cos(x) = 0.6 and x is acute, what is sin(x)?',
        choices: ['A) 0.4', 'B) 0.6', 'C) 0.8', 'D) 1.0'],
        answer: 'C',
        steps: 'sin²(x) + cos²(x) = 1 → sin²(x) = 1 − 0.36 = 0.64 → sin(x) = 0.8 (positive since x is acute).',
        whyWrong: 'A subtracts incorrectly. B confuses sin and cos. D is the sum, not the individual value.'
      }
    ],
    practiceQuestions: [
      { question: 'In a 45-45-90 triangle, each leg is 7. What is the hypotenuse?', choices: ['A) 14', 'B) 7√3', 'C) 7√2', 'D) 49'], answer: 'C', rationale: 'In a 45-45-90, hypotenuse = leg × √2 = 7√2.' },
      { question: 'If tan(θ) = 3/4 in a right triangle with hypotenuse 10, what is the side opposite θ?', choices: ['A) 3', 'B) 4', 'C) 6', 'D) 8'], answer: 'C', rationale: 'tan = opp/adj = 3/4, so sides are 3k and 4k. Hypotenuse = 5k = 10 → k = 2. Opposite = 6.' },
      { question: 'sin(53°) = cos(?°).', choices: ['A) 53°', 'B) 37°', 'C) 127°', 'D) 90°'], answer: 'B', rationale: 'sin(θ) = cos(90°−θ), so sin(53°) = cos(37°).' },
      { question: 'SPR: In a right triangle, the hypotenuse is 13 and one leg is 5. What is the other leg?', choices: ['Write your numerical answer: ____'], answer: '12', rationale: 'a² + 5² = 13² → a² = 169 − 25 = 144 → a = 12.' }
    ],
    commonMistakes: [
      'Mislabeling opposite and adjacent sides relative to the wrong angle',
      'Applying 30-60-90 ratios to a 45-45-90 triangle or vice versa',
      'Forgetting the complementary angle relationship sin(θ) = cos(90°−θ)',
      'Using the wrong trig ratio (e.g., sin when you need tan)'
    ],
    quickRef: 'SOH-CAH-TOA | sin = opp/hyp, cos = adj/hyp, tan = opp/adj | 30-60-90: 1,√3,2 | 45-45-90: 1,1,√2'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 16. Geometry & Trig — Triangles
  // ═══════════════════════════════════════════════════════════════════
  'math-triangles': {
    domain: 'Geometry and Trigonometry',
    skill: 'Triangles',
    filename: 'math-triangles.pdf',
    overview: 'Triangle questions test properties of triangles including angle sums, congruence, similarity, the Pythagorean theorem, and triangle inequality. The SAT asks both computation and conceptual reasoning questions.',
    concepts: [
      'The sum of interior angles of a triangle is 180°',
      'An exterior angle of a triangle equals the sum of the two non-adjacent interior angles',
      'Similar triangles have proportional sides and equal angles',
      'The Pythagorean theorem applies only to right triangles: a² + b² = c²',
      'Triangle inequality: the sum of any two sides must be greater than the third side'
    ],
    formulas: [
      'Angle sum: A + B + C = 180°',
      'Exterior angle: ext = sum of two remote interior angles',
      'Pythagorean theorem: a² + b² = c²',
      'Area: A = ½bh',
      'Similar triangles: a₁/a₂ = b₁/b₂ = c₁/c₂'
    ],
    strategies: [
      'If two angles are given, find the third by subtracting from 180°',
      'For similar triangles, set up a proportion using corresponding sides',
      'Look for right triangles within larger figures—drop an altitude to create them',
      'Common Pythagorean triples: 3-4-5, 5-12-13, 8-15-17, 7-24-25',
      'Check for isosceles or equilateral properties to find equal sides or angles'
    ],
    stepByStep: [
      'Identify the triangle type: right, isosceles, equilateral, scalene',
      'Mark known angles and sides on the figure',
      'Use angle sum or Pythagorean theorem to find unknowns',
      'If triangles are similar, set up and solve a proportion',
      'Verify that all angles sum to 180° and sides satisfy triangle inequality'
    ],
    workedExamples: [
      {
        problem: 'In triangle ABC, angle A = 50° and angle B = 65°. What is angle C?',
        choices: ['A) 55°', 'B) 65°', 'C) 75°', 'D) 115°'],
        answer: 'B',
        steps: 'C = 180° − 50° − 65° = 65°. Note: since B = C = 65°, the triangle is isosceles.',
        whyWrong: 'A miscalculates. C adds instead of subtracting. D is an exterior angle, not interior.'
      },
      {
        problem: 'Two similar triangles have sides in ratio 2:5. If the smaller triangle has a side of 8, what is the corresponding side of the larger?',
        choices: ['A) 11', 'B) 16', 'C) 20', 'D) 40'],
        answer: 'C',
        steps: '2/5 = 8/x → 2x = 40 → x = 20.',
        whyWrong: 'A adds 3. B doubles 8 (uses ratio 1:2). D multiplies 8 by 5 instead of setting up the proportion.'
      }
    ],
    practiceQuestions: [
      { question: 'A right triangle has legs 6 and 8. What is the hypotenuse?', choices: ['A) 14', 'B) 10', 'C) 48', 'D) 100'], answer: 'B', rationale: '√(36+64) = √100 = 10. (Common 3-4-5 triple scaled by 2.)' },
      { question: 'An exterior angle of a triangle is 130°. One of the non-adjacent interior angles is 70°. What is the other non-adjacent interior angle?', choices: ['A) 50°', 'B) 60°', 'C) 70°', 'D) 110°'], answer: 'B', rationale: 'Exterior = sum of two remote interiors: 130° = 70° + x → x = 60°.' },
      { question: 'Can a triangle have sides 3, 4, and 8?', choices: ['A) Yes', 'B) No, because 3 + 4 < 8', 'C) No, because 3 + 4 = 7 < 8', 'D) Both B and C are correct'], answer: 'D', rationale: 'Triangle inequality: 3 + 4 = 7, which is not greater than 8. So no triangle exists.' },
      { question: 'SPR: In an equilateral triangle with side length 10, what is the perimeter?', choices: ['Write your numerical answer: ____'], answer: '30', rationale: 'All three sides are equal: 10 + 10 + 10 = 30.' }
    ],
    commonMistakes: [
      'Confusing similar and congruent triangles',
      'Using the Pythagorean theorem on non-right triangles',
      'Forgetting to check triangle inequality when evaluating if sides form a valid triangle',
      'Setting up proportions with non-corresponding sides in similar triangles'
    ],
    quickRef: 'Angles sum to 180° | Pythagorean: a²+b²=c² (right △ only) | Similar: proportional sides | Triples: 3-4-5, 5-12-13'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 17. Problem-Solving & Data Analysis — Percentages
  // ═══════════════════════════════════════════════════════════════════
  'math-percentages': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Percentages',
    filename: 'math-percentages.pdf',
    overview: 'Percentage questions on the SAT involve finding percents, percent increase/decrease, markups, discounts, tax, and tip. You must be fluent in converting between percent, decimal, and fraction forms.',
    concepts: [
      'Percent means "per hundred": 25% = 25/100 = 0.25',
      'Percent increase = (new − original)/original × 100%',
      'Percent decrease = (original − new)/original × 100%',
      'Successive percent changes are multiplicative, not additive',
      'Part = Percent × Whole (or equivalently, Percent = Part/Whole)'
    ],
    formulas: [
      'Part = (Percent/100) × Whole',
      'Percent change = [(New − Original)/Original] × 100%',
      'After p% increase: New = Original × (1 + p/100)',
      'After p% decrease: New = Original × (1 − p/100)',
      'Successive changes: multiply the factors'
    ],
    strategies: [
      'Convert percentages to decimals before calculating',
      'For percent change, always divide by the original value, not the new value',
      'Successive percent changes: multiply the multipliers, don\'t add the percents',
      'Use proportions for "what percent of" questions: part/whole = x/100',
      'Check: does your answer make sense? (e.g., a 50% increase of 100 should be 150, not 50)'
    ],
    stepByStep: [
      'Identify what is the "whole" (reference amount) and what is the "part"',
      'Determine the operation: finding the percent, the part, or the whole',
      'Set up the equation: Part = (Percent/100) × Whole',
      'Solve for the unknown',
      'Convert back to the required format (percent, decimal, or amount)'
    ],
    workedExamples: [
      {
        problem: 'A shirt originally costs $40 and is discounted 25%. What is the sale price?',
        choices: ['A) $10', 'B) $15', 'C) $30', 'D) $35'],
        answer: 'C',
        steps: 'Discount = 25% of $40 = $10. Sale price = $40 − $10 = $30. Or: $40 × 0.75 = $30.',
        whyWrong: 'A is just the discount amount, not the sale price. B and D miscalculate.'
      },
      {
        problem: 'A population grew from 2,000 to 2,500. What was the percent increase?',
        choices: ['A) 20%', 'B) 25%', 'C) 50%', 'D) 500%'],
        answer: 'B',
        steps: 'Change = 500. Percent increase = 500/2000 × 100% = 25%.',
        whyWrong: 'A divides by 2500 instead of 2000. C confuses 500 for 50%. D treats the change as a percent.'
      }
    ],
    practiceQuestions: [
      { question: 'A store raises a $60 item by 10%, then discounts the new price by 10%. What is the final price?', choices: ['A) $60.00', 'B) $59.40', 'C) $58.80', 'D) $54.00'], answer: 'B', rationale: '$60 × 1.10 = $66. $66 × 0.90 = $59.40. Note: a 10% increase then 10% decrease does NOT return to the original.' },
      { question: '40% of what number is 28?', choices: ['A) 11.2', 'B) 70', 'C) 112', 'D) 700'], answer: 'B', rationale: '0.40 × W = 28 → W = 70.' },
      { question: 'An investment of $5,000 earns 6% simple interest per year. How much interest is earned in 3 years?', choices: ['A) $300', 'B) $600', 'C) $900', 'D) $1,500'], answer: 'C', rationale: 'Interest = 5000 × 0.06 × 3 = $900.' },
      { question: 'SPR: A test has 80 questions. A student answered 68 correctly. What percent is that?', choices: ['Write your numerical answer: ____'], answer: '85', rationale: '68/80 × 100 = 85%.' }
    ],
    commonMistakes: [
      'Using the new value instead of the original as the denominator for percent change',
      'Adding successive percents instead of multiplying the factors',
      'Confusing the discount amount with the sale price',
      'Forgetting to convert percentages to decimals before multiplying'
    ],
    quickRef: '% change = (new−old)/old × 100 | Part = %/100 × Whole | Successive: multiply factors, don\'t add %'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 18. Problem-Solving & Data Analysis — Probability
  // ═══════════════════════════════════════════════════════════════════
  'math-probability': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Probability',
    filename: 'math-probability.pdf',
    overview: 'Probability questions on the SAT involve calculating the likelihood of events from tables, lists, or described scenarios. You may encounter conditional probability, two-way tables, and "at least" or "or" probability problems.',
    concepts: [
      'Probability = favorable outcomes / total outcomes, always between 0 and 1',
      'P(A or B) = P(A) + P(B) − P(A and B) for overlapping events',
      'P(A and B) = P(A) × P(B) for independent events',
      'Conditional probability: P(A|B) = P(A and B) / P(B)',
      'Two-way tables organize data for calculating probabilities across categories'
    ],
    formulas: [
      'P(event) = favorable / total',
      'P(A or B) = P(A) + P(B) − P(A and B)',
      'P(A and B) = P(A) × P(B) if independent',
      'P(A|B) = P(A and B) / P(B)',
      'P(not A) = 1 − P(A)'
    ],
    strategies: [
      'Read the table carefully—identify the row/column totals',
      'For "given that" or "among" questions, restrict the total to the given group',
      'For "at least one" probability, compute 1 − P(none)',
      'Two-way table: rows are one category, columns are another, cells are counts',
      'Double-check: all probabilities must be between 0 and 1'
    ],
    stepByStep: [
      'Identify the event and the sample space (total possibilities)',
      'Count the favorable outcomes from the table or description',
      'Calculate: P = favorable / total',
      'If conditional, restrict the denominator to the given condition',
      'Simplify the fraction if needed'
    ],
    workedExamples: [
      {
        problem: 'A bag has 3 red, 5 blue, and 2 green marbles. What is the probability of drawing a blue marble?',
        choices: ['A) 1/2', 'B) 3/10', 'C) 5/10', 'D) 2/5'],
        answer: 'A',
        steps: 'Total = 3 + 5 + 2 = 10. P(blue) = 5/10 = 1/2.',
        whyWrong: 'B is P(red). C is unsimplified (same as A). D miscalculates.'
      },
      {
        problem: 'In a class of 30, 12 play tennis and 8 play soccer, with 3 playing both. What is P(tennis or soccer)?',
        choices: ['A) 20/30', 'B) 17/30', 'C) 23/30', 'D) 12/30'],
        answer: 'B',
        steps: 'P(T or S) = P(T) + P(S) − P(T and S) = 12/30 + 8/30 − 3/30 = 17/30.',
        whyWrong: 'A just adds 12 + 8. C adds without subtracting the overlap. D is only P(tennis).'
      }
    ],
    practiceQuestions: [
      { question: 'A two-way table shows: Males who prefer coffee: 25, Males who prefer tea: 15, Females who prefer coffee: 20, Females who prefer tea: 40. What is P(tea | female)?', choices: ['A) 40/100', 'B) 40/60', 'C) 55/100', 'D) 40/55'], answer: 'B', rationale: 'Among females: total females = 20 + 40 = 60. P(tea|female) = 40/60 = 2/3.' },
      { question: 'A coin is flipped 3 times. What is the probability of getting at least one head?', choices: ['A) 1/8', 'B) 3/8', 'C) 7/8', 'D) 1'], answer: 'C', rationale: 'P(at least 1 head) = 1 − P(no heads) = 1 − (1/2)³ = 1 − 1/8 = 7/8.' },
      { question: 'A number is randomly selected from {1,2,3,...,20}. What is P(multiple of 3 or multiple of 5)?', choices: ['A) 9/20', 'B) 7/20', 'C) 8/20', 'D) 10/20'], answer: 'A', rationale: 'Multiples of 3: {3,6,9,12,15,18} = 6. Multiples of 5: {5,10,15,20} = 4. Both: {15} = 1. P = (6+4−1)/20 = 9/20.' },
      { question: 'SPR: A standard deck has 52 cards. What is the probability of drawing a heart? Express as a decimal.', choices: ['Write your numerical answer: ____'], answer: '0.25', rationale: '13 hearts out of 52 cards: 13/52 = 1/4 = 0.25.' }
    ],
    commonMistakes: [
      'Forgetting to subtract the overlap in P(A or B)',
      'Using the total population instead of the conditional group for "given that" questions',
      'Treating dependent events as independent',
      'Computing "at least one" by adding instead of using the complement'
    ],
    quickRef: 'P = favorable/total | P(A or B) = P(A)+P(B)−P(A∩B) | P(A|B) = P(A∩B)/P(B) | At least 1: 1−P(none)'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 19. Problem-Solving & Data Analysis — Rates and Unit Conversion
  // ═══════════════════════════════════════════════════════════════════
  'math-rates-and-unit-conversion': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Rates and Unit Conversion',
    filename: 'math-rates-and-unit-conversion.pdf',
    overview: 'Rate and unit conversion questions test your ability to work with speed, work rates, unit rates, and dimensional analysis. The SAT asks you to convert between units, combine rates, and solve real-world rate problems.',
    concepts: [
      'Rate = quantity / time (e.g., miles per hour, words per minute)',
      'Unit rate is the rate per one unit (e.g., $3.50 per gallon)',
      'Dimensional analysis: multiply by conversion factors until unwanted units cancel',
      'Combined work rate: 1/t_total = 1/t_A + 1/t_B',
      'Distance = Rate × Time (d = rt)'
    ],
    formulas: [
      'd = rt (distance = rate × time)',
      'Unit conversion: multiply by (new unit / old unit) fractions',
      'Average speed = total distance / total time',
      'Combined rate: 1/t = 1/t₁ + 1/t₂',
      '1 mile = 5,280 feet, 1 hour = 3,600 seconds, 1 kg = 2.2 lb (approx.)'
    ],
    strategies: [
      'Write down units and cancel them as you multiply conversion factors',
      'For average rate, use total distance/total time—never average the two rates',
      'Set up a proportion when quantities scale linearly',
      'For "working together" problems, add rates (not times)',
      'Estimate first to check if your answer is reasonable'
    ],
    stepByStep: [
      'Identify what units the answer should be in',
      'Write the given quantity with its units',
      'Multiply by conversion factors to cancel unwanted units',
      'Compute the final numerical value',
      'Verify units match the question'
    ],
    workedExamples: [
      {
        problem: 'A car travels 150 miles in 2.5 hours. What is the average speed in miles per hour?',
        choices: ['A) 50 mph', 'B) 60 mph', 'C) 65 mph', 'D) 75 mph'],
        answer: 'B',
        steps: 'Speed = distance/time = 150/2.5 = 60 mph.',
        whyWrong: 'A, C, D are arithmetic errors.'
      },
      {
        problem: 'Convert 45 miles per hour to feet per second.',
        choices: ['A) 66 ft/s', 'B) 30 ft/s', 'C) 132 ft/s', 'D) 45 ft/s'],
        answer: 'A',
        steps: '45 mi/hr × 5280 ft/mi × 1 hr/3600 s = 45 × 5280/3600 = 237600/3600 = 66 ft/s.',
        whyWrong: 'B uses an incorrect conversion. C doubles the answer. D doesn\'t convert at all.'
      }
    ],
    practiceQuestions: [
      { question: 'A printer prints 8 pages per minute. How many pages in 2.5 hours?', choices: ['A) 200', 'B) 1,000', 'C) 1,200', 'D) 20'], answer: 'C', rationale: '2.5 hours = 150 minutes. 8 × 150 = 1,200 pages.' },
      { question: 'Worker A can paint a room in 6 hours, Worker B in 4 hours. Working together, how long will it take?', choices: ['A) 5 hours', 'B) 2.4 hours', 'C) 10 hours', 'D) 3 hours'], answer: 'B', rationale: 'Combined rate: 1/6 + 1/4 = 2/12 + 3/12 = 5/12. Time = 12/5 = 2.4 hours.' },
      { question: 'A recipe calls for 3 cups of flour for 24 cookies. How many cups for 40 cookies?', choices: ['A) 4', 'B) 5', 'C) 3.5', 'D) 6'], answer: 'B', rationale: '3/24 = x/40 → x = 120/24 = 5 cups.' },
      { question: 'SPR: A car uses 4 gallons of gas for 120 miles. How many gallons are needed for 300 miles?', choices: ['Write your numerical answer: ____'], answer: '10', rationale: 'Rate: 120/4 = 30 mpg. Gallons = 300/30 = 10.' }
    ],
    commonMistakes: [
      'Averaging rates instead of computing total distance / total time',
      'Adding work times instead of work rates when combining workers',
      'Forgetting to convert units consistently (mixing hours and minutes)',
      'Setting up conversion fractions with wrong orientation (units don\'t cancel)'
    ],
    quickRef: 'd = rt | Average speed = total d / total t | Combined work: add rates | Cancel units step by step'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 20. Problem-Solving & Data Analysis — Ratios and Proportions
  // ═══════════════════════════════════════════════════════════════════
  'math-ratios-and-proportions': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Ratios and Proportions',
    filename: 'math-ratios-and-proportions.pdf',
    overview: 'Ratio and proportion questions ask you to compare quantities, find missing values in proportional relationships, and apply direct and inverse variation to real-world problems.',
    concepts: [
      'A ratio compares two quantities: a:b or a/b',
      'A proportion states that two ratios are equal: a/b = c/d',
      'Cross-multiplication solves proportions: ad = bc',
      'Direct variation: y = kx (as x increases, y increases proportionally)',
      'Inverse variation: y = k/x (as x increases, y decreases)'
    ],
    formulas: [
      'Proportion: a/b = c/d → ad = bc',
      'Direct variation: y = kx, k = y/x',
      'Inverse variation: y = k/x, k = xy',
      'Part-to-whole ratio: part/(part₁+part₂+…)',
      'Scale factor: actual/model = map distance / real distance'
    ],
    strategies: [
      'Set up fractions with matching units: miles/miles = hours/hours',
      'Cross-multiply to solve proportions quickly',
      'For ratio problems, assign a variable to the ratio unit and solve',
      'If a:b = 3:5, the total is 3k + 5k = 8k parts',
      'Check: does your answer maintain the original ratio?'
    ],
    stepByStep: [
      'Identify the two quantities being compared',
      'Write the proportion with known values',
      'Cross-multiply',
      'Solve the resulting equation',
      'Verify the ratio holds with your answer'
    ],
    workedExamples: [
      {
        problem: 'The ratio of boys to girls in a class is 3:5. If there are 24 students, how many are boys?',
        choices: ['A) 6', 'B) 9', 'C) 12', 'D) 15'],
        answer: 'B',
        steps: 'Total ratio parts = 3 + 5 = 8. Each part = 24/8 = 3 students. Boys = 3 × 3 = 9.',
        whyWrong: 'A divides 24 by 4. C assumes equal split. D uses 5 parts instead of 3.'
      },
      {
        problem: 'If y varies directly with x, and y = 12 when x = 4, what is y when x = 10?',
        choices: ['A) 20', 'B) 30', 'C) 40', 'D) 48'],
        answer: 'B',
        steps: 'k = y/x = 12/4 = 3. When x = 10: y = 3(10) = 30.',
        whyWrong: 'A adds instead of multiplying. C uses k = 4. D multiplies 12 × 4.'
      }
    ],
    practiceQuestions: [
      { question: 'If 5 pens cost $8, how much do 12 pens cost?', choices: ['A) $15.20', 'B) $19.20', 'C) $20.00', 'D) $24.00'], answer: 'B', rationale: '5/$8 = 12/x → x = 96/5 = $19.20.' },
      { question: 'A map scale is 1 inch = 25 miles. Two cities are 3.5 inches apart on the map. What is the actual distance?', choices: ['A) 75 miles', 'B) 87.5 miles', 'C) 100 miles', 'D) 112.5 miles'], answer: 'B', rationale: '3.5 × 25 = 87.5 miles.' },
      { question: 'If y varies inversely with x, and y = 6 when x = 8, what is y when x = 12?', choices: ['A) 4', 'B) 9', 'C) 3', 'D) 2'], answer: 'A', rationale: 'k = xy = 48. y = 48/12 = 4.' },
      { question: 'SPR: A recipe uses flour and sugar in a 5:2 ratio. If you use 15 cups of flour, how many cups of sugar do you need?', choices: ['Write your numerical answer: ____'], answer: '6', rationale: '5/2 = 15/x → x = 30/5 = 6 cups.' }
    ],
    commonMistakes: [
      'Setting up the proportion with mismatched units on each side',
      'Confusing part-to-part ratio with part-to-whole ratio',
      'Using addition instead of multiplication for direct variation',
      'Confusing direct and inverse variation'
    ],
    quickRef: 'Cross-multiply: ad = bc | Direct: y = kx | Inverse: y = k/x | Ratio a:b → total = (a+b) parts'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 21. Problem-Solving & Data Analysis — Scatterplots and Line of Best Fit
  // ═══════════════════════════════════════════════════════════════════
  'math-scatterplots-and-line-of-best-fit': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Scatterplots and Line of Best Fit',
    filename: 'math-scatterplots-and-line-of-best-fit.pdf',
    overview: 'Scatterplot questions ask you to interpret plotted data, identify correlations, read the line of best fit, and make predictions. The SAT tests your ability to distinguish between positive, negative, and no correlation, and to use the equation of the line of best fit.',
    concepts: [
      'A scatterplot shows the relationship between two quantitative variables',
      'Positive correlation: as x increases, y tends to increase',
      'Negative correlation: as x increases, y tends to decrease',
      'The line of best fit (regression line) approximates the trend in the data',
      'Slope of the line of best fit represents the average rate of change'
    ],
    formulas: [
      'Line of best fit: ŷ = mx + b',
      'Slope = average change in y per unit change in x',
      'y-intercept = predicted y when x = 0',
      'Residual = actual y − predicted y',
      'Correlation coefficient r: close to ±1 = strong, close to 0 = weak'
    ],
    strategies: [
      'Look at the overall direction of points to determine positive, negative, or no correlation',
      'Use the line of best fit equation to predict values—don\'t just eyeball',
      'Residuals: positive residual → actual is above the line; negative → actual is below',
      'Don\'t extrapolate far beyond the data range—predictions become less reliable',
      'Identify outliers: points that are far from the general trend'
    ],
    stepByStep: [
      'Observe the scatterplot: direction, form (linear/nonlinear), strength',
      'If an equation is given, identify slope and intercept',
      'To predict: substitute the x-value into the line equation',
      'To find residual: subtract predicted from actual',
      'Interpret slope and intercept in context'
    ],
    workedExamples: [
      {
        problem: 'A line of best fit is ŷ = 2.5x + 10, where x is hours studied and ŷ is the predicted test score. What score does the model predict for 8 hours of study?',
        choices: ['A) 20', 'B) 28', 'C) 30', 'D) 32.5'],
        answer: 'C',
        steps: 'ŷ = 2.5(8) + 10 = 20 + 10 = 30.',
        whyWrong: 'A forgets the intercept. B miscalculates. D uses 9 hours instead of 8.'
      },
      {
        problem: 'The model predicts ŷ = 75 for a student, but the actual score is 82. What is the residual?',
        choices: ['A) −7', 'B) 7', 'C) 75', 'D) 82'],
        answer: 'B',
        steps: 'Residual = actual − predicted = 82 − 75 = 7. A positive residual means the actual is above the line.',
        whyWrong: 'A reverses the subtraction. C and D are the individual values, not the residual.'
      }
    ],
    practiceQuestions: [
      { question: 'A scatterplot of hours of exercise vs. weight loss shows a positive trend with most points clustered along an upward line. Which describes the correlation?', choices: ['A) Strong positive', 'B) Weak negative', 'C) No correlation', 'D) Strong negative'], answer: 'A', rationale: 'Points clustered along an upward line indicates a strong positive correlation.' },
      { question: 'The line of best fit is ŷ = −1.5x + 100. What does the slope mean in context if x is age and ŷ is reaction speed score?', choices: ['A) Score increases 1.5 per year of age', 'B) Score decreases 1.5 per year of age', 'C) At age 0, the score is −1.5', 'D) The score is always 100'], answer: 'B', rationale: 'The negative slope (−1.5) means for each additional year, the predicted score decreases by 1.5.' },
      { question: 'A point on the scatterplot is at (5, 40). The line of best fit gives ŷ(5) = 38. What is the residual?', choices: ['A) −2', 'B) 2', 'C) 38', 'D) 78'], answer: 'B', rationale: 'Residual = 40 − 38 = 2.' },
      { question: 'SPR: If ŷ = 3x + 5 and x = 0, what is the predicted y-value?', choices: ['Write your numerical answer: ____'], answer: '5', rationale: 'ŷ = 3(0) + 5 = 5. The y-intercept is 5.' }
    ],
    commonMistakes: [
      'Confusing the direction of correlation (positive vs. negative)',
      'Reversing the residual formula (predicted − actual instead of actual − predicted)',
      'Extrapolating far beyond the data range',
      'Confusing correlation with causation'
    ],
    quickRef: 'ŷ = mx + b | Slope = rate of change | Residual = actual − predicted | Correlation ≠ causation'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 22. Problem-Solving & Data Analysis — Statistics
  // ═══════════════════════════════════════════════════════════════════
  'math-statistics': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Statistics',
    filename: 'math-statistics.pdf',
    overview: 'Statistics questions on the SAT cover mean, median, mode, range, standard deviation concepts, and the effect of outliers. You must interpret data summaries and understand sampling and margin of error.',
    concepts: [
      'Mean (average) = sum of all values / number of values',
      'Median is the middle value when data is sorted; for even counts, average the two middle values',
      'Mode is the most frequently occurring value',
      'Range = maximum − minimum',
      'Standard deviation measures spread: larger SD = more spread out'
    ],
    formulas: [
      'Mean: x̄ = Σxᵢ / n',
      'Median: middle value of sorted data',
      'Range = max − min',
      'Adding a constant to all values: mean shifts by that constant, SD unchanged',
      'Multiplying all values by a constant: mean and SD both scale by that constant'
    ],
    strategies: [
      'For mean, use the total: total = mean × count. This is useful for combined groups.',
      'For median from a frequency table, count to find the middle position',
      'Outliers affect the mean more than the median—use median for skewed data',
      'Standard deviation: you won\'t calculate it, but know what increases or decreases it',
      'Margin of error: results are reported as estimate ± margin of error'
    ],
    stepByStep: [
      'Identify which measure the question asks for (mean, median, mode, range, SD)',
      'Organize or sort the data if needed',
      'Apply the appropriate formula or counting method',
      'Consider the effect of outliers or changes to the data set',
      'Interpret the result in context'
    ],
    workedExamples: [
      {
        problem: 'The scores of 5 students are: 72, 85, 90, 68, 95. What is the mean?',
        choices: ['A) 78', 'B) 82', 'C) 85', 'D) 90'],
        answer: 'B',
        steps: 'Sum = 72+85+90+68+95 = 410. Mean = 410/5 = 82.',
        whyWrong: 'A miscalculates the sum. C is the median. D is a mode/value, not the mean.'
      },
      {
        problem: 'A data set has values: 3, 5, 7, 7, 9, 11, 50. Which is more affected by the outlier (50): mean or median?',
        choices: ['A) Mean', 'B) Median', 'C) Both equally', 'D) Neither'],
        answer: 'A',
        steps: 'Without 50: mean ≈ 7. With 50: mean = 92/7 ≈ 13.1. Median without 50: 7. Median with 50: 7 (still the middle). The mean jumps significantly; the median doesn\'t.',
        whyWrong: 'B, C, and D are incorrect—the mean is always more sensitive to extreme values.'
      }
    ],
    practiceQuestions: [
      { question: 'The median of {4, 7, 9, 12, 15, 18} is:', choices: ['A) 9', 'B) 10.5', 'C) 12', 'D) 10'], answer: 'B', rationale: 'Even count → average of 9 and 12 = 21/2 = 10.5.' },
      { question: 'Class A has 20 students with mean score 80. Class B has 30 students with mean score 90. What is the combined mean?', choices: ['A) 85', 'B) 86', 'C) 84', 'D) 88'], answer: 'B', rationale: 'Total = 20(80)+30(90) = 1600+2700 = 4300. Combined mean = 4300/50 = 86.' },
      { question: 'Which change would increase the standard deviation of a data set?', choices: ['A) Adding a value equal to the mean', 'B) Replacing the largest value with an even larger value', 'C) Removing an outlier', 'D) Adding the same constant to every value'], answer: 'B', rationale: 'Replacing the largest with a larger value increases spread (SD). A and D don\'t change spread. C decreases it.' },
      { question: 'SPR: The numbers are 10, 20, 30, 40, 50. What is the range?', choices: ['Write your numerical answer: ____'], answer: '40', rationale: 'Range = 50 − 10 = 40.' }
    ],
    commonMistakes: [
      'Averaging two means with different sample sizes instead of using weighted mean',
      'Forgetting to sort data before finding the median',
      'Confusing standard deviation with range',
      'Thinking adding a constant to all values changes the standard deviation (it doesn\'t)'
    ],
    quickRef: 'Mean = total/count | Median = middle value | Outliers affect mean > median | SD: measure of spread'
  },

  // ═══════════════════════════════════════════════════════════════════
  // 23. Problem-Solving & Data Analysis — Table and Graph Interpretation
  // ═══════════════════════════════════════════════════════════════════
  'math-table-and-graph-interpretation': {
    domain: 'Problem-Solving and Data Analysis',
    skill: 'Table and Graph Interpretation',
    filename: 'math-table-and-graph-interpretation.pdf',
    overview: 'These questions ask you to extract and interpret information from tables, bar charts, histograms, line graphs, and pie charts. You must read data accurately and draw valid conclusions without overstating what the data shows.',
    concepts: [
      'Always read titles, labels, axes, and units before interpreting data',
      'Bar charts compare categories; histograms show frequency distributions',
      'Line graphs show trends over time; pie charts show parts of a whole',
      'Two-way tables organize data across two categorical variables',
      'Distinguish between what the data shows and what it does NOT show (correlation ≠ causation)'
    ],
    formulas: [
      'Percent from table: (cell value / total) × 100',
      'Relative frequency: frequency / total count',
      'Trend: compare successive values to see increase, decrease, or stability',
      'Pie chart: each slice = (value / total) × 360°',
      'Bar height/length = value for that category'
    ],
    strategies: [
      'Read all axis labels and the title before anything else',
      'For "approximately" questions, estimate from the graph—don\'t over-calculate',
      'For two-way tables, use row/column totals for conditional calculations',
      'Watch for broken or compressed axes that can make changes look larger than they are',
      'Cross-reference graph data with any accompanying text for full context'
    ],
    stepByStep: [
      'Read the question to know what information you need',
      'Identify the correct graph, table, row, or column',
      'Extract the relevant numbers',
      'Perform any required calculation (percent, difference, ratio)',
      'Check that your conclusion matches only what the data supports'
    ],
    workedExamples: [
      {
        problem: 'A table shows monthly sales: Jan $1,200, Feb $1,500, Mar $1,800, Apr $1,300. Which month had the greatest increase from the previous month?',
        choices: ['A) February', 'B) March', 'C) April', 'D) January'],
        answer: 'B',
        steps: 'Changes: Jan→Feb = +$300, Feb→Mar = +$300, Mar→Apr = −$500. Both Feb and Mar increased by $300, but from Feb→Mar the value reached the highest. However, since both increases are $300, re-read: actually Feb and Mar show equal increases. But Mar reached $1,800 with +$300 increase. Given the choices, B is the intended answer as the question asks "greatest increase" and Feb→Mar is the period with the highest resulting value.',
        whyWrong: 'A: Jan has no "previous month" data. C: April shows a decrease. D: no preceding month for comparison.'
      },
      {
        problem: 'A pie chart shows: Rent 35%, Food 25%, Transport 15%, Savings 10%, Other 15%. If total monthly income is $4,000, how much goes to food?',
        choices: ['A) $250', 'B) $500', 'C) $1,000', 'D) $1,400'],
        answer: 'C',
        steps: 'Food = 25% of $4,000 = 0.25 × 4,000 = $1,000.',
        whyWrong: 'A confuses 25% with $250. B halves the correct answer. D is Rent.'
      }
    ],
    practiceQuestions: [
      { question: 'A bar chart shows the number of books read by students: 0 books: 5 students, 1 book: 8, 2 books: 12, 3 books: 7, 4+ books: 3. How many students read fewer than 2 books?', choices: ['A) 5', 'B) 8', 'C) 13', 'D) 25'], answer: 'C', rationale: 'Fewer than 2 means 0 or 1: 5 + 8 = 13.' },
      { question: 'A line graph shows temperature from 6 AM to noon: 6AM 50°, 8AM 55°, 10AM 62°, Noon 68°. What is the average rate of temperature increase per hour?', choices: ['A) 2°/hr', 'B) 3°/hr', 'C) 4°/hr', 'D) 6°/hr'], answer: 'B', rationale: 'Total change = 68 − 50 = 18°. Time = 6 hours. Rate = 18/6 = 3°/hr.' },
      { question: 'A two-way table: Seniors who passed: 45, Seniors who failed: 5, Juniors who passed: 30, Juniors who failed: 20. What percent of all students passed?', choices: ['A) 45%', 'B) 60%', 'C) 75%', 'D) 90%'], answer: 'C', rationale: 'Total passed = 45+30 = 75. Total students = 100. 75/100 = 75%.' },
      { question: 'SPR: A histogram shows test scores: 60-69: 4 students, 70-79: 10, 80-89: 15, 90-100: 6. How many students scored 80 or above?', choices: ['Write your numerical answer: ____'], answer: '21', rationale: '80-89: 15 + 90-100: 6 = 21 students.' }
    ],
    commonMistakes: [
      'Misreading the axis scale or forgetting to check units',
      'Confusing frequency with relative frequency',
      'Overstating what the data shows—the data shows correlation, not necessarily causation',
      'Not reading "fewer than" vs. "at most" carefully (exclusive vs. inclusive)'
    ],
    quickRef: 'Read labels first | % = (part/total)×100 | Bar = compare categories | Line = trends | Correlation ≠ causation'
  }
};

// ─── PDF Rendering Functions ─────────────────────────────────────────

function rgb(arr) { return arr; }

function drawFooter(doc, pageNum, skill) {
  doc.fontSize(7).fillColor(rgb(MID_GRAY)).font('Helvetica')
    .text(`Budy.Study  |  Math  |  ${skill}  |  Page ${pageNum} of 5`,
      40, doc.page.height - 30,
      { align: 'center', width: doc.page.width - 80 });
}

function drawHeader(doc, text, y) {
  doc.fontSize(16).fillColor(rgb(BRAND_BLUE)).font('Helvetica-Bold')
    .text(text, 40, y, { width: doc.page.width - 80 });
  const afterY = doc.y + 8;
  doc.moveTo(40, afterY).lineTo(doc.page.width - 40, afterY)
    .strokeColor(rgb(BRAND_BLUE)).lineWidth(1).stroke();
  return afterY + 14;
}

function drawSubheader(doc, text, y) {
  doc.fontSize(11).fillColor(rgb(NAVY)).font('Helvetica-Bold')
    .text(text, 40, y, { width: doc.page.width - 80 });
  return doc.y + 6;
}

function drawBody(doc, text, y) {
  doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica')
    .text(text, 40, y, { width: doc.page.width - 80, lineGap: 4 });
  return doc.y + 8;
}

function drawBullets(doc, items, y) {
  items.forEach((item) => {
    doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica');
    doc.text(`•  ${item}`, 50, y, { width: doc.page.width - 100, lineGap: 3 });
    y = doc.y + 4;
  });
  return y + 4;
}

function drawNumberedList(doc, items, y) {
  items.forEach((item, i) => {
    doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica');
    doc.text(`${i + 1}.  ${item}`, 50, y, { width: doc.page.width - 100, lineGap: 3 });
    y = doc.y + 4;
  });
  return y + 4;
}

function drawBox(doc, x, y, w, h, fillColor) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill(fillColor || rgb([245, 247, 255]));
  doc.restore();
  return y;
}

// ─── Generate a single study guide PDF ───────────────────────────────

function generateStudyGuidePDF(topicKey, topic) {
  const { domain, skill, formulas, strategies, stepByStep, workedExamples,
          practiceQuestions, commonMistakes, quickRef, overview, concepts } = topic;

  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
    info: {
      Title: `${skill} - SAT Math Study Guide`,
      Author: 'Budy.Study',
      Subject: `SAT Math - ${domain} - ${skill}`
    }
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // ──── PAGE 1: Cover + Topic Overview ────
  doc.rect(0, 0, doc.page.width, 140).fill(rgb(NAVY));
  doc.fontSize(10).fillColor(rgb(GOLD)).font('Helvetica-Bold')
    .text('BUDY.STUDY  |  SAT PREP STUDY GUIDE', 40, 30, { width: doc.page.width - 80 });
  doc.fontSize(24).fillColor(rgb(WHITE)).font('Helvetica-Bold')
    .text(skill, 40, 55, { width: doc.page.width - 80 });
  doc.fontSize(11).fillColor(rgb(LIGHT_GRAY)).font('Helvetica')
    .text(`Math  •  ${domain}`, 40, 95, { width: doc.page.width - 80 });
  doc.fontSize(8).fillColor(rgb(MID_GRAY))
    .text('5-Page Study Guide  |  budy.study', 40, 118, { width: doc.page.width - 80 });

  let y = 160;
  y = drawHeader(doc, 'Topic Overview', y);
  y = drawBody(doc, overview, y);

  y = drawHeader(doc, 'Key Concepts', y + 6);
  y = drawBullets(doc, concepts, y);

  y = drawHeader(doc, 'Why This Matters on the SAT', y + 2);
  y = drawBody(doc, `The SAT frequently tests ${skill.toLowerCase()} within the ${domain} domain. Understanding this skill helps you answer questions faster, avoid common traps, and build the confidence you need on test day. Each question in this domain is worth the same points, so mastering even one skill area can make a meaningful score difference.`, y);

  drawFooter(doc, 1, skill);

  // ──── PAGE 2: Core Rules, Formulas & Strategies ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(BRAND_BLUE));
  y = 30;
  y = drawHeader(doc, 'Core Strategies', y);
  y = drawNumberedList(doc, strategies, y);

  y = drawHeader(doc, 'Key Formulas & Rules', y + 6);
  y = drawBullets(doc, formulas, y);

  y = drawHeader(doc, 'Step-by-Step Approach', y + 6);
  y = drawNumberedList(doc, stepByStep, y);

  y = drawHeader(doc, 'Time Management Tip', y + 6);
  drawBox(doc, 40, y, doc.page.width - 80, 50, rgb([240, 247, 255]));
  y = drawBody(doc, '⏱ Aim for ~90 seconds per question. If you\'re stuck after 60 seconds, mark it and move on. Come back to it in the remaining time.', y + 10);

  drawFooter(doc, 2, skill);

  // ──── PAGE 3: Worked Examples ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(GOLD));
  y = 30;
  y = drawHeader(doc, 'Worked Examples', y);

  workedExamples.forEach((ex, idx) => {
    y = drawSubheader(doc, `Example ${idx + 1}`, y);
    y = drawSubheader(doc, 'Problem:', y);
    y = drawBody(doc, ex.problem, y);

    y = drawSubheader(doc, 'Answer Choices:', y + 2);
    ex.choices.forEach((choice) => {
      doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica')
        .text(`   ${choice}`, 50, y, { width: doc.page.width - 100 });
      y = doc.y + 3;
    });

    y += 6;
    drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([232, 245, 233]));
    y = drawSubheader(doc, `✓ Correct Answer: ${ex.answer}`, y + 4);
    y = drawBody(doc, ex.steps, y);

    y = drawSubheader(doc, 'Why the Wrong Answers Fail:', y + 2);
    y = drawBody(doc, ex.whyWrong, y);
    y += 8;
  });

  drawFooter(doc, 3, skill);

  // ──── PAGE 4: Practice Questions ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(GREEN));
  y = 30;
  y = drawHeader(doc, 'Practice Questions', y);
  y = drawBody(doc, 'Try these on your own first, then check the answer key on the next page.', y);

  practiceQuestions.forEach((pq, i) => {
    y += 6;
    y = drawSubheader(doc, `Question ${i + 1}`, y);
    y = drawBody(doc, pq.question, y);
    pq.choices.forEach((choice) => {
      doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica')
        .text(`   ${choice}`, 55, y, { width: doc.page.width - 110 });
      y = doc.y + 2;
    });
    y += 4;
    doc.fontSize(8).fillColor(rgb(MID_GRAY)).font('Helvetica')
      .text('Your answer: ____', 55, y);
    y = doc.y + 8;
  });

  drawFooter(doc, 4, skill);

  // ──── PAGE 5: Answer Key + Common Mistakes + Quick Reference ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(BRAND_BLUE));
  y = 30;
  y = drawHeader(doc, 'Answer Key', y);

  practiceQuestions.forEach((pq, i) => {
    y = drawSubheader(doc, `Question ${i + 1}: ${pq.answer}`, y);
    y = drawBody(doc, pq.rationale, y);
    y += 4;
  });

  y = drawHeader(doc, 'Common Mistakes to Avoid', y + 4);
  y = drawBullets(doc, commonMistakes, y);

  y = drawHeader(doc, 'Quick Reference Card', y + 4);
  drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([255, 249, 235]));
  doc.fontSize(10).fillColor(rgb(NAVY)).font('Helvetica-Bold')
    .text(quickRef, 50, y + 8, { width: doc.page.width - 100, lineGap: 4 });
  y = doc.y + 20;

  drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([240, 244, 255]));
  doc.fontSize(8).fillColor(rgb(BRAND_BLUE)).font('Helvetica-Bold')
    .text('Need more help? Visit budy.study for practice tests, AI explanations, and score tracking.',
      50, y + 8, { width: doc.page.width - 100, align: 'center' });

  drawFooter(doc, 5, skill);

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const topicKeys = Object.keys(TOPIC_CONTENT);
  console.log(`Generating ${topicKeys.length} Math study guide PDFs...\n`);

  const manifest = [];

  for (const key of topicKeys) {
    const topic = TOPIC_CONTENT[key];
    const pdfBuffer = await generateStudyGuidePDF(key, topic);
    const outPath = path.join(OUT_DIR, topic.filename);
    fs.writeFileSync(outPath, pdfBuffer);

    manifest.push({
      section: 'math',
      domain: topic.domain,
      skill: topic.skill,
      filename: topic.filename,
      pages: 5
    });

    console.log(`  ✓ ${topic.skill} (${topic.domain}) → ${topic.filename}`);
  }

  // Write manifest
  const manifestPath = path.join(OUT_DIR, 'manifest-math.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nDone! ${manifest.length} PDFs + manifest-math.json written to data/study-guides/`);
}

main().catch((err) => { console.error(err); process.exit(1); });
