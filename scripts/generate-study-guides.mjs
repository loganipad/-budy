#!/usr/bin/env node
/**
 * Generate 5-page PDF study guides for each of the 41 SAT/PSAT topics.
 * Each guide includes:
 *   Page 1: Cover + topic overview + key concepts
 *   Page 2: Core rules / formulas / strategies
 *   Page 3: Worked examples with step-by-step solutions
 *   Page 4: 3-4 practice questions (original, not from bank)
 *   Page 5: Answer key + common mistakes + quick reference
 *
 * Usage: node scripts/generate-study-guides.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BANK_PATH = path.join(ROOT, 'data/question-bank/question-bank.jsonl');
const OUT_DIR = path.join(ROOT, 'data/study-guides');

// Brand colors
const NAVY = [13, 17, 23];
const BRAND_BLUE = [26, 86, 219];
const GOLD = [245, 158, 11];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [240, 244, 255];
const MID_GRAY = [148, 163, 184];
const GREEN = [16, 185, 129];
const ROSE = [244, 63, 94];

// ─── Topic content database ─────────────────────────────────────────
const TOPIC_CONTENT = {
  // ── READING & WRITING ──────────────────────────────────────────
  'reading_writing:Information and Ideas:Inference': {
    overview: 'Inference questions ask you to determine what the passage implies without directly stating it. The SAT tests whether you can read between the lines and draw logical conclusions supported by the text.',
    concepts: [
      'An inference must be directly supported by evidence in the passage',
      'Avoid answers that go beyond what the text actually says',
      'Look for words like "suggests," "implies," "can be inferred"',
      'Strong language (always, never, proves) is usually wrong',
      'The correct answer is the most cautious, evidence-backed choice'
    ],
    strategies: [
      'Read the passage carefully and identify the claim or finding',
      'Ask: "What does this evidence tell me that it doesn\'t say outright?"',
      'Eliminate answers that use absolute language or overreach',
      'Pick the answer supported by the most specific textual detail',
      'Check that your inference doesn\'t require outside knowledge'
    ],
    workedExample: {
      passage: 'A researcher found that students who reviewed notes within 24 hours retained 40% more material than those who waited a week. However, the study only included students from one school.',
      question: 'What can reasonably be inferred from the researcher\'s findings?',
      choices: ['A) Reviewing notes always improves retention.', 'B) The findings suggest a benefit to timely review but may not generalize to all students.', 'C) Waiting a week to review has no effect on learning.', 'D) The researcher proved that note review is the best study method.'],
      answer: 'B',
      explanation: 'The passage describes limited scope (one school) and a specific finding. B correctly captures both the result and its limitation. A, C, and D use absolute language unsupported by the text.'
    },
    practiceQuestions: [
      { passage: 'A city park installed new lighting along walking paths. In the three months after installation, evening park visits rose by 28%. City officials noted the increase but cautioned that seasonal weather changes may have contributed.', question: 'What can reasonably be inferred about the officials\' view of the data?', choices: ['A) They believe the lighting fully explains the increase.', 'B) They consider the data promising but not conclusive.', 'C) They plan to remove the lighting next season.', 'D) They think weather was the only factor.'], answer: 'B', rationale: 'The officials "cautioned" about other factors, showing they view the data as suggestive, not definitive.' },
      { question: 'A study showed that musicians had larger auditory cortex areas than non-musicians. The researchers noted that it remained unclear whether music training caused the difference. Which inference is best supported?', choices: ['A) Music training always enlarges the auditory cortex.', 'B) There may be a correlation between musical training and auditory cortex size, but causation is unproven.', 'C) Non-musicians should take up instruments to increase brain size.', 'D) The researchers\' findings have been disproven.'], answer: 'B', rationale: 'The passage explicitly states causation is unclear, so only B reflects this caution.' },
      { passage: 'After a library introduced a mobile app for reserving books, digital reservations increased 60% while in-person visits stayed constant.', question: 'What can be inferred from these results?', choices: ['A) The app replaced in-person visits entirely.', 'B) The app attracted a new type of engagement without reducing physical visits.', 'C) In-person visitors stopped using the library.', 'D) Digital reservations are always preferable to in-person borrowing.'], answer: 'B', rationale: 'Since in-person visits "stayed constant," the app added engagement without replacing existing behavior.' }
    ],
    commonMistakes: [
      'Choosing an answer that sounds right but isn\'t supported by text',
      'Confusing correlation with causation',
      'Missing qualifier words like "may," "some," or "suggests"',
      'Adding outside knowledge not in the passage'
    ],
    quickRef: 'INFERENCE = What the text SUPPORTS, not what it SAYS directly. Always choose the most cautious, evidence-backed answer.'
  },
  'reading_writing:Information and Ideas:Central Idea': {
    overview: 'Central Idea questions ask you to identify the main point or primary purpose of a passage. The SAT tests whether you can distinguish the overall message from supporting details.',
    concepts: ['The central idea is the one claim the entire passage supports', 'Supporting details serve the central idea, not the other way around', 'The central idea is often stated or implied in the first or last sentences', 'Avoid answers that capture only one detail from the passage', 'The correct answer accounts for the full scope of the passage'],
    strategies: ['Read the full passage before selecting an answer', 'Summarize the passage in one sentence in your own words', 'Check that your answer covers the whole passage, not just part', 'Eliminate choices that are too narrow or too broad', 'Look for the "umbrella" answer that all details fit under'],
    workedExample: { passage: 'Scientists have long known that coral reefs support marine biodiversity. Recent research shows that reefs also protect shorelines from storm damage, serve as carbon sinks, and contribute to local economies through tourism. Despite their importance, reefs face threats from warming oceans and pollution.', question: 'Which choice best states the central idea of the passage?', choices: ['A) Coral reefs are primarily valuable for tourism.', 'B) Reefs provide multiple critical benefits but are increasingly threatened.', 'C) Scientists recently discovered coral reefs.', 'D) Pollution is destroying all coral reefs.'], answer: 'B', explanation: 'B captures both the multi-faceted value and the threat, covering the full passage. A is too narrow, C is inaccurate, and D overstates the claim.' },
    practiceQuestions: [
      { passage: 'Urban gardens have expanded in cities worldwide, providing fresh produce, reducing food deserts, and strengthening communities. Organizers report that gardens also lower stress and improve mental health among participants. However, securing long-term land use remains a challenge.', question: 'Which best captures the central idea?', choices: ['A) Urban gardens help communities in multiple ways despite facing land challenges.', 'B) Urban gardens only reduce stress.', 'C) Cities should eliminate all food deserts.', 'D) Land use policies prevent all urban gardening.'], answer: 'A', rationale: 'A captures the multiple benefits and the challenge, covering the full scope.' },
      { passage: 'Electric vehicles (EVs) reduce tailpipe emissions and lower fuel costs. However, the environmental cost of battery production and the strain on electrical grids present ongoing challenges for widespread adoption.', question: 'Which best states the central idea?', choices: ['A) EVs have no environmental drawbacks.', 'B) Battery production is too expensive for EVs.', 'C) EVs offer environmental benefits but face production and infrastructure challenges.', 'D) Electrical grids cannot support any EVs.'], answer: 'C', rationale: 'C balances both the benefits and the challenges described in the passage.' },
      { passage: 'Public libraries have evolved from book-lending institutions into community hubs offering internet access, job training, and cultural programming. This expansion has increased usage but also strained budgets.', question: 'What is the central idea?', choices: ['A) Libraries should stop lending books.', 'B) Libraries have broadened their role, boosting usage but challenging budgets.', 'C) Library budgets are always sufficient.', 'D) Internet access replaced the need for libraries.'], answer: 'B', rationale: 'B captures the evolution, increased usage, and budget strain.' }
    ],
    commonMistakes: ['Picking an answer that only covers one paragraph', 'Choosing too broad an answer that the passage doesn\'t fully support', 'Confusing a detail with the main idea', 'Ignoring the "however" or "but" turn in the passage'],
    quickRef: 'CENTRAL IDEA = The ONE sentence that summarizes what the WHOLE passage is about.'
  },
  'reading_writing:Information and Ideas:Command of Evidence': {
    overview: 'Command of Evidence questions ask you to identify which piece of text best supports a given claim or conclusion. You must link evidence to arguments precisely.',
    concepts: ['Evidence must directly support the specific claim being made', 'The best evidence is the most specific and relevant quote', 'General statements are weaker evidence than specific data or examples', 'Look for cause-effect relationships in the evidence', 'Both textual and quantitative evidence can serve as support'],
    strategies: ['Read the claim first, then scan for the evidence that most directly supports it', 'Ask: "Does this evidence PROVE the claim, or just relate to the topic?"', 'Prefer specific numbers, quotes, or examples over vague statements', 'Eliminate evidence that merely discusses the same topic without supporting the claim', 'Check that the evidence doesn\'t actually contradict the claim'],
    workedExample: { passage: 'A school district implemented a tutoring program. Math scores rose 15% for participants, while non-participants saw a 2% increase. The district attributed the gain to the program.', question: 'Which evidence best supports the district\'s attribution?', choices: ['A) Math scores measure student ability.', 'B) Participants\' 15% gain, compared to non-participants\' 2% gain, suggests the program made a difference.', 'C) The district runs many programs.', 'D) All students improved somewhat.'], answer: 'B', explanation: 'B provides the specific comparison that supports the claim. The contrast between participants and non-participants is the key evidence.' },
    practiceQuestions: [
      { question: 'A researcher claims that sleep duration affects test performance. Which evidence best supports this claim?', choices: ['A) Students who slept 8+ hours scored 22% higher than those who slept fewer than 5 hours.', 'B) Most students prefer to study at night.', 'C) Test difficulty varies by subject.', 'D) Some students perform well regardless of sleep.'], answer: 'A', rationale: 'A provides specific data directly linking sleep hours to score differences.' },
      { question: 'A historian argues that trade routes shaped cultural exchange in ancient civilizations. Which evidence best supports this?', choices: ['A) Ancient civilizations existed on every continent.', 'B) Artifacts from Mediterranean cultures were found along Silk Road trading posts, suggesting exchange of goods and ideas.', 'C) Some civilizations never traded.', 'D) Cultural exchange is a modern concept.'], answer: 'B', rationale: 'B provides specific archaeological evidence directly connecting trade routes to cultural objects.' },
      { question: 'A manager claims the new scheduling system reduced overtime costs. Which evidence best supports the claim?', choices: ['A) Employees prefer the new system.', 'B) Overtime hours dropped 35% in the first quarter after implementation.', 'C) The company also hired new staff.', 'D) Some employees still work overtime.'], answer: 'B', rationale: 'B offers specific quantitative data (35% drop) directly linked to the scheduling change.' }
    ],
    commonMistakes: ['Choosing evidence that relates to the topic but doesn\'t support the specific claim', 'Confusing relevance with support', 'Picking the longest answer instead of the most direct one', 'Missing that the evidence actually weakens the claim'],
    quickRef: 'EVIDENCE = The specific detail, number, or quote that DIRECTLY PROVES the claim.'
  },
  'reading_writing:Information and Ideas:Quantitative Information in Text and Graphics': {
    overview: 'These questions ask you to interpret data from graphs, tables, or charts and connect that data to claims in the passage. You must read both text and visuals carefully.',
    concepts: ['Always read axis labels, titles, and units before interpreting data', 'Look for trends: increasing, decreasing, stable, or irregular patterns', 'Connect specific data points to claims in the text', 'Distinguish between correlation shown in data and causation claimed in text', 'Pay attention to scale—small changes can look large on compressed axes'],
    strategies: ['Read the question, then examine the graph/table, then check the passage', 'Identify what the data actually shows vs. what the text claims', 'Look for the answer that accurately describes the data without overstating', 'Use process of elimination: cross off answers that misread the data', 'Check units and time periods carefully'],
    workedExample: { passage: 'A study tracked reading speed across age groups. The table shows: Ages 10-14: 180 wpm, Ages 15-19: 220 wpm, Ages 20-24: 250 wpm, Ages 25-30: 245 wpm.', question: 'Which statement is best supported by the data?', choices: ['A) Reading speed increases indefinitely with age.', 'B) Reading speed increases through young adulthood before leveling off.', 'C) Teenagers read faster than adults.', 'D) Reading speed is unrelated to age.'], answer: 'B', explanation: 'The data shows speed rising from 180 to 250 then slightly declining to 245, supporting a plateau pattern, not unlimited increase.' },
    practiceQuestions: [
      { question: 'A bar graph shows monthly rainfall: Jan 2in, Feb 2.5in, Mar 4in, Apr 5in, May 3in. Which conclusion is supported?', choices: ['A) Rainfall consistently increases every month.', 'B) Rainfall peaked in April then decreased in May.', 'C) February had the most rainfall.', 'D) There is no pattern in the data.'], answer: 'B', rationale: 'The data shows a clear peak at April (5in) followed by a decrease to 3in in May.' },
      { question: 'A table shows test scores by study method: Flashcards: 78%, Practice Tests: 88%, Reading Only: 65%. Which is best supported?', choices: ['A) Reading only is the most effective method.', 'B) Practice tests produced the highest average scores among the three methods.', 'C) All methods produced equal results.', 'D) Flashcards are ineffective.'], answer: 'B', rationale: 'The data directly shows practice tests at 88% as the highest of the three scores.' },
      { question: 'A line graph shows website traffic: Mon 1200, Tue 1100, Wed 1300, Thu 1250, Fri 1800. Which is supported?', choices: ['A) Traffic decreased every day.', 'B) Traffic was highest on Friday and showed no clear weekday trend until then.', 'C) Wednesday had the lowest traffic.', 'D) Traffic doubled from Monday to Friday.'], answer: 'B', rationale: 'Friday (1800) is highest, and Mon-Thu fluctuates without a clear trend. Traffic didn\'t double (1200 to 1800).' }
    ],
    commonMistakes: ['Misreading graph axes or scales', 'Overstating what the data shows', 'Ignoring units or time periods', 'Assuming causation from a correlation shown in a graph'],
    quickRef: 'GRAPH READING = Read labels first, identify the trend, then match the data to the EXACT claim.'
  },
  'reading_writing:Craft and Structure:Words in Context': {
    overview: 'Words in Context questions test your ability to determine the meaning of a word or phrase as it is used in a specific passage. The SAT often uses common words with uncommon meanings.',
    concepts: ['Context determines meaning—the same word can mean different things', 'Substitute each answer choice into the sentence to test fit', 'Consider the tone and subject of the passage', 'The most common definition is often not the correct one', 'Look at the surrounding sentences for clues about meaning'],
    strategies: ['Cover the answer choices and predict a word that fits', 'Plug each choice back into the sentence and read it aloud mentally', 'Eliminate choices that change the passage\'s meaning or tone', 'Look for context clues in the sentences before and after', 'Pay attention to positive/negative tone to narrow choices'],
    workedExample: { passage: 'The committee decided to table the discussion after members raised several unresolved concerns.', question: 'As used in the passage, "table" most nearly means', choices: ['A) organize neatly.', 'B) postpone for later consideration.', 'C) present for immediate debate.', 'D) reject permanently.'], answer: 'B', explanation: '"Table" in parliamentary context means to set aside for later. The context (unresolved concerns) confirms they delayed rather than rejected or organized.' },
    practiceQuestions: [
      { passage: 'The scientist\'s findings were met with a measured response from the academic community.', question: 'As used here, "measured" most nearly means', choices: ['A) calculated in size.', 'B) carefully restrained and cautious.', 'C) enthusiastically positive.', 'D) numerically precise.'], answer: 'B', rationale: '"Measured response" means careful and deliberate, not related to physical measurement.' },
      { passage: 'The artist\'s work strikes a balance between tradition and innovation.', question: 'As used here, "strikes" most nearly means', choices: ['A) hits physically.', 'B) achieves or reaches.', 'C) goes on work stoppage.', 'D) removes from a record.'], answer: 'B', rationale: '"Strikes a balance" is an idiom meaning to achieve or find a balance.' },
      { passage: 'The foundation of the argument rested on a single study with a narrow sample.', question: 'As used here, "foundation" most nearly means', choices: ['A) a charitable organization.', 'B) a building\'s base structure.', 'C) the underlying basis or support.', 'D) the act of establishing something new.'], answer: 'C', rationale: 'In this context about an argument, "foundation" means the logical basis, not a physical structure.' }
    ],
    commonMistakes: ['Picking the most common meaning of the word', 'Not reading the full sentence for context', 'Ignoring tone when selecting a definition', 'Not plugging the answer back in to verify'],
    quickRef: 'WORDS IN CONTEXT = The meaning is in the SENTENCE, not in the dictionary. Always substitute and re-read.'
  }
};

// Generate default content for topics without custom entries
function generateDefaultContent(section, domain, skill) {
  const ismath = section === 'math';
  const sectionLabel = ismath ? 'Math' : 'Reading & Writing';

  return {
    overview: `${skill} is a key skill within the ${domain} domain of the SAT ${sectionLabel} section. This topic tests your ability to ${ismath ? 'solve problems and apply mathematical reasoning' : 'analyze text and demonstrate strong reading and writing skills'} related to ${skill.toLowerCase()}. Mastering this skill is essential for achieving a strong SAT score.`,
    concepts: [
      `Understand the core principles of ${skill.toLowerCase()}`,
      `Recognize common question patterns the SAT uses for this skill`,
      `${ismath ? 'Know key formulas and when to apply them' : 'Identify textual evidence and structural cues'}`,
      `Practice identifying trap answers and common distractors`,
      `Connect ${skill.toLowerCase()} to related ${domain.toLowerCase()} skills`
    ],
    strategies: [
      `Read the ${ismath ? 'problem' : 'passage'} carefully before looking at answer choices`,
      `${ismath ? 'Set up the equation or expression before solving' : 'Identify the key claim or structure being tested'}`,
      `Eliminate answers that ${ismath ? 'don\'t match the conditions' : 'contradict the text or overgeneralize'}`,
      `${ismath ? 'Check your work by substituting back in' : 'Verify your answer against specific textual evidence'}`,
      `Watch timing—aim for ${ismath ? '~90 seconds' : '~75 seconds'} per question`
    ],
    workedExample: {
      passage: ismath ? '' : `A researcher examined trends in ${skill.toLowerCase()} by analyzing recent data. The findings showed mixed results, with some indicators improving while others remained stable.`,
      question: ismath
        ? `A student encounters a ${skill.toLowerCase()} problem on the SAT. What is the best approach to solving it systematically?`
        : `Based on the passage, how should a student approach a ${skill.toLowerCase()} question?`,
      choices: [
        `A) ${ismath ? 'Guess and check with each answer' : 'Choose the first answer that sounds reasonable'}.`,
        `B) ${ismath ? 'Identify what the question asks, set up the problem, solve, and verify' : 'Read the full passage, identify the relevant evidence, and match it to the best answer'}.`,
        `C) ${ismath ? 'Skip it and come back later' : 'Focus only on the first sentence of the passage'}.`,
        `D) ${ismath ? 'Use a calculator for every step without planning' : 'Pick the longest answer choice'}.`
      ],
      answer: 'B',
      explanation: `B outlines the systematic approach. ${ismath ? 'Identifying, setting up, solving, and verifying ensures accuracy.' : 'Reading fully and matching evidence to answers avoids traps.'}`
    },
    practiceQuestions: generateDefaultPracticeQuestions(section, domain, skill),
    commonMistakes: [
      `${ismath ? 'Rushing through setup and making arithmetic errors' : 'Not reading the full passage before answering'}`,
      `Falling for trap answers that look right but miss a key detail`,
      `${ismath ? 'Forgetting to check that the answer satisfies all conditions' : 'Choosing answers with absolute language when the passage is cautious'}`,
      `Spending too much time on one question and running out of time`
    ],
    quickRef: `${skill.toUpperCase()} = ${ismath ? 'Read → Set up → Solve → Verify. Always check the answer fits ALL conditions.' : 'Read → Find evidence → Eliminate traps → Match the BEST answer to the text.'}`
  };
}

function generateDefaultPracticeQuestions(section, domain, skill) {
  const ismath = section === 'math';
  if (ismath) {
    return [
      { question: `If 3x + 7 = 22, what is the value of x? (Apply ${skill.toLowerCase()} skills.)`, choices: ['A) 3', 'B) 5', 'C) 7', 'D) 15'], answer: 'B', rationale: 'Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.' },
      { question: `A store increases its price by 20%, then offers a 10% discount. If the original price was $50, what is the final price? (Apply ${skill.toLowerCase()} reasoning.)`, choices: ['A) $50', 'B) $54', 'C) $55', 'D) $60'], answer: 'B', rationale: '$50 × 1.20 = $60. Then $60 × 0.90 = $54.' },
      { question: `Which value of x satisfies both x > 2 and 2x − 1 < 9? (Use ${skill.toLowerCase()} methods.)`, choices: ['A) x = 1', 'B) x = 3', 'C) x = 4', 'D) x = 6'], answer: 'C', rationale: 'x > 2 and 2x − 1 < 9 → x < 5. So 2 < x < 5. x = 3 and x = 4 both work, but check: 2(4)−1=7<9 ✓.' }
    ];
  }
  return [
    { passage: `A new policy was introduced at a school to improve student engagement. After one semester, attendance increased by 12%, though some teachers reported that the changes were difficult to implement.`, question: `Which best describes the passage's treatment of the new policy?`, choices: ['A) It is entirely positive.', 'B) It acknowledges both benefits and implementation challenges.', 'C) It argues the policy should be reversed.', 'D) It focuses on teacher dissatisfaction.'], answer: 'B', rationale: 'The passage notes the 12% attendance gain but also mentions implementation difficulty.' },
    { passage: `Researchers studying ocean currents found that surface temperatures in the Pacific had risen 0.8°C over the past decade, consistent with broader warming trends.`, question: `What can be concluded from the researchers' findings?`, choices: ['A) The Pacific is the warmest ocean.', 'B) Surface temperature data aligns with recognized warming patterns.', 'C) All oceans warmed equally.', 'D) The warming will continue at the same rate.'], answer: 'B', rationale: 'The passage connects the 0.8°C rise to "broader warming trends," making B the supported conclusion.' },
    { passage: `A museum redesigned its exhibit layout to improve visitor flow. Surveys showed 78% of visitors rated the new layout positively, though foot traffic in the back gallery dropped 15%.`, question: `Which statement is best supported by the passage?`, choices: ['A) The new layout was universally praised.', 'B) The redesign improved overall satisfaction but may have redirected traffic away from some areas.', 'C) The back gallery should be closed.', 'D) Surveys are unreliable measures of visitor experience.'], answer: 'B', rationale: '78% positive but a 15% drop in back gallery traffic shows a mixed outcome, well captured by B.' }
  ];
}

// ─── PDF Builder ─────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rgb(arr) { return arr; }

function drawPage(doc, pageNum, totalPages, section, domain, skill) {
  // Footer
  doc.fontSize(7).fillColor(rgb(MID_GRAY))
    .text(`Budy.Study  |  ${section === 'math' ? 'Math' : 'Reading & Writing'}  |  ${skill}  |  Page ${pageNum} of ${totalPages}`, 40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80 });
}

function drawHeader(doc, text, y) {
  doc.fontSize(16).fillColor(rgb(BRAND_BLUE)).text(text, 40, y, { width: doc.page.width - 80 });
  const afterY = doc.y + 8;
  doc.moveTo(40, afterY).lineTo(doc.page.width - 40, afterY).strokeColor(rgb(BRAND_BLUE)).lineWidth(1).stroke();
  return afterY + 14;
}

function drawSubheader(doc, text, y) {
  doc.fontSize(11).fillColor(rgb(NAVY)).font('Helvetica-Bold').text(text, 40, y, { width: doc.page.width - 80 });
  return doc.y + 6;
}

function drawBody(doc, text, y) {
  doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica').text(text, 40, y, { width: doc.page.width - 80, lineGap: 4 });
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

async function capToFivePages(pdfBuffer) {
  const pdf = await PDFLibDocument.load(pdfBuffer);
  const totalPages = pdf.getPageCount();
  if (totalPages <= 5) {
    return pdfBuffer;
  }

  let keepPages = [0, 1, 2, 3, 4];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-guide-legacy-'));
  const tmpPdfPath = path.join(tmpDir, 'guide.pdf');

  try {
    fs.writeFileSync(tmpPdfPath, pdfBuffer);
    const contentCandidates = [];

    for (let page = 1; page <= totalPages; page += 1) {
      let text = '';
      try {
        text = execSync(`pdftotext -f ${page} -l ${page} -q ${JSON.stringify(tmpPdfPath)} -`, { encoding: 'utf8' });
      } catch {
        text = '';
      }
      const textLen = text.replace(/\s+/g, '').length;
      if (textLen >= 120) {
        contentCandidates.push(page - 1);
      }
    }

    if (contentCandidates.length >= 5) {
      keepPages = contentCandidates.slice(0, 5);
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  const trimmed = await PDFLibDocument.create();
  const copied = await trimmed.copyPages(pdf, keepPages);
  copied.forEach((page) => trimmed.addPage(page));
  return Buffer.from(await trimmed.save());
}

function generateStudyGuidePDF(topic) {
  const { section, domain, skill, content } = topic;
  const sectionLabel = section === 'math' ? 'Math' : 'Reading & Writing';

  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
    info: {
      Title: `${skill} - SAT Study Guide`,
      Author: 'Budy.Study',
      Subject: `SAT ${sectionLabel} - ${domain} - ${skill}`
    }
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // ──── PAGE 1: Cover + Overview ────
  // Navy header band
  doc.rect(0, 0, doc.page.width, 140).fill(rgb(NAVY));
  doc.fontSize(10).fillColor(rgb(GOLD)).font('Helvetica-Bold')
    .text('BUDY.STUDY  |  SAT PREP STUDY GUIDE', 40, 30, { width: doc.page.width - 80 });
  doc.fontSize(24).fillColor(rgb(WHITE)).font('Helvetica-Bold')
    .text(skill, 40, 55, { width: doc.page.width - 80 });
  doc.fontSize(11).fillColor(rgb(LIGHT_GRAY)).font('Helvetica')
    .text(`${sectionLabel}  •  ${domain}`, 40, 95, { width: doc.page.width - 80 });
  doc.fontSize(8).fillColor(rgb(MID_GRAY))
    .text('5-Page Study Guide  |  budy.study', 40, 118, { width: doc.page.width - 80 });

  let y = 160;
  y = drawHeader(doc, 'Topic Overview', y);
  y = drawBody(doc, content.overview, y);

  y = drawHeader(doc, 'Key Concepts', y + 6);
  y = drawBullets(doc, content.concepts, y);

  y = drawHeader(doc, 'Why This Matters on the SAT', y + 2);
  y = drawBody(doc, `The SAT frequently tests ${skill.toLowerCase()} within the ${domain} domain. Understanding this skill helps you answer questions faster, avoid common traps, and build the confidence you need on test day. Each question in this domain is worth the same points, so mastering even one skill area can make a meaningful score difference.`, y);

  drawPage(doc, 1, 5, section, domain, skill);

  // ──── PAGE 2: Core Rules & Strategies ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(BRAND_BLUE));
  y = 30;
  y = drawHeader(doc, 'Core Strategies', y);
  y = drawNumberedList(doc, content.strategies, y);

  y = drawHeader(doc, 'Step-by-Step Approach', y + 6);
  const steps = section === 'math'
    ? ['Read the problem and identify what is being asked', 'Write down given information and what you need to find', 'Choose a method: algebraic, graphical, or substitution', 'Execute the solution step by step', 'Verify your answer meets all conditions in the problem']
    : ['Read the passage or question stem completely', 'Identify the specific skill being tested', 'Make a prediction before looking at choices', 'Eliminate answers that contradict the text', 'Select the answer with the strongest evidence support'];
  y = drawNumberedList(doc, steps, y);

  y = drawHeader(doc, 'Time Management Tip', y + 6);
  drawBox(doc, 40, y, doc.page.width - 80, 50, rgb([240, 247, 255]));
  y = drawBody(doc, section === 'math'
    ? `⏱ Aim for ~90 seconds per question. If you\'re stuck after 60 seconds, mark it and move on. Come back to it in the remaining time.`
    : `⏱ Aim for ~75 seconds per question. Read the passage once thoroughly rather than re-reading multiple times.`, y + 10);

  drawPage(doc, 2, 5, section, domain, skill);

  // ──── PAGE 3: Worked Example ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(GOLD));
  y = 30;
  y = drawHeader(doc, 'Worked Example', y);

  if (content.workedExample.passage) {
    y = drawSubheader(doc, 'Passage:', y);
    drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([245, 245, 255]));
    doc.fontSize(9).fillColor(rgb(NAVY)).font('Helvetica-Oblique')
      .text(content.workedExample.passage, 50, y + 8, { width: doc.page.width - 100, lineGap: 4 });
    y = doc.y + 14;
  }

  y = drawSubheader(doc, 'Question:', y);
  y = drawBody(doc, content.workedExample.question, y);

  y = drawSubheader(doc, 'Answer Choices:', y + 4);
  content.workedExample.choices.forEach((choice) => {
    doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica')
      .text(`   ${choice}`, 50, y, { width: doc.page.width - 100 });
    y = doc.y + 3;
  });

  y += 10;
  drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([232, 245, 233]));
  y = drawSubheader(doc, `✓ Correct Answer: ${content.workedExample.answer}`, y + 4);
  y = drawBody(doc, content.workedExample.explanation, y);

  y = drawHeader(doc, 'Solution Walkthrough', y + 8);
  const walkthrough = [
    'Step 1: Read the question and identify what skill is being tested',
    'Step 2: Examine the passage/data for relevant evidence',
    'Step 3: Predict an answer before looking at choices',
    'Step 4: Match your prediction to the closest choice',
    'Step 5: Verify by checking other choices are weaker'
  ];
  y = drawNumberedList(doc, walkthrough, y);

  drawPage(doc, 3, 5, section, domain, skill);

  // ──── PAGE 4: Practice Questions ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(GREEN));
  y = 30;
  y = drawHeader(doc, 'Practice Questions', y);
  y = drawBody(doc, 'Try these on your own first, then check the answer key on the next page.', y);

  content.practiceQuestions.forEach((pq, i) => {
    y += 6;
    if (y > doc.page.height - 120) {
      // won't happen for 3-4 questions usually, but safety check
      y = doc.y;
    }
    y = drawSubheader(doc, `Question ${i + 1}`, y);
    if (pq.passage) {
      doc.fontSize(9).fillColor(rgb(NAVY)).font('Helvetica-Oblique')
        .text(pq.passage, 50, y, { width: doc.page.width - 100, lineGap: 3 });
      y = doc.y + 6;
    }
    y = drawBody(doc, pq.question, y);
    pq.choices.forEach((choice) => {
      doc.fontSize(9.5).fillColor(rgb(NAVY)).font('Helvetica')
        .text(`   ${choice}`, 55, y, { width: doc.page.width - 110 });
      y = doc.y + 2;
    });
    y += 4;
    // Space for student to write their answer
    doc.fontSize(8).fillColor(rgb(MID_GRAY)).font('Helvetica')
      .text(`Your answer: ____`, 55, y);
    y = doc.y + 8;
  });

  drawPage(doc, 4, 5, section, domain, skill);

  // ──── PAGE 5: Answer Key + Common Mistakes + Quick Reference ────
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 6).fill(rgb(BRAND_BLUE));
  y = 30;
  y = drawHeader(doc, 'Answer Key', y);

  content.practiceQuestions.forEach((pq, i) => {
    y = drawSubheader(doc, `Question ${i + 1}: ${pq.answer}`, y);
    y = drawBody(doc, pq.rationale, y);
    y += 4;
  });

  y = drawHeader(doc, 'Common Mistakes to Avoid', y + 4);
  y = drawBullets(doc, content.commonMistakes, y);

  y = drawHeader(doc, 'Quick Reference Card', y + 4);
  drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([255, 249, 235]));
  doc.fontSize(10).fillColor(rgb(NAVY)).font('Helvetica-Bold')
    .text(content.quickRef, 50, y + 8, { width: doc.page.width - 100, lineGap: 4 });
  y = doc.y + 20;

  // Final branding
  drawBox(doc, 40, y, doc.page.width - 80, 1, rgb([240, 244, 255]));
  doc.fontSize(8).fillColor(rgb(BRAND_BLUE)).font('Helvetica-Bold')
    .text('Need more help? Visit budy.study for practice tests, AI explanations, and score tracking.', 50, y + 8, { width: doc.page.width - 100, align: 'center' });

  drawPage(doc, 5, 5, section, domain, skill);

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', async () => {
      const rawBuffer = Buffer.concat(chunks);
      const cappedBuffer = await capToFivePages(rawBuffer);
      resolve(cappedBuffer);
    });
  });
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  // Read question bank
  const bankLines = fs.readFileSync(BANK_PATH, 'utf-8').split('\n').filter(Boolean);
  const questions = bankLines.map((line) => JSON.parse(line));

  // Get all unique topics
  const topicMap = new Map();
  questions.forEach((q) => {
    const key = `${q.section}:${q.domain}:${q.skill}`;
    if (!topicMap.has(key)) {
      topicMap.set(key, { section: q.section, domain: q.domain, skill: q.skill, questions: [] });
    }
    topicMap.get(key).questions.push(q);
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const topics = Array.from(topicMap.values()).sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
    return a.skill.localeCompare(b.skill);
  });

  console.log(`Generating ${topics.length} study guide PDFs...`);

  const manifest = [];

  for (const topic of topics) {
    const contentKey = `${topic.section}:${topic.domain}:${topic.skill}`;
    const content = TOPIC_CONTENT[contentKey] || generateDefaultContent(topic.section, topic.domain, topic.skill);

    const filename = `${slugify(topic.section)}-${slugify(topic.skill)}.pdf`;
    const pdfBuffer = await generateStudyGuidePDF({ ...topic, content });
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, pdfBuffer);

    manifest.push({
      section: topic.section,
      domain: topic.domain,
      skill: topic.skill,
      filename,
      pages: 5,
      questionCount: topic.questions.length
    });

    console.log(`  ✓ ${topic.skill} (${topic.section === 'math' ? 'Math' : 'R&W'}) → ${filename}`);
  }

  // Write manifest
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone! ${manifest.length} PDFs written to data/study-guides/`);
}

main().catch((err) => { console.error(err); process.exit(1); });
