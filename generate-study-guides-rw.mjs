#!/usr/bin/env node
/**
 * generate-study-guides-rw.mjs
 *
 * Generates 18 five-page SAT Reading & Writing PDF study guides.
 * Usage:
 *   npm install pdfkit
 *   node generate-study-guides-rw.mjs
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

// Colors
const NAVY = [13, 17, 23];
const BRAND_BLUE = [26, 86, 219];
const GOLD = [245, 158, 11];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [240, 244, 255];
const MID_GRAY = [148, 163, 184];
const GREEN = [16, 185, 129];
const ROSE = [244, 63, 94];

// Page geometry: US Letter (612 x 792)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const CONTENT_X = 40;
const CONTENT_W = PAGE_WIDTH - 80;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'data/study-guides');

const TOPIC_CONTENT = {
  cross_text_connections: {
    domain: 'Craft and Structure',
    skill: 'Cross-Text Connections',
    filename: 'reading_writing-cross-text-connections.pdf',
    overview:
      'Cross-Text Connections questions ask you to compare claims, methods, or evidence across two short passages. The best answer reflects how the texts relate, not just what each says in isolation. Expect agreement, qualified disagreement, or different lenses on the same issue.',
    keyConcepts: [
      'Map each text: claim, evidence type, and tone before comparing.',
      'Track relationship language: supports, challenges, extends, qualifies.',
      'Distinguish disagreement about conclusion vs disagreement about method.',
      'Prefer precise overlap: same point, same condition, same scope.',
      'Eliminate answers that merge ideas one text never states.'
    ],
    whyMatters:
      'Digital SAT modules often place paired mini-passages late in a set, where careful comparison prevents trap picks. Fast structure-mapping saves time and improves accuracy on nuanced evidence questions.',
    coreStrategies: [
      'Read Text 1 for claim and evidence in one line.',
      'Read Text 2 and label relation: align, refine, or challenge.',
      'Underline scope words: some, most, may, always, never.',
      'Answer only what the question asks: relationship, not summary.',
      'Verify with one direct phrase from each text before selecting.'
    ],
    patternsSignals: [
      'Support pattern: both texts cite similar causal evidence.',
      'Qualification pattern: Text 2 adds boundary conditions.',
      'Method contrast: experiment vs historical records vs survey.',
      'Tone signal words: however, similarly, by contrast, instead.',
      'Evidence strength pattern: anecdote < dataset < controlled study.'
    ],
    stepByStep: [
      'Annotate each text with one-sentence claim.',
      'Mark evidence type for each passage.',
      'State relationship in five words or fewer.',
      'Use elimination for choices with extra assumptions.',
      'Confirm final choice with exact textual support.'
    ],
    workedExamples: [
      {
        passage:
          'Text 1: A school district reports that daily advisory periods improved attendance by 6% after one semester. Text 2: A researcher notes advisory programs raise attendance only when mentors are trained and caseloads stay small.',
        question: 'How would Text 2 most likely respond to Text 1?',
        choices: [
          'A) It would reject the district data as unreliable.',
          'B) It would agree and add conditions for replication.',
          'C) It would claim attendance is unrelated to mentoring.',
          'D) It would argue advisory periods lower attendance.'
        ],
        answer: 'B',
        explanation:
          'Text 2 does not deny the gain; it qualifies it with implementation conditions. That is agreement with limits, not rejection.',
        wrongWhy:
          'A overstates; C contradicts Text 2; D reverses both texts.'
      },
      {
        passage:
          'Text 1: A critic praises electric buses for reducing city noise. Text 2: A transit analyst argues that route frequency, not vehicle type, drives rider satisfaction most strongly.',
        question: 'The texts primarily differ in their',
        choices: [
          'A) topic, since one is about buses and one is about trains.',
          'B) time frame, because one is historical and one is future-focused.',
          'C) focus, with one emphasizing environmental effect and one service quality.',
          'D) position, because both claim electric buses reduce frequency.'
        ],
        answer: 'C',
        explanation:
          'Both discuss bus policy, but Text 1 centers noise reduction while Text 2 centers what most affects satisfaction.',
        wrongWhy:
          'A misreads topic; B invents time contrast; D misstates both claims.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'Text 1: Museum attendance rose after free Fridays began. Text 2: A policy brief says free admission boosts first-time visits most when paired with evening transit discounts.',
        question: 'What relationship best describes Text 2 to Text 1?',
        choices: [
          'A) Contradiction',
          'B) General agreement with a condition',
          'C) Topic shift',
          'D) Causal denial'
        ],
        answer: 'B',
        rationale:
          'Text 2 supports the attendance idea while adding a condition that strengthens outcomes for first-time visitors.'
      },
      {
        level: 'Medium',
        passage:
          'Text 1: A small trial found handwritten notes improved quiz scores. Text 2: A meta-analysis reports no consistent score difference once prior GPA is controlled.',
        question: 'The best comparison is that Text 2',
        choices: [
          'A) fully confirms Text 1',
          'B) disputes the conclusion by citing broader evidence',
          'C) ignores note-taking format',
          'D) argues handwriting lowers motivation'
        ],
        answer: 'B',
        rationale:
          'Text 2 uses larger-scope evidence and control variables to challenge Text 1\'s conclusion.'
      },
      {
        level: 'Hard',
        passage:
          'Text 1: A city report attributes lower emissions to bike lanes. Text 2: A university team finds emissions also fell in similar cities without new bike lanes during the same fuel-price spike.',
        question: 'Which choice best captures the connection?',
        choices: [
          'A) Text 2 introduces an alternate explanation for Text 1\'s trend.',
          'B) Text 2 repeats Text 1 without modification.',
          'C) Text 2 proves bike lanes increase emissions.',
          'D) Text 2 focuses on unrelated health outcomes.'
        ],
        answer: 'A',
        rationale:
          'Text 2 proposes a confounder, weakening a single-cause interpretation of Text 1.'
      }
    ],
    commonMistakes: [
      'Summarizing each text but never stating the relationship.',
      'Ignoring qualifiers like only, may, and under certain conditions.',
      'Treating different evidence types as equally strong without context.',
      'Picking choices that combine claims not jointly supported.'
    ],
    quickReference:
      'Compare in this order: claim -> evidence -> scope. Then label relation: support, qualify, challenge, or shift.'
  },

  rhetorical_purpose: {
    domain: 'Craft and Structure',
    skill: 'Rhetorical Purpose',
    filename: 'reading_writing-rhetorical-purpose.pdf',
    overview:
      'Rhetorical Purpose questions ask why a sentence or paragraph exists in the passage. You must identify the author\'s function, such as introducing evidence, conceding a counterclaim, defining a term, or signaling a shift.',
    keyConcepts: [
      'Purpose asks what the line does, not what it says literally.',
      'Common moves: define, illustrate, qualify, rebut, transition, conclude.',
      'Placement matters: opening lines frame; middle lines develop; endings synthesize.',
      'Signal words reveal intent: for example, however, therefore, notably.',
      'Best choices use verbs like establish, contextualize, and contrast.'
    ],
    whyMatters:
      'Purpose items reward structural reading and are highly teachable. When you can name the function quickly, wrong answers with attractive wording become easy to eliminate.',
    coreStrategies: [
      'Read one sentence before and after the target line.',
      'Label the target with an action verb: defines, supports, concedes.',
      'Ask what breaks if the line is removed.',
      'Reject choices that paraphrase content but miss function.',
      'Choose the narrowest accurate purpose, not broad theme language.'
    ],
    patternsSignals: [
      'Definition cue: refers to, is defined as, means.',
      'Concession cue: although, granted, admittedly.',
      'Counterpoint cue: however, by contrast, nevertheless.',
      'Evidence cue: according to data, for instance, specifically.',
      'Conclusion cue: therefore, thus, in sum, overall.'
    ],
    stepByStep: [
      'Find the target sentence boundaries exactly.',
      'Classify neighboring sentences as setup, support, or consequence.',
      'Name target function in one verb phrase.',
      'Test each option against that function.',
      'Pick the option that matches role and scope.'
    ],
    workedExamples: [
      {
        passage:
          'The author argues urban trees reduce heat stress. She then notes, "By one estimate, shaded blocks can be up to 7°F cooler in summer afternoons."',
        question: 'The quoted sentence primarily serves to',
        choices: [
          'A) define heat stress in technical terms.',
          'B) provide quantitative evidence for the claim.',
          'C) present a counterargument to tree planting.',
          'D) summarize policy recommendations.'
        ],
        answer: 'B',
        explanation:
          'The sentence gives a numerical estimate supporting the prior claim. Its role is evidentiary support.',
        wrongWhy:
          'A no definition; C opposite stance; D no recommendation language.'
      },
      {
        passage:
          'An essay praises remote collaboration tools. A later sentence begins, "However, teams handling confidential data may still require in-person workflows."',
        question: 'That sentence most likely functions as a',
        choices: [
          'A) concession that limits the earlier generalization.',
          'B) restatement of the main claim.',
          'C) chronological detail about software history.',
          'D) unrelated anecdote about team morale.'
        ],
        answer: 'A',
        explanation:
          'However marks a turn and narrows the claim by introducing a condition.',
        wrongWhy:
          'B ignores contrast; C and D are unsupported.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The report claims rooftop gardens cool buildings. It adds, "In Phoenix, monitored rooftops showed interior temperature drops of up to 4°F."',
        question: 'The added sentence mainly',
        choices: [
          'A) supplies supporting evidence',
          'B) defines rooftop garden',
          'C) presents an opposing view',
          'D) introduces a new topic'
        ],
        answer: 'A',
        rationale:
          'The monitored result is direct evidence for the cooling claim.'
      },
      {
        level: 'Medium',
        passage:
          'A paragraph on digital textbooks ends with: "Still, districts with limited broadband face adoption barriers."',
        question: 'This sentence serves to',
        choices: [
          'A) conclude with universal praise',
          'B) concede a limitation',
          'C) define broadband',
          'D) provide historical background'
        ],
        answer: 'B',
        rationale:
          'Still signals qualification, adding a constraint to earlier positive claims.'
      },
      {
        level: 'Hard',
        passage:
          'An author describes citizen-science apps and writes, "This distinction matters because casual observations and calibrated measurements answer different research questions."',
        question: 'The sentence primarily',
        choices: [
          'A) dismisses all citizen-science data',
          'B) explains why a prior contrast is important',
          'C) introduces a timeline of app development',
          'D) shifts to a personal anecdote'
        ],
        answer: 'B',
        rationale:
          'This distinction matters explicitly interprets the significance of a contrast made just before.'
      }
    ],
    commonMistakes: [
      'Choosing an answer that only paraphrases the sentence.',
      'Ignoring contrast words that signal concession or rebuttal.',
      'Selecting broad main-idea choices for local function questions.',
      'Forgetting to use surrounding context lines.'
    ],
    quickReference:
      'Purpose = function verb + local context. Ask: Does this line define, support, qualify, contrast, or conclude?'
  },

  text_structure: {
    domain: 'Craft and Structure',
    skill: 'Text Structure',
    filename: 'reading_writing-text-structure.pdf',
    overview:
      'Text Structure questions test how ideas are organized: problem-solution, cause-effect, compare-contrast, chronological sequence, or claim-evidence reasoning. Structure clues help you predict what should come next and evaluate coherence.',
    keyConcepts: [
      'Structure is the blueprint of idea flow across sentences.',
      'Typical frames: claim-evidence, problem-solution, contrast, narrative sequence.',
      'Topic sentences and pivot words signal structural shifts.',
      'Paragraph purpose should align with placement in the whole text.',
      'Strong answers describe function and relation, not topic alone.'
    ],
    whyMatters:
      'When you track structure, transition and sentence-placement questions become faster because you can anticipate the logical slot each sentence must fill.',
    coreStrategies: [
      'Identify structure after the first two sentences.',
      'Mark pivot words: however, consequently, for example.',
      'Map paragraph roles: setup, development, synthesis.',
      'Predict next move before reading answer choices.',
      'Prefer choices preserving logical continuity and scope.'
    ],
    patternsSignals: [
      'Cause-effect: because, therefore, as a result, consequently.',
      'Compare-contrast: similarly, in contrast, on the other hand.',
      'Chronological: initially, then, later, eventually.',
      'Problem-solution: challenge, barrier, approach, outcome.',
      'Claim-evidence: argues, according to, data show, implies.'
    ],
    stepByStep: [
      'Classify paragraph structure type.',
      'Locate structural pivot or turn sentence.',
      'Check whether candidate lines match local role.',
      'Reject options with wrong timeline or logic order.',
      'Confirm final choice improves cohesion globally.'
    ],
    workedExamples: [
      {
        passage:
          'Paragraph 1 outlines rising flood risk. Paragraph 2 describes permeable pavement pilots. Paragraph 3 reports reduced runoff in pilot districts.',
        question: 'The passage is organized primarily as',
        choices: [
          'A) chronology of one inventor\'s career.',
          'B) problem, intervention, and measured outcome.',
          'C) definition followed by etymology.',
          'D) two unrelated case studies.'
        ],
        answer: 'B',
        explanation:
          'The sequence clearly moves from challenge to response to result.',
        wrongWhy:
          'A and C mismatch content type; D ignores explicit continuity.'
      },
      {
        passage:
          'A passage first explains why pollinators matter, then contrasts two conservation strategies, ending with a recommendation based on cost-effectiveness.',
        question: 'Which description best matches the structure?',
        choices: [
          'A) Pure narration with no argument',
          'B) Definition, contrast, and evaluative conclusion',
          'C) Chronological biography of a scientist',
          'D) Random list of facts'
        ],
        answer: 'B',
        explanation:
          'The text establishes context, compares options, then evaluates one.',
        wrongWhy:
          'A, C, and D ignore explicit argumentative progression.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The author presents a traffic problem, introduces bus-priority lanes, and reports commute-time declines after implementation.',
        question: 'This structure is best described as',
        choices: [
          'A) problem-solution-result',
          'B) definition-example',
          'C) chronological memoir',
          'D) compare-contrast only'
        ],
        answer: 'A',
        rationale:
          'The sequence is challenge -> intervention -> outcome.'
      },
      {
        level: 'Medium',
        passage:
          'A paragraph begins with two methods for measuring soil moisture. It then notes one method is cheaper but less precise.',
        question: 'The paragraph mainly uses',
        choices: [
          'A) cause-effect chronology',
          'B) compare-contrast with evaluation',
          'C) narrative flashback',
          'D) concession and rebuttal'
        ],
        answer: 'B',
        rationale:
          'Two methods are compared and judged on cost and precision.'
      },
      {
        level: 'Hard',
        passage:
          'An essay opens with a common assumption, cites studies that complicate it, and closes by proposing a revised claim.',
        question: 'The best structural description is',
        choices: [
          'A) assumption -> evidence-based qualification -> refined conclusion',
          'B) timeline -> anecdote -> definition',
          'C) random sequence of examples',
          'D) claim -> immediate proof -> no revision'
        ],
        answer: 'A',
        rationale:
          'The text deliberately revises an initial assumption using evidence.'
      }
    ],
    commonMistakes: [
      'Labeling by topic instead of organizational pattern.',
      'Missing pivot words that mark logical turns.',
      'Treating conclusions as new claims unrelated to earlier evidence.',
      'Confusing chronological order with cause-effect reasoning.'
    ],
    quickReference:
      'Find the blueprint first: setup, turn, development, conclusion. Structure predicts what belongs where.'
  },

  words_in_context: {
    domain: 'Craft and Structure',
    skill: 'Words in Context',
    filename: 'reading_writing-words-in-context.pdf',
    overview:
      'Words in Context questions test meaning as used in a specific sentence, including nuanced tone and discipline-specific usage. The correct choice must fit context, logic, and register, not just dictionary familiarity.',
    keyConcepts: [
      'Context beats common meaning every time.',
      'Many SAT items use secondary meanings of familiar words.',
      'Tone matters: neutral, critical, cautious, celebratory.',
      'Collocations can validate fit: strike a balance, draw a distinction.',
      'Replacement must preserve sentence logic and style.'
    ],
    whyMatters:
      'Accurate contextual vocabulary prevents easy point losses and supports stronger performance on rhetoric and inference items that depend on subtle wording.',
    coreStrategies: [
      'Cover choices and predict your own synonym first.',
      'Read one sentence before and after for clues.',
      'Check connotation: positive, negative, or neutral.',
      'Plug each option back into the sentence.',
      'Reject choices that distort claim strength or tone.'
    ],
    patternsSignals: [
      'Contrast clues: however, yet, despite, nevertheless.',
      'Cause clues: because, therefore, consequently.',
      'Example cues: for instance, specifically, such as.',
      'Scope clues: largely, partly, rarely, universally.',
      'Register cues: technical term vs everyday word choice.'
    ],
    stepByStep: [
      'Bracket the target word and full sentence.',
      'Infer meaning from neighboring logic cues.',
      'Compare predicted meaning to options.',
      'Test best two options in sentence.',
      'Select the one preserving tone and precision.'
    ],
    workedExamples: [
      {
        passage:
          'The committee called the proposal bold but impractical, noting that implementation costs would be prohibitive.',
        question: 'As used here, prohibitive most nearly means',
        choices: [
          'A) encouraging',
          'B) excessively high',
          'C) temporary',
          'D) strictly regulated'
        ],
        answer: 'B',
        explanation:
          'Impractical due to costs implies costs are too high to permit adoption.',
        wrongWhy:
          'A opposite; C not implied; D wrong semantic field.'
      },
      {
        passage:
          'Her analysis was measured, avoiding dramatic claims and emphasizing limits of the dataset.',
        question: 'As used here, measured most nearly means',
        choices: [
          'A) quantified with exact units',
          'B) physically sized',
          'C) careful and restrained',
          'D) rapid and energetic'
        ],
        answer: 'C',
        explanation:
          'Avoiding dramatic claims signals a cautious, restrained tone.',
        wrongWhy:
          'A literal but wrong; B irrelevant; D opposite tone.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The editor trimmed redundant clauses to make the argument more concise.',
        question: 'As used here, concise most nearly means',
        choices: [
          'A) brief and clear',
          'B) overly technical',
          'C) emotionally charged',
          'D) chronologically ordered'
        ],
        answer: 'A',
        rationale:
          'Trimming redundancy points to brevity and clarity.'
      },
      {
        level: 'Medium',
        passage:
          'The economist warned that the model\'s assumptions were fragile under extreme market shocks.',
        question: 'As used here, fragile most nearly means',
        choices: [
          'A) transparent',
          'B) likely to fail under stress',
          'C) carefully documented',
          'D) politically controversial'
        ],
        answer: 'B',
        rationale:
          'Under extreme shocks implies vulnerability, not transparency or politics.'
      },
      {
        level: 'Hard',
        passage:
          'The historian\'s claim gained traction after newly translated letters corroborated her timeline.',
        question: 'As used here, corroborated most nearly means',
        choices: [
          'A) contradicted',
          'B) delayed',
          'C) supported with confirming evidence',
          'D) simplified'
        ],
        answer: 'C',
        rationale:
          'Gained traction after letters indicates confirmation of the timeline.'
      }
    ],
    commonMistakes: [
      'Choosing the most familiar dictionary meaning.',
      'Ignoring surrounding tone and claim strength.',
      'Not substituting choices back into the sentence.',
      'Confusing discipline-specific terms with everyday usage.'
    ],
    quickReference:
      'Predict first, then test options in context. Correct word preserves both meaning and tone.'
  },

  concision: {
    domain: 'Expression of Ideas',
    skill: 'Concision',
    filename: 'reading_writing-concision.pdf',
    overview:
      'Concision questions test whether a sentence expresses the same idea clearly with fewer, more precise words. The SAT rewards economy of language, elimination of redundancy, and direct sentence structure.',
    keyConcepts: [
      'Prefer the shortest choice that is grammatically complete and precise.',
      'Cut redundancy: each and every, basic fundamentals, future plans.',
      'Replace wordy phrases with compact equivalents.',
      'Maintain original meaning while reducing clutter.',
      'Avoid unnecessary nominalizations and filler openings.'
    ],
    whyMatters:
      'Concision appears frequently in revision tasks and contributes to readability and pacing. Efficient editing helps both SAT performance and real-world writing quality.',
    coreStrategies: [
      'Spot repeated meaning first, then cut duplicates.',
      'Prefer active, concrete verbs over weak verb phrases.',
      'Remove fillers: in order to, due to the fact that.',
      'Keep required modifiers only if they add new information.',
      'After edits, reread for smoothness and exact meaning.'
    ],
    patternsSignals: [
      'Redundancy patterns: true facts, end result, close proximity.',
      'Wordy replacements: because of -> because; at this point in time -> now.',
      'Verb inflation: made a decision -> decided.',
      'Nominalization pattern: provided an explanation -> explained.',
      'Precision pattern: very unique is incorrect; unique is absolute.'
    ],
    stepByStep: [
      'Identify the sentence\'s essential message.',
      'Delete repeated or implied information.',
      'Swap long phrases for precise words.',
      'Check grammar and tone after trimming.',
      'Select the clearest concise option.'
    ],
    workedExamples: [
      {
        passage:
          'The committee reached a final consensus decision at the end of the meeting.',
        question: 'Which revision is most concise?',
        choices: [
          'A) The committee reached a final consensus decision at the end of the meeting.',
          'B) At the end of the meeting, the committee reached a consensus.',
          'C) At the end of the meeting, the committee had reached what was a consensus decision.',
          'D) The committee came to the end result of consensus at meeting\'s end.'
        ],
        answer: 'B',
        explanation:
          'B removes repeated meaning: final, decision, and at the end are redundant when consensus is reached at meeting close.',
        wrongWhy:
          'A wordy; C inflated syntax; D awkward and redundant.'
      },
      {
        passage:
          'Because of the fact that rainfall increased, the reservoir level rose.',
        question: 'Best concise revision?',
        choices: [
          'A) Due to the fact of increased rainfall, the reservoir level rose upward.',
          'B) Because rainfall increased, the reservoir level rose.',
          'C) Owing to the fact that rainfall had increased in amount, the reservoir level rose.',
          'D) Rainfall increases were the reason why the reservoir level rose up.'
        ],
        answer: 'B',
        explanation:
          'Because of the fact that compresses cleanly to because, and rose does not need upward.',
        wrongWhy:
          'A/C/D retain or add unnecessary wording.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The new policy is one that will likely improve attendance rates.',
        question: 'Most concise revision?',
        choices: [
          'A) The new policy will likely improve attendance rates.',
          'B) The new policy is one that will likely improve attendance rates.',
          'C) Attendance rates are likely to be improved by the new policy that is new.',
          'D) It is likely that attendance rates will be improved by this policy.'
        ],
        answer: 'A',
        rationale:
          'A preserves meaning with direct subject-verb construction.'
      },
      {
        level: 'Medium',
        passage:
          'The researchers conducted an analysis of the data in order to determine trends.',
        question: 'Best concise option?',
        choices: [
          'A) The researchers conducted an analysis of the data in order to determine trends.',
          'B) The researchers analyzed the data to determine trends.',
          'C) The researchers did a determination of trends by analysis of data.',
          'D) The data were what the researchers analyzed for trend determination.'
        ],
        answer: 'B',
        rationale:
          'Analyzed replaces conducted an analysis, and to replaces in order to.'
      },
      {
        level: 'Hard',
        passage:
          'In my personal opinion, the proposal should be revised.',
        question: 'Most concise acceptable revision?',
        choices: [
          'A) In my personal opinion, the proposal should be revised.',
          'B) The proposal should be revised.',
          'C) It is my opinion personally that the proposal should be revised.',
          'D) The proposal, in my view and opinion, should be revised.'
        ],
        answer: 'B',
        rationale:
          'Opinion markers are unnecessary when no attribution is required.'
      }
    ],
    commonMistakes: [
      'Choosing longer options because they sound formal.',
      'Deleting words that carry necessary meaning.',
      'Keeping redundant modifiers like final outcome.',
      'Forgetting to check grammar after trimming.'
    ],
    quickReference:
      'Concision rule: remove redundancy, prefer strong verbs, keep meaning intact.'
  },

  rhetorical_synthesis: {
    domain: 'Expression of Ideas',
    skill: 'Rhetorical Synthesis',
    filename: 'reading_writing-rhetorical-synthesis.pdf',
    overview:
      'Rhetorical Synthesis questions ask you to combine notes into a sentence that best achieves a specific rhetorical goal, such as introducing a topic, emphasizing contrast, or supporting a claim with precise evidence.',
    keyConcepts: [
      'Always prioritize the stated goal over extra detail.',
      'Use only relevant notes; omit unrelated facts.',
      'Preserve factual accuracy while selecting concise phrasing.',
      'Match rhetorical move: define, compare, support, or conclude.',
      'Strong synthesis integrates evidence naturally and logically.'
    ],
    whyMatters:
      'Synthesis rewards selective attention and audience-aware writing. Correct choices are not longest; they are the most purposeful and goal-aligned.',
    coreStrategies: [
      'Read the assignment goal before reading notes.',
      'Tag each note as relevant or irrelevant to the goal.',
      'Choose sentence structure matching purpose and tone.',
      'Prefer options with specific evidence over broad claims.',
      'Check for logical flow and grammatical completeness.'
    ],
    patternsSignals: [
      'Contrast transitions: however, nevertheless, on the other hand.',
      'Addition transitions: furthermore, moreover, in addition.',
      'Cause-effect transitions: therefore, consequently, as a result.',
      'Example transitions: for instance, specifically, to illustrate.',
      'Evidence pattern: claim first, then data point with context.'
    ],
    stepByStep: [
      'Identify the exact rhetorical objective.',
      'Select two to three notes that directly serve it.',
      'Draft one sentence mentally using precise transition.',
      'Compare to options for fidelity and concision.',
      'Pick the option that best satisfies the goal.'
    ],
    workedExamples: [
      {
        passage:
          'Notes: (1) Wetlands absorb stormwater. (2) A 2024 study found neighborhoods near restored wetlands had 18% fewer flood-insurance claims. (3) Wetlands host migratory birds. Goal: support a claim that restoration reduces flood risk.',
        question: 'Which choice best meets the goal?',
        choices: [
          'A) Wetlands are habitats for many birds and plants around the world.',
          'B) Restored wetlands can reduce flood risk; a 2024 study found nearby neighborhoods had 18% fewer flood-insurance claims.',
          'C) Many ecosystems include wetlands, forests, and grasslands.',
          'D) Wetlands are important, and birds migrate through them seasonally.'
        ],
        answer: 'B',
        explanation:
          'B directly matches the goal and includes specific quantitative support from the notes.',
        wrongWhy:
          'A/C/D are factual but not targeted to flood-risk support.'
      },
      {
        passage:
          'Notes: (1) Library app checkouts increased 40%. (2) In-person visits stayed flat. (3) Staff hours were unchanged. Goal: emphasize that digital access expanded without reducing physical use.',
        question: 'Best synthesis sentence?',
        choices: [
          'A) Library staff hours were unchanged in the reporting period.',
          'B) The app expanded access: digital checkouts rose 40% while in-person visits remained steady.',
          'C) Libraries use both apps and physical branches in modern cities.',
          'D) In-person visits are more important than app use.'
        ],
        answer: 'B',
        explanation:
          'B captures both required parts of the goal using precise comparative evidence.',
        wrongWhy:
          'A too narrow; C generic; D unsupported value judgment.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'Notes: solar roofs lowered peak electricity demand by 12% in one district; installation costs were offset within six years. Goal: highlight economic viability.',
        question: 'Best choice?',
        choices: [
          'A) Solar roofs can be blue or black.',
          'B) Solar roofs are visible on many homes.',
          'C) Solar roofs proved economically viable, with costs offset within six years.',
          'D) Electricity demand changes for many reasons.'
        ],
        answer: 'C',
        rationale:
          'The sentence directly addresses viability with a concrete payoff timeline.'
      },
      {
        level: 'Medium',
        passage:
          'Notes: tutoring attendance increased after text reminders; students receiving reminders attended 1.4 more sessions on average. Goal: provide specific evidence for effectiveness.',
        question: 'Best synthesis?',
        choices: [
          'A) Tutors worked hard this semester.',
          'B) Text reminders were effective: students receiving them attended 1.4 more sessions on average.',
          'C) Attendance can be difficult to measure.',
          'D) Some students preferred email reminders.'
        ],
        answer: 'B',
        rationale:
          'B ties claim and quantified evidence in one precise statement.'
      },
      {
        level: 'Hard',
        passage:
          'Notes: two river-cleanup methods reduced pollutants similarly; one method required half the labor hours. Goal: compare methods and recommend one efficiently.',
        question: 'Best option?',
        choices: [
          'A) Both methods worked, but the lower-labor method is preferable because it achieved similar reductions with half the labor hours.',
          'B) River cleanup is important in many regions.',
          'C) Labor hours vary by season.',
          'D) Pollutants decreased after cleanup.'
        ],
        answer: 'A',
        rationale:
          'A explicitly compares both methods and gives a reasoned recommendation tied to efficiency.'
      }
    ],
    commonMistakes: [
      'Including interesting notes that do not serve the goal.',
      'Omitting the strongest evidence note.',
      'Using vague transitions that blur logical relationships.',
      'Choosing long options with extra but irrelevant detail.'
    ],
    quickReference:
      'Synthesis formula: goal -> relevant notes only -> precise transition -> concise, evidence-based sentence.'
  },

  sentence_placement: {
    domain: 'Expression of Ideas',
    skill: 'Sentence Placement',
    filename: 'reading_writing-sentence-placement.pdf',
    overview:
      'Sentence Placement questions ask where a proposed sentence should go for best logic and flow. Correct placement depends on pronoun reference, chronology, cause-effect order, and paragraph-level coherence.',
    keyConcepts: [
      'A sentence belongs where its references are clear.',
      'Given-before-new principle improves readability.',
      'Chronology and process order must remain intact.',
      'Topic sentence and support sentence roles are distinct.',
      'Transition cues indicate where contrast or result should appear.'
    ],
    whyMatters:
      'Placement items combine grammar and rhetoric, rewarding structural awareness. Mastering cue words and referents turns this into a high-confidence question type.',
    coreStrategies: [
      'Check pronouns: this, these, it need clear antecedents.',
      'Locate transition intent: contrast, addition, example, result.',
      'Preserve chronology and causal order.',
      'Place definitions before specialized terms use.',
      'Reject positions that create abrupt topic jumps.'
    ],
    patternsSignals: [
      'Referent signal: this finding should follow the finding.',
      'Example signal: for instance follows a general claim.',
      'Contrast signal: however follows statement being contrasted.',
      'Result signal: therefore follows evidence or cause.',
      'Summary signal: in sum appears near paragraph end.'
    ],
    stepByStep: [
      'Read full paragraph before testing positions.',
      'Identify what the candidate sentence refers to.',
      'Test each position for reference clarity.',
      'Check transition logic and information order.',
      'Choose placement with strongest coherence.'
    ],
    workedExamples: [
      {
        passage:
          'Paragraph: (1) Cities are piloting cool-roof coatings. (2) Early reports show lower indoor temperatures. (3) Utility demand peaks have declined in pilot zones. Candidate sentence: "These reductions were largest during late-afternoon heat spikes."',
        question: 'Best placement for the candidate sentence?',
        choices: [
          'A) Before sentence 1',
          'B) After sentence 1',
          'C) After sentence 2',
          'D) After sentence 3'
        ],
        answer: 'D',
        explanation:
          'These reductions most clearly refers to demand peak declines in sentence 3, so it should follow that idea.',
        wrongWhy:
          'A/B/C lack a clear plural antecedent for reductions.'
      },
      {
        passage:
          'Paragraph: (1) The app sends reminders before deadlines. (2) Submission rates rose by 14%. Candidate sentence: "For example, ninth-grade submissions increased from 68% to 82%."',
        question: 'Where should the candidate sentence be placed?',
        choices: [
          'A) Before sentence 1',
          'B) Between sentences 1 and 2',
          'C) After sentence 2',
          'D) It should not be added.'
        ],
        answer: 'C',
        explanation:
          'For example should follow the general claim about rising submission rates to provide specific support.',
        wrongWhy:
          'A/B place example before claim; D incorrect because example strengthens evidence.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'Sentence A defines mycelium networks. Sentence B explains they can redistribute nutrients across roots. Candidate: "This transfer can improve resilience during drought."',
        question: 'Best placement?',
        choices: [
          'A) Before A',
          'B) Between A and B',
          'C) After B',
          'D) Start a new paragraph'
        ],
        answer: 'C',
        rationale:
          'This transfer refers to nutrient redistribution described in sentence B.'
      },
      {
        level: 'Medium',
        passage:
          'A paragraph introduces a survey result, then compares two age groups. Candidate: "However, response rates were lower among first-time participants."',
        question: 'Where should however sentence go?',
        choices: [
          'A) Immediately after a positive trend statement',
          'B) Before any trend is mentioned',
          'C) After paragraph conclusion',
          'D) At paragraph opening'
        ],
        answer: 'A',
        rationale:
          'However must contrast a previously stated positive trend.'
      },
      {
        level: 'Hard',
        passage:
          'A process paragraph lists: collect samples, dry samples, measure mass change, graph results. Candidate: "Only after drying were measurements taken to avoid moisture bias."',
        question: 'Best insertion point?',
        choices: [
          'A) Before collect samples',
          'B) After collect samples',
          'C) After dry samples',
          'D) After graph results'
        ],
        answer: 'C',
        rationale:
          'Only after drying logically modifies the transition to measurement.'
      }
    ],
    commonMistakes: [
      'Placing sentence where pronouns have no antecedent.',
      'Ignoring transition words like however and therefore.',
      'Breaking chronological or procedural order.',
      'Treating examples as topic sentences.'
    ],
    quickReference:
      'Place by referent + transition + order. If one fails, the placement is wrong.'
  },

  transitions: {
    domain: 'Expression of Ideas',
    skill: 'Transitions',
    filename: 'reading_writing-transitions.pdf',
    overview:
      'Transitions questions test logical relationships between ideas. The right connector must match the relationship: contrast, addition, cause-effect, sequence, concession, or example.',
    keyConcepts: [
      'Choose transition by logic, not by how formal it sounds.',
      'Contrast and concession are different: opposition vs qualified acceptance.',
      'Addition words should not replace cause-effect words.',
      'Transition can appear at sentence start or mid-sentence.',
      'Punctuation around conjunctive adverbs matters.'
    ],
    whyMatters:
      'Transition mastery improves both SAT editing questions and your own clarity. One correct connector can resolve ambiguity in paragraph logic immediately.',
    coreStrategies: [
      'Determine relationship before viewing options.',
      'Use a quick label: contrast, addition, cause, example.',
      'Test whether clause meaning changes with each connector.',
      'Check punctuation with however, therefore, moreover.',
      'Eliminate synonyms that signal the wrong relationship.'
    ],
    patternsSignals: [
      'Contrast: however, nevertheless, on the other hand, by contrast.',
      'Addition: furthermore, moreover, in addition, also.',
      'Cause-effect: therefore, consequently, as a result, thus.',
      'Example: for instance, specifically, to illustrate.',
      'Concession: admittedly, even so, granted.'
    ],
    stepByStep: [
      'Read both clauses without transition.',
      'Name their logical relationship.',
      'Select transition family that matches.',
      'Verify punctuation and tone fit.',
      'Reread sentence for coherence and precision.'
    ],
    workedExamples: [
      {
        passage:
          'The pilot reduced commute times by 11%; _____, city planners expanded the program to three new corridors.',
        question: 'Which transition best completes the sentence?',
        choices: [
          'A) for instance',
          'B) however',
          'C) consequently',
          'D) similarly'
        ],
        answer: 'C',
        explanation:
          'Expansion is a result of reduced commute times, so a cause-effect connector is needed.',
        wrongWhy:
          'A introduces example; B contrast; D comparison without causal link.'
      },
      {
        passage:
          'The data showed improved scores. _____, attendance stayed unchanged, suggesting gains were not due to added class time.',
        question: 'Best transition?',
        choices: [
          'A) Nevertheless',
          'B) For example',
          'C) Therefore',
          'D) Moreover'
        ],
        answer: 'A',
        explanation:
          'Sentence two introduces a surprising contrast to expected explanation; nevertheless signals concession/contrast well.',
        wrongWhy:
          'B example not needed; C wrong causality; D addition misses tension.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The experiment had a small sample size; _____, researchers called the findings preliminary.',
        question: 'Choose the best transition.',
        choices: [
          'A) therefore',
          'B) moreover',
          'C) for instance',
          'D) similarly'
        ],
        answer: 'A',
        rationale:
          'Small sample leads logically to preliminary interpretation.'
      },
      {
        level: 'Medium',
        passage:
          'The compost program reduced waste. _____, residents reported fewer trash pickups each week.',
        question: 'Best transition?',
        choices: [
          'A) On the other hand',
          'B) In addition',
          'C) Consequently',
          'D) Specifically'
        ],
        answer: 'B',
        rationale:
          'Second clause adds another benefit, not a direct effect chain.'
      },
      {
        level: 'Hard',
        passage:
          'The team expected battery life to increase after firmware updates. _____, field tests showed no measurable change in runtime.',
        question: 'Best transition?',
        choices: [
          'A) Therefore',
          'B) For instance',
          'C) However',
          'D) Furthermore'
        ],
        answer: 'C',
        rationale:
          'Actual results oppose expectation, requiring contrast.'
      }
    ],
    commonMistakes: [
      'Picking transitions based on familiarity rather than logic.',
      'Using example transitions where causation is needed.',
      'Ignoring punctuation with conjunctive adverbs.',
      'Confusing concession words with simple addition.'
    ],
    quickReference:
      'Ask first: relationship type? Then choose transition family: contrast, addition, cause-effect, or example.'
  },

  central_idea: {
    domain: 'Information and Ideas',
    skill: 'Central Idea',
    filename: 'reading_writing-central-idea.pdf',
    overview:
      'Central Idea questions ask for the passage\'s primary claim across all details. Correct answers are broad enough to include major evidence but narrow enough to avoid unsupported generalizations.',
    keyConcepts: [
      'Central idea is the umbrella claim covering whole passage.',
      'Supporting details should point back to one main point.',
      'Good central ideas include key contrast or limitation turns.',
      'Overly narrow answers focus on one example only.',
      'Overly broad answers exceed passage scope.'
    ],
    whyMatters:
      'Central idea skill anchors many other question types. If you identify the passage\'s core claim quickly, inference and evidence questions become easier and faster.',
    coreStrategies: [
      'Summarize passage in one sentence after reading.',
      'Track author\'s main claim and qualification turn.',
      'Check whether each paragraph supports candidate idea.',
      'Eliminate answers with absolute wording.',
      'Pick option balancing completeness and precision.'
    ],
    patternsSignals: [
      'Main-idea cues: overall, primarily, chiefly, central.',
      'Qualification cues: however, though, yet, despite.',
      'Scope cues: many, some, in this study, under these conditions.',
      'Evidence pattern: repeated point across multiple paragraphs.',
      'Structure pattern: intro claim -> evidence -> nuanced conclusion.'
    ],
    stepByStep: [
      'Read full passage before deciding.',
      'Write a one-line paraphrase of main point.',
      'Compare choices for scope and fidelity.',
      'Remove detail-only and extreme choices.',
      'Select the best umbrella statement.'
    ],
    workedExamples: [
      {
        passage:
          'A passage explains that urban ponds support biodiversity, reduce flood burden, and cool nearby neighborhoods, but notes maintenance funding often lags demand.',
        question: 'Which choice best states the central idea?',
        choices: [
          'A) Urban ponds are expensive mistakes for cities.',
          'B) Urban ponds provide multiple benefits, though sustained funding is a challenge.',
          'C) Biodiversity is the only value of urban ponds.',
          'D) All cities should immediately build more ponds.'
        ],
        answer: 'B',
        explanation:
          'B captures benefits plus limitation, matching full passage scope.',
        wrongWhy:
          'A and C are too narrow/extreme; D overgeneralizes policy claim.'
      },
      {
        passage:
          'An article describes telehealth expanding access in rural areas while acknowledging that weak broadband and reimbursement rules limit consistency of care.',
        question: 'Best central idea?',
        choices: [
          'A) Telehealth has expanded access but faces infrastructure and policy constraints.',
          'B) Telehealth should replace all in-person visits.',
          'C) Broadband has no effect on healthcare delivery.',
          'D) Rural clinics are closing because of telehealth.'
        ],
        answer: 'A',
        explanation:
          'A reflects both the gain and the constraints discussed throughout.',
        wrongWhy:
          'B/C/D introduce unsupported extremes or causal claims.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The passage describes school gardens improving science engagement, nutrition awareness, and attendance, while noting staffing demands.',
        question: 'Central idea?',
        choices: [
          'A) School gardens are unnecessary.',
          'B) School gardens offer broad educational benefits but require staffing support.',
          'C) Attendance is unrelated to school gardens.',
          'D) Nutrition is the only outcome that matters.'
        ],
        answer: 'B',
        rationale:
          'B captures multiple benefits and the stated constraint.'
      },
      {
        level: 'Medium',
        passage:
          'A report compares reusable-packaging pilots across three cities, finding lower waste but inconsistent return rates where drop-off sites are sparse.',
        question: 'Best central idea?',
        choices: [
          'A) Reusable packaging always fails.',
          'B) Reusable packaging can reduce waste, but logistics determine success.',
          'C) Drop-off sites are unnecessary.',
          'D) The three cities used identical policies.'
        ],
        answer: 'B',
        rationale:
          'The key message is conditional effectiveness tied to logistics.'
      },
      {
        level: 'Hard',
        passage:
          'The author reviews AI tutoring studies, noting gains in short quizzes but mixed transfer to long-term retention without teacher-guided reflection.',
        question: 'Most accurate central idea?',
        choices: [
          'A) AI tutoring is harmful in all contexts.',
          'B) AI tutoring can improve immediate performance, but long-term gains depend on implementation.',
          'C) Teacher guidance is obsolete with AI.',
          'D) Quiz gains prove permanent mastery.'
        ],
        answer: 'B',
        rationale:
          'B preserves nuance about short-term gains and conditional long-term outcomes.'
      }
    ],
    commonMistakes: [
      'Selecting a detail instead of the umbrella claim.',
      'Ignoring limitation language introduced by however.',
      'Choosing absolute statements unsupported by passage.',
      'Confusing topic with central claim.'
    ],
    quickReference:
      'Central idea = one sentence that every major detail can support.'
  },

  command_of_evidence: {
    domain: 'Information and Ideas',
    skill: 'Command of Evidence',
    filename: 'reading_writing-command-of-evidence.pdf',
    overview:
      'Command of Evidence questions ask which detail best supports a claim, or which claim is best supported by given evidence. Precision matters: strongest support is specific, relevant, and directly tied to the claim.',
    keyConcepts: [
      'Evidence must support the exact claim, not just the topic.',
      'Specific data beats vague general statements.',
      'Comparative evidence often strengthens causal interpretations.',
      'A relevant quote can still be weak if indirect.',
      'Best support aligns in scope and timeframe with the claim.'
    ],
    whyMatters:
      'Evidence matching is a core SAT skill and a core academic skill. Correct choices show direct logical linkage, not broad thematic overlap.',
    coreStrategies: [
      'Underline the claim\'s key terms and scope.',
      'Find evidence with direct causal or comparative link.',
      'Prefer quantified or concrete details.',
      'Eliminate details that are merely background.',
      'Check that evidence does not partially contradict claim.'
    ],
    patternsSignals: [
      'Strong support pattern: claim + measured outcome.',
      'Weak support pattern: topic mention without direct linkage.',
      'Comparative evidence: control group vs intervention group.',
      'Temporal match: evidence period matches claim period.',
      'Scope match: population in evidence matches claim population.'
    ],
    stepByStep: [
      'Clarify claim in your own words.',
      'Scan options for directly linked specifics.',
      'Test each option for relevance and sufficiency.',
      'Reject broad or tangential details.',
      'Select the most direct and complete support.'
    ],
    workedExamples: [
      {
        passage:
          'Claim: Text reminders improved clinic attendance. Evidence options include attendance rates before and after reminders plus unrelated patient-satisfaction comments.',
        question: 'Which evidence best supports the claim?',
        choices: [
          'A) Patients said reminders were convenient.',
          'B) Missed appointments fell from 22% to 13% after reminders began.',
          'C) The clinic added two nurses in spring.',
          'D) Staff reported fewer scheduling calls.'
        ],
        answer: 'B',
        explanation:
          'B gives direct quantified attendance change aligned with the claim.',
        wrongWhy:
          'A and D are indirect; C introduces confounding context without direct support.'
      },
      {
        passage:
          'Claim: Native plants improve pollinator diversity in school gardens.',
        question: 'Which detail is strongest evidence?',
        choices: [
          'A) Students preferred colorful flowers.',
          'B) Gardens with >60% native species hosted 35% more pollinator species than gardens with <20%.',
          'C) Garden clubs met twice weekly.',
          'D) Native plants require less mowing.'
        ],
        answer: 'B',
        explanation:
          'B is a direct comparative biodiversity metric tied exactly to the claim.',
        wrongWhy:
          'A/C/D may be true but do not directly prove diversity increase.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'Claim: The reading intervention improved comprehension.',
        question: 'Best supporting evidence?',
        choices: [
          'A) Teachers liked the curriculum.',
          'B) Mean comprehension scores rose from 71 to 79 after implementation.',
          'C) Class size changed slightly.',
          'D) Students read fiction and nonfiction.'
        ],
        answer: 'B',
        rationale:
          'Score increase directly supports improved comprehension.'
      },
      {
        level: 'Medium',
        passage:
          'Claim: LED retrofits lowered municipal energy use.',
        question: 'Strongest evidence?',
        choices: [
          'A) Energy bills fell 18% year-over-year after retrofit completion.',
          'B) Residents said streets looked brighter.',
          'C) The city also repaved roads.',
          'D) LEDs come in multiple color temperatures.'
        ],
        answer: 'A',
        rationale:
          'A provides direct quantitative outcome aligned to the claim.'
      },
      {
        level: 'Hard',
        passage:
          'Claim: Flexible deadlines reduced late submissions without reducing assignment quality.',
        question: 'Best evidence pair?',
        choices: [
          'A) Late rate dropped from 19% to 9%; rubric scores stayed within 0.2 points of baseline.',
          'B) Students reported less stress.',
          'C) Instructors changed textbook editions.',
          'D) Class discussion participation increased.'
        ],
        answer: 'A',
        rationale:
          'A addresses both parts of the claim: timeliness and quality stability.'
      }
    ],
    commonMistakes: [
      'Choosing evidence that is relevant but not sufficient.',
      'Ignoring mismatch in scope or timeframe.',
      'Preferring anecdote over direct quantitative support.',
      'Missing partial contradictions inside an option.'
    ],
    quickReference:
      'Best evidence is direct, specific, scope-matched, and claim-complete.'
  },

  inference: {
    domain: 'Information and Ideas',
    skill: 'Inference',
    filename: 'reading_writing-inference.pdf',
    overview:
      'Inference questions ask what is most reasonably concluded from the passage. Correct inferences are text-grounded and cautious, avoiding claims that exceed the available evidence.',
    keyConcepts: [
      'Inference is implied support, not speculation.',
      'Best answers use measured language: suggests, likely, may.',
      'Absolute language is often too strong.',
      'Inference must align with multiple details when possible.',
      'Outside knowledge should never drive selection.'
    ],
    whyMatters:
      'Inference appears across narrative, science, and social science passages. Strong inference discipline improves accuracy on nuanced items with plausible distractors.',
    coreStrategies: [
      'Restate key evidence before reading options.',
      'Choose the most defensible, least extreme conclusion.',
      'Eliminate options adding new unsupported claims.',
      'Watch for causation claims when only correlation is shown.',
      'Prefer choices with cautious modal verbs.'
    ],
    patternsSignals: [
      'Cautious inference cues: may, suggests, indicates, could.',
      'Overreach red flags: proves, always, never, guarantees.',
      'Correlation pattern: associated with does not equal causes.',
      'Limitation pattern: small sample weakens broad claims.',
      'Scope pattern: one context cannot imply universal rule.'
    ],
    stepByStep: [
      'Collect two to three key textual facts.',
      'Form a cautious one-line inference.',
      'Compare options for strength and scope.',
      'Discard overgeneralized or external-knowledge choices.',
      'Select most text-defensible statement.'
    ],
    workedExamples: [
      {
        passage:
          'A study found students reviewing within 24 hours scored higher, but the sample came from one magnet school.',
        question: 'Which inference is best supported?',
        choices: [
          'A) Early review always improves scores for all students.',
          'B) Timely review may improve scores, though generalization is limited.',
          'C) Review timing has no effect.',
          'D) Magnet schools are superior to all schools.'
        ],
        answer: 'B',
        explanation:
          'B reflects both positive trend and explicit sample limitation.',
        wrongWhy:
          'A too absolute; C contradicts trend; D unsupported comparison.'
      },
      {
        passage:
          'After adding shade structures, a park saw higher midday visits; weather that month was also milder than average.',
        question: 'Best inference?',
        choices: [
          'A) Shade structures alone caused the increase.',
          'B) Park management should remove shade structures.',
          'C) Shade structures may have contributed, but weather could also be a factor.',
          'D) Visitors now prefer mornings over midday.'
        ],
        answer: 'C',
        explanation:
          'C accounts for both plausible contributors without overclaiming causation.',
        wrongWhy:
          'A overstates causality; B unsupported; D contradicts stated rise in midday visits.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'A pilot class using weekly retrieval quizzes showed higher unit-test scores than a non-quiz class.',
        question: 'Reasonable inference?',
        choices: [
          'A) Retrieval quizzes may support learning outcomes.',
          'B) Quizzes always increase scores in every subject.',
          'C) Non-quiz classes never learn material.',
          'D) Unit tests are invalid measures.'
        ],
        answer: 'A',
        rationale:
          'A is cautious and directly supported by observed score difference.'
      },
      {
        level: 'Medium',
        passage:
          'A regional survey found households with efficient appliances used less electricity, but income differences were not controlled.',
        question: 'Best inference?',
        choices: [
          'A) Appliance efficiency causes lower use in all contexts.',
          'B) Efficient appliances are associated with lower use, though confounders remain.',
          'C) Income has no role in electricity consumption.',
          'D) Survey data cannot support any conclusions.'
        ],
        answer: 'B',
        rationale:
          'B acknowledges association and limitation from uncontrolled income.'
      },
      {
        level: 'Hard',
        passage:
          'An archive search found more references to women inventors after 1880, coinciding with expanded patent access laws.',
        question: 'Most supported inference?',
        choices: [
          'A) Patent access reforms may have increased documented participation by women inventors.',
          'B) Reforms fully eliminated gender barriers.',
          'C) Women did not invent anything before 1880.',
          'D) Archive references are unrelated to policy shifts.'
        ],
        answer: 'A',
        rationale:
          'A is a cautious causal hypothesis tied to the timing evidence.'
      }
    ],
    commonMistakes: [
      'Selecting bold claims not warranted by evidence.',
      'Ignoring explicit limitations in sample or method.',
      'Confusing possibility with certainty.',
      'Adding outside assumptions to fill gaps.'
    ],
    quickReference:
      'Inference = strongest claim the evidence can safely carry, no more.'
  },

  quantitative_information: {
    domain: 'Information and Ideas',
    skill: 'Quantitative Information in Text and Graphics',
    filename: 'reading_writing-quantitative-information-in-text-and-graphics.pdf',
    overview:
      'These questions combine prose with tables or charts. You must read labels, units, trends, and comparative values accurately, then connect the data to claims in the text without overstating what numbers prove.',
    keyConcepts: [
      'Always read title, axis labels, and units first.',
      'Compare like with like: same category, same timeframe.',
      'Check scale compression that can exaggerate visual differences.',
      'Differentiate direct values from rate-of-change patterns.',
      'Data may support association, not definitive causation.'
    ],
    whyMatters:
      'Data-literacy questions reward precision under time pressure. Clean graph-reading habits prevent avoidable errors from misread scales and mismatched units.',
    coreStrategies: [
      'Translate visual into one sentence before choosing.',
      'Use exact values when provided; estimate only when necessary.',
      'Cross-check text claims against chart evidence.',
      'Reject choices that exaggerate small differences.',
      'Confirm denominator in percentages and proportions.'
    ],
    patternsSignals: [
      'Trend terms: increased, declined, plateaued, fluctuated.',
      'Comparison terms: higher than, lower than, similar to.',
      'Rate language: per year, per capita, percentage-point change.',
      'Causation caution: associated with does not prove caused by.',
      'Graph mismatch trap: wrong year, category, or axis.'
    ],
    stepByStep: [
      'Read question target first.',
      'Locate exact data needed on graphic.',
      'Compute if required with units shown.',
      'Match option wording to data precision.',
      'Pick statement that is accurate and not overstated.'
    ],
    workedExamples: [
      {
        passage:
          'A chart shows bike commutes: 2019 8%, 2020 11%, 2021 14%, 2022 13%.',
        question: 'Which claim is best supported?',
        choices: [
          'A) Bike commuting increased every year.',
          'B) Bike commuting rose overall, with a slight dip in 2022.',
          'C) Bike commuting fell sharply after 2020.',
          'D) Bike commuting remained unchanged.'
        ],
        answer: 'B',
        explanation:
          'Data rise from 8 to 14 then slip to 13, so overall increase with minor decline is accurate.',
        wrongWhy:
          'A ignores dip; C and D contradict values.'
      },
      {
        passage:
          'Table: Program A 72/100 pass, Program B 81/120 pass.',
        question: 'Which statement is correct?',
        choices: [
          'A) Program B has a higher pass rate.',
          'B) Program A has a higher pass rate.',
          'C) Pass rates are equal.',
          'D) Cannot compare because totals differ.'
        ],
        answer: 'B',
        explanation:
          'A rate 72%; B rate 67.5%. Different totals are comparable using percentages.',
        wrongWhy:
          'A compares raw counts incorrectly; C false; D misunderstands rate comparison.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'A graph reports monthly rainfall: Jan 2, Feb 3, Mar 5, Apr 4 inches.',
        question: 'Best supported statement?',
        choices: [
          'A) Rainfall increased every month.',
          'B) Rainfall peaked in March before declining in April.',
          'C) February had the most rainfall.',
          'D) Rainfall was constant.'
        ],
        answer: 'B',
        rationale:
          'March is highest at 5, then April falls to 4.'
      },
      {
        level: 'Medium',
        passage:
          'A table shows average scores: Method X 78, Method Y 84, Method Z 80.',
        question: 'Accurate claim?',
        choices: [
          'A) Method Y yields the highest average score.',
          'B) Methods Y and Z are tied.',
          'C) Method X outperforms Method Y.',
          'D) No method differs.'
        ],
        answer: 'A',
        rationale:
          '84 is the highest listed average among three methods.'
      },
      {
        level: 'Hard',
        passage:
          'Text claims a new bus route reduced delays. Chart shows mean delay dropped from 9.2 to 7.8 minutes while traffic volume also decreased 6%.',
        question: 'Best evaluation of the claim?',
        choices: [
          'A) Chart proves route change alone caused delay reductions.',
          'B) Chart supports a reduction in delays but does not isolate a single cause.',
          'C) Chart shows delays increased after route launch.',
          'D) Chart is irrelevant to delay claims.'
        ],
        answer: 'B',
        rationale:
          'Delay decreased, but concurrent traffic change means causation is not isolated.'
      }
    ],
    commonMistakes: [
      'Reading raw counts instead of rates when totals differ.',
      'Ignoring units, labels, or timeframe.',
      'Overclaiming causation from correlational data.',
      'Misreading visual scale effects.'
    ],
    quickReference:
      'Read labels -> compute accurately -> match claim strength to what data actually shows.'
  },

  grammar: {
    domain: 'Standard English Conventions',
    skill: 'Grammar',
    filename: 'reading_writing-grammar.pdf',
    overview:
      'Grammar questions test sentence completeness, subject-verb agreement, pronoun-antecedent agreement, and clear modifier placement. The SAT favors standard written English that is clear, grammatical, and concise.',
    keyConcepts: [
      'A complete sentence needs an independent clause.',
      'Subjects and verbs must agree in number and person.',
      'Pronouns must agree with clear antecedents.',
      'Modifiers should sit next to the words they modify.',
      'Avoid fragments, run-ons, and faulty coordination.'
    ],
    whyMatters:
      'Grammar conventions power many SAT writing items. Reliable rule application turns these into high-confidence points under timed conditions.',
    coreStrategies: [
      'Find the main subject and main verb first.',
      'Ignore interrupting phrases when checking agreement.',
      'Test whether each clause is independent or dependent.',
      'Place modifiers next to target nouns.',
      'Prefer clear, standard sentence boundaries.'
    ],
    patternsSignals: [
      'Agreement trap: along with, as well as do not make plural subjects.',
      'Fragment cue: subordinate opener without independent clause.',
      'Run-on cue: two independent clauses with no proper connector.',
      'Pronoun cue: each/everyone takes singular pronoun in formal SAT style.',
      'Modifier cue: dangling opening phrase should modify sentence subject.'
    ],
    stepByStep: [
      'Identify clause boundaries.',
      'Verify independent clause presence.',
      'Check subject-verb and pronoun agreement.',
      'Fix modifier placement and reference clarity.',
      'Reread for grammatical and logical smoothness.'
    ],
    workedExamples: [
      {
        passage:
          'The collection of essays, along with the author\'s notes, _____ on display this week.',
        question: 'Which verb is correct?',
        choices: [
          'A) are',
          'B) were',
          'C) is',
          'D) have been'
        ],
        answer: 'C',
        explanation:
          'Main subject is collection (singular). Along with phrase is interrupting and does not change number.',
        wrongWhy:
          'A/B/D incorrectly treat notes as grammatical subject.'
      },
      {
        passage:
          'Walking through the gallery, the sculptures were arranged by decade.',
        question: 'Best revision?',
        choices: [
          'A) Walking through the gallery, the sculptures were arranged by decade.',
          'B) Walking through the gallery, visitors saw sculptures arranged by decade.',
          'C) The sculptures, walking through the gallery, were arranged by decade.',
          'D) By decade, walking through the gallery arranged sculptures.'
        ],
        answer: 'B',
        explanation:
          'Original has dangling modifier. B supplies a logical subject performing walking.',
        wrongWhy:
          'A keeps error; C illogical; D ungrammatical.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'Each of the volunteers _____ trained before the event.',
        question: 'Choose the correct verb.',
        choices: [
          'A) were',
          'B) are',
          'C) is',
          'D) have'
        ],
        answer: 'C',
        rationale:
          'Each is singular, so singular verb is is required.'
      },
      {
        level: 'Medium',
        passage:
          'Because the forecast predicted storms. The race was postponed.',
        question: 'Best correction?',
        choices: [
          'A) Because the forecast predicted storms, the race was postponed.',
          'B) Because the forecast predicted storms.',
          'C) The race, because the forecast predicted storms.',
          'D) Forecast predicted storms; because race postponed.'
        ],
        answer: 'A',
        rationale:
          'A fixes fragment by attaching dependent clause to independent clause.'
      },
      {
        level: 'Hard',
        passage:
          'Neither the coaches nor the captain _____ aware of the schedule change.',
        question: 'Correct verb?',
        choices: [
          'A) were',
          'B) is',
          'C) are',
          'D) have been'
        ],
        answer: 'B',
        rationale:
          'With neither...nor, verb agrees with nearer subject captain (singular).' 
      }
    ],
    commonMistakes: [
      'Treating interrupting phrases as part of the subject.',
      'Missing fragments after subordinate conjunctions.',
      'Leaving dangling modifiers unresolved.',
      'Using colloquial agreement instead of standard written form.'
    ],
    quickReference:
      'Find core clause first. Then check agreement, boundaries, and modifier logic.'
  },

  modifier_placement: {
    domain: 'Standard English Conventions',
    skill: 'Modifier Placement',
    filename: 'reading_writing-modifier-placement.pdf',
    overview:
      'Modifier Placement questions test whether descriptive phrases clearly modify the intended word. Misplaced and dangling modifiers create ambiguity or illogical meaning and are common SAT traps.',
    keyConcepts: [
      'Place modifiers next to what they modify.',
      'Opening participial phrases must describe the sentence subject.',
      'Limiters like only and almost should sit near target words.',
      'Avoid distance between modifier and noun.',
      'Ambiguity often signals misplaced modification.'
    ],
    whyMatters:
      'Modifier clarity improves precision and prevents unintended meaning shifts. SAT choices often differ only by modifier position, so this is a high-value rule set.',
    coreStrategies: [
      'Identify the modifier and intended target noun.',
      'Move modifier directly beside target.',
      'Fix dangling openings by adding a logical subject.',
      'Check limiters for scope: only modifies what follows.',
      'Reread to ensure one clear interpretation.'
    ],
    patternsSignals: [
      'Dangling opener: After reviewing the data, the conclusion was clear.',
      'Misplaced adverb: She almost drove her kids to school every day.',
      'Squinting modifier: Students who practice often improve quickly.',
      'Limiter scope: only, nearly, just, even.',
      'Relative clause placement: which/who should follow noun immediately.'
    ],
    stepByStep: [
      'Locate descriptive phrase or adverb.',
      'Find the word it should modify.',
      'Place modifier adjacent to target.',
      'Resolve dangling construction if needed.',
      'Check for unintended alternate meanings.'
    ],
    workedExamples: [
      {
        passage:
          'After reading the article, the experiment seemed less convincing.',
        question: 'Best revision?',
        choices: [
          'A) After reading the article, the experiment seemed less convincing.',
          'B) After reading the article, Maya found the experiment less convincing.',
          'C) The experiment, after reading the article, seemed less convincing.',
          'D) After reading, less convincing was the experiment article.'
        ],
        answer: 'B',
        explanation:
          'Opening phrase needs a person who did the reading; B supplies logical subject Maya.',
        wrongWhy:
          'A keeps dangling modifier; C still illogical; D ungrammatical.'
      },
      {
        passage:
          'The guide explained only the interns completed the safety training.',
        question: 'Best placement of only?',
        choices: [
          'A) The guide explained only the interns completed the safety training.',
          'B) The guide explained the interns only completed the safety training.',
          'C) The guide explained that only the interns completed the safety training.',
          'D) Only the guide explained the interns completed the safety training.'
        ],
        answer: 'C',
        explanation:
          'C clearly limits who completed training: only the interns.',
        wrongWhy:
          'A ambiguous syntax; B limits completed; D limits who explained.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'Running to catch the bus, the backpack strap snapped.',
        question: 'Best revision?',
        choices: [
          'A) Running to catch the bus, the backpack strap snapped.',
          'B) Running to catch the bus, Lena felt her backpack strap snap.',
          'C) The backpack strap, running to catch the bus, snapped.',
          'D) Running to catch, snapped the backpack strap.'
        ],
        answer: 'B',
        rationale:
          'B provides a logical subject performing running.'
      },
      {
        level: 'Medium',
        passage:
          'The analyst almost reviewed every report.',
        question: 'If meaning is reviewed nearly every report, best revision?',
        choices: [
          'A) The analyst reviewed almost every report.',
          'B) Almost, the analyst reviewed every report.',
          'C) The analyst almost reviewed every report.',
          'D) Every report was almost reviewed by the analyst.'
        ],
        answer: 'A',
        rationale:
          'Almost must modify every report, not reviewed.'
      },
      {
        level: 'Hard',
        passage:
          'The committee approved proposals from local schools that were submitted late.',
        question: 'If submitted late modifies proposals, best revision?',
        choices: [
          'A) The committee approved proposals that were submitted late from local schools.',
          'B) The committee approved local schools that submitted proposals late.',
          'C) The committee, from local schools, approved proposals submitted late.',
          'D) Late proposals were approved from local schools by the committee.'
        ],
        answer: 'A',
        rationale:
          'A places relative clause directly after proposals to reduce ambiguity.'
      }
    ],
    commonMistakes: [
      'Leaving opening modifiers without logical subjects.',
      'Placing only in a location that changes meaning.',
      'Allowing relative clauses to drift from target noun.',
      'Accepting ambiguous sentences that technically parse.'
    ],
    quickReference:
      'Modifier rule: keep descriptor glued to target word or noun phrase.'
  },

  parallel_structure: {
    domain: 'Standard English Conventions',
    skill: 'Parallel Structure',
    filename: 'reading_writing-parallel-structure.pdf',
    overview:
      'Parallel Structure questions test whether coordinated items share the same grammatical form. Balanced form improves clarity in lists, comparisons, and paired constructions such as not only...but also.',
    keyConcepts: [
      'Items joined by and/or should match grammatical shape.',
      'Comparisons with than/as should compare like forms.',
      'Correlative pairs require symmetry.',
      'Verb forms in series should stay consistent.',
      'Parallelism often reveals and fixes hidden errors quickly.'
    ],
    whyMatters:
      'Parallelism appears often in revision choices and can be solved mechanically. Consistent structure makes prose easier to read and reason through.',
    coreStrategies: [
      'Find the first item and mirror its form.',
      'Check lists for noun-noun-noun or verb-verb-verb consistency.',
      'Balance correlative constructions on both sides.',
      'Repair faulty comparisons by matching category type.',
      'Read aloud mentally for rhythm breaks.'
    ],
    patternsSignals: [
      'List pattern: to read, to annotate, and to revise.',
      'Gerund pattern: reading, annotating, revising.',
      'Correlative pattern: not only X but also Y.',
      'Comparison pattern: more efficient than previous methods.',
      'Either-or pattern: either submit online or deliver in person.'
    ],
    stepByStep: [
      'Identify coordinated elements.',
      'Determine grammatical form of first element.',
      'Make remaining elements match form.',
      'Check correlative and comparison balance.',
      'Reread sentence for smooth, symmetrical flow.'
    ],
    workedExamples: [
      {
        passage:
          'The workshop teaches students to draft quickly, careful revision, and presenting clearly.',
        question: 'Best revision?',
        choices: [
          'A) to draft quickly, careful revision, and presenting clearly',
          'B) drafting quickly, revising carefully, and presenting clearly',
          'C) to draft quickly, to revise carefully, and presenting clearly',
          'D) drafting quickly, careful revision, and to present clearly'
        ],
        answer: 'B',
        explanation:
          'All items become parallel gerunds: drafting, revising, presenting.',
        wrongWhy:
          'A/C/D mix forms and break parallelism.'
      },
      {
        passage:
          'The proposal is more practical than innovation.',
        question: 'Best correction?',
        choices: [
          'A) more practical than innovation',
          'B) more practical than innovative',
          'C) more practical than it is innovative',
          'D) more practical than innovating'
        ],
        answer: 'C',
        explanation:
          'Comparison should align adjectives or full clauses; C provides clear like-with-like comparison.',
        wrongWhy:
          'A compares adjective to noun; B alters meaning; D shifts word class.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The intern was valued for organizing files, answering emails, and to schedule meetings.',
        question: 'Best revision?',
        choices: [
          'A) organizing files, answering emails, and scheduling meetings',
          'B) organizing files, answering emails, and to schedule meetings',
          'C) to organize files, answering emails, and scheduling meetings',
          'D) organized files, answering emails, and scheduling meetings'
        ],
        answer: 'A',
        rationale:
          'A maintains consistent gerund form across list items.'
      },
      {
        level: 'Medium',
        passage:
          'Not only did the app reduce wait times but also customer complaints declined.',
        question: 'Best revision?',
        choices: [
          'A) Not only did the app reduce wait times but customer complaints also declined.',
          'B) Not only the app reduced wait times but also customer complaints declined.',
          'C) The app not only reduced wait times but also declining complaints.',
          'D) Not only reducing wait times, but also customer complaints declined.'
        ],
        answer: 'A',
        rationale:
          'A balances the correlative construction with parallel clause structure.'
      },
      {
        level: 'Hard',
        passage:
          'Researchers compared reading on paper with screen users.',
        question: 'Best correction?',
        choices: [
          'A) compared reading on paper with screen users',
          'B) compared readers using paper with readers using screens',
          'C) compared paper with screen users',
          'D) compared reading on paper with using screens users'
        ],
        answer: 'B',
        rationale:
          'B compares equivalent noun phrases: readers vs readers.'
      }
    ],
    commonMistakes: [
      'Mixing infinitives, gerunds, and nouns in one list.',
      'Comparing unlike things (method vs person).',
      'Unbalanced not only...but also constructions.',
      'Ignoring rhythm clues that signal asymmetry.'
    ],
    quickReference:
      'Parallel check: coordinated elements must share form and category.'
  },

  pronoun_clarity: {
    domain: 'Standard English Conventions',
    skill: 'Pronoun Clarity',
    filename: 'reading_writing-pronoun-clarity.pdf',
    overview:
      'Pronoun Clarity questions test whether pronouns have clear, unambiguous antecedents and correct agreement. SAT answers prioritize precision over conversational convenience.',
    keyConcepts: [
      'Every pronoun should point clearly to one noun.',
      'Pronoun number must match antecedent number.',
      'Avoid this/that/it when reference is vague.',
      'Who vs whom depends on sentence role.',
      'Collective nouns can be singular in formal SAT usage.'
    ],
    whyMatters:
      'Pronoun ambiguity creates logical confusion and is heavily tested in editing contexts. Clear reference improves both sentence-level correctness and overall coherence.',
    coreStrategies: [
      'Find antecedent before confirming pronoun choice.',
      'Replace pronoun with noun to test clarity.',
      'Use singular they carefully only when option set allows; SAT often prefers explicit nouns.',
      'Avoid demonstratives without noun anchors.',
      'Check case: subjective, objective, possessive.'
    ],
    patternsSignals: [
      'Ambiguity pattern: When Maya met Ana, she smiled.',
      'Vague this pattern: This shows the policy failed.',
      'Agreement pattern: each student -> his or her/student\'s.',
      'Case pattern: Who called? Whom did you call?',
      'Possessive pattern: its vs it\'s.'
    ],
    stepByStep: [
      'Locate pronoun and candidate antecedents.',
      'Choose nearest logical antecedent check.',
      'Test number and person agreement.',
      'Replace vague pronoun with specific noun if needed.',
      'Verify case and possessive form.'
    ],
    workedExamples: [
      {
        passage:
          'When the architect met the contractor, she requested revised blueprints.',
        question: 'Which revision improves pronoun clarity?',
        choices: [
          'A) No change',
          'B) When the architect met the contractor, the architect requested revised blueprints.',
          'C) When she met the contractor, revised blueprints were requested.',
          'D) Meeting the contractor, she requested revisions.'
        ],
        answer: 'B',
        explanation:
          'B removes ambiguity by naming the antecedent explicitly.',
        wrongWhy:
          'A/C/D keep ambiguous she reference.'
      },
      {
        passage:
          'The report cites delayed shipments. This suggests revising supplier contracts.',
        question: 'Best revision for clarity?',
        choices: [
          'A) This suggests revising supplier contracts.',
          'B) That suggests revising supplier contracts.',
          'C) This one suggests revising supplier contracts.',
          'D) The shipment delays suggest revising supplier contracts.'
        ],
        answer: 'D',
        explanation:
          'D replaces vague demonstrative with a precise noun phrase.',
        wrongWhy:
          'A/B/C leave unclear reference for this/that.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'If a student forgets _____ calculator, the proctor cannot provide one.',
        question: 'Best choice in formal SAT style?',
        choices: [
          'A) their',
          'B) his or her',
          'C) our',
          'D) your'
        ],
        answer: 'B',
        rationale:
          'Singular student takes singular formal agreement in typical SAT convention.'
      },
      {
        level: 'Medium',
        passage:
          'The scientists interviewed the engineers, and they recommended calibration.',
        question: 'Best revision for clarity?',
        choices: [
          'A) and they recommended calibration',
          'B) and the scientists recommended calibration',
          'C) and this recommended calibration',
          'D) and those recommended calibration'
        ],
        answer: 'B',
        rationale:
          'Explicit noun removes ambiguity around who recommended calibration.'
      },
      {
        level: 'Hard',
        passage:
          '_____ did the committee invite to present the findings?',
        question: 'Choose the correct pronoun.',
        choices: [
          'A) Who',
          'B) Whom',
          'C) Whoever',
          'D) Whose'
        ],
        answer: 'B',
        rationale:
          'Pronoun is object of invite, so objective case whom is correct.'
      }
    ],
    commonMistakes: [
      'Leaving pronouns with multiple possible antecedents.',
      'Using vague this/that without noun reference.',
      'Mismatching singular antecedents with plural pronouns.',
      'Confusing who and whom by role.'
    ],
    quickReference:
      'Pronoun test: clear antecedent, correct number, correct case.'
  },

  punctuation: {
    domain: 'Standard English Conventions',
    skill: 'Punctuation',
    filename: 'reading_writing-punctuation.pdf',
    overview:
      'Punctuation questions test commas, semicolons, colons, dashes, apostrophes, and quotation conventions. Correct punctuation reflects sentence structure, not pause length or speaking style.',
    keyConcepts: [
      'Comma + FANBOYS joins two independent clauses.',
      'Semicolon joins related independent clauses without conjunction.',
      'Colon follows an independent clause and introduces explanation/list.',
      'Dashes set off emphasis or interruption.',
      'Apostrophes show possession or contractions, not plurals.'
    ],
    whyMatters:
      'Punctuation rules are highly testable and predictable. Structural punctuation mastery yields quick points and cleaner writing.',
    coreStrategies: [
      'Identify clause type before selecting punctuation.',
      'Use semicolon only between two complete clauses.',
      'Use colon only after a complete introductory clause.',
      'Avoid comma splices between independent clauses.',
      'Check apostrophe ownership and number carefully.'
    ],
    patternsSignals: [
      'Comma splice error: clause, clause.',
      'Semicolon pattern: clause; clause.',
      'Colon pattern: clause: explanation/list/example.',
      'Nonessential element: commas or dashes around interrupter.',
      'Possessive pattern: singular noun\'s, plural nouns\'.'
    ],
    stepByStep: [
      'Mark each clause as independent or dependent.',
      'Choose punctuation matching clause relationship.',
      'Test if removed phrase is nonessential.',
      'Verify possessive apostrophe placement.',
      'Reread for structural correctness and clarity.'
    ],
    workedExamples: [
      {
        passage:
          'The pilot ended early, the team still collected enough data.',
        question: 'Best punctuation revision?',
        choices: [
          'A) The pilot ended early, the team still collected enough data.',
          'B) The pilot ended early; the team still collected enough data.',
          'C) The pilot ended early: and the team still collected enough data.',
          'D) The pilot ended early the team still collected enough data.'
        ],
        answer: 'B',
        explanation:
          'Two independent clauses need semicolon (or comma + conjunction).',
        wrongWhy:
          'A comma splice; C faulty colon/conjunction; D run-on.'
      },
      {
        passage:
          'The committee approved three priorities energy efficiency stormwater capture and transit reliability.',
        question: 'Best revision?',
        choices: [
          'A) approved three priorities energy efficiency, stormwater capture, and transit reliability.',
          'B) approved three priorities: energy efficiency, stormwater capture, and transit reliability.',
          'C) approved three priorities; energy efficiency, stormwater capture, and transit reliability.',
          'D) approved three priorities, energy efficiency stormwater capture, and transit reliability.'
        ],
        answer: 'B',
        explanation:
          'Independent clause introduces a list, so colon is correct.',
        wrongWhy:
          'A missing separator; C semicolon misused; D list punctuation incomplete.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The researchers published the report _____ they presented it at the conference.',
        question: 'Best punctuation/conjunction completion?',
        choices: [
          'A) , and',
          'B) ; and',
          'C) : and',
          'D) ,'
        ],
        answer: 'A',
        rationale:
          'Two independent clauses joined with coordinating conjunction need comma + and.'
      },
      {
        level: 'Medium',
        passage:
          'My two mentors advice shaped the project timeline.',
        question: 'Correct apostrophe form?',
        choices: [
          'A) mentors',
          'B) mentor\'s',
          'C) mentors\'',
          'D) mentor\'s\''
        ],
        answer: 'C',
        rationale:
          'Plural mentors possessive is mentors\'.'
      },
      {
        level: 'Hard',
        passage:
          'The trial was small _____ its findings were still informative.',
        question: 'Best punctuation?',
        choices: [
          'A) ;',
          'B) ,',
          'C) :',
          'D) -'
        ],
        answer: 'A',
        rationale:
          'Independent clause + independent clause without conjunction takes semicolon.'
      }
    ],
    commonMistakes: [
      'Using commas between independent clauses without conjunction.',
      'Using semicolons before dependent clauses.',
      'Misplacing apostrophes for plurals.',
      'Using colons after fragments.'
    ],
    quickReference:
      'Punctuation follows structure: clause type first, mark second.'
  },

  verb_tense_and_agreement: {
    domain: 'Standard English Conventions',
    skill: 'Verb Tense and Agreement',
    filename: 'reading_writing-verb-tense-and-agreement.pdf',
    overview:
      'Verb Tense and Agreement questions test consistent timeline and correct subject-verb pairing. SAT items often include interrupting phrases, collective nouns, and shifts between past and present narration.',
    keyConcepts: [
      'Keep tense consistent unless timeline changes.',
      'Subject-verb agreement depends on grammatical subject, not nearby noun.',
      'Present perfect links past action to present relevance.',
      'Past perfect marks action completed before another past action.',
      'Neither...nor and either...or agree with nearer subject.'
    ],
    whyMatters:
      'These rules appear frequently and can be solved with a structured scan for subject, verb, and timeline anchor words.',
    coreStrategies: [
      'Find time markers first: yesterday, now, by 2023.',
      'Identify true subject by removing prepositional phrases.',
      'Match tense to sequence of events.',
      'Check special agreement structures carefully.',
      'Reread full sentence for timeline coherence.'
    ],
    patternsSignals: [
      'Past marker: last year, in 2019, previously.',
      'Present marker: currently, now, today.',
      'Sequence marker: by the time, after, before.',
      'Agreement trap: one of the + plural noun takes singular verb.',
      'Collective noun pattern: committee is often singular in SAT style.'
    ],
    stepByStep: [
      'Mark timeline cue words.',
      'Locate grammatical subject and candidate verb.',
      'Select tense matching sequence.',
      'Verify number agreement with subject.',
      'Confirm no unnecessary tense shift remains.'
    ],
    workedExamples: [
      {
        passage:
          'By the time the lecture began, the students _____ their notes.',
        question: 'Which verb best completes the sentence?',
        choices: [
          'A) review',
          'B) reviewed',
          'C) had reviewed',
          'D) are reviewing'
        ],
        answer: 'C',
        explanation:
          'Review happened before another past event (lecture began), so past perfect is required.',
        wrongWhy:
          'A/D wrong timeframe; B lacks completed-before-past nuance.'
      },
      {
        passage:
          'One of the latest proposals for the transit plan _____ additional express routes.',
        question: 'Correct verb form?',
        choices: [
          'A) include',
          'B) includes',
          'C) have included',
          'D) were including'
        ],
        answer: 'B',
        explanation:
          'Subject is one (singular), so singular verb includes is correct.',
        wrongWhy:
          'A plural; C tense mismatch; D incorrect aspect.'
      }
    ],
    practiceQuestions: [
      {
        level: 'Easy',
        passage:
          'The team _____ final revisions yesterday.',
        question: 'Best verb?',
        choices: [
          'A) completes',
          'B) completed',
          'C) has completed',
          'D) completing'
        ],
        answer: 'B',
        rationale:
          'Yesterday anchors simple past.'
      },
      {
        level: 'Medium',
        passage:
          'Neither the interns nor the manager _____ available for the briefing.',
        question: 'Correct verb?',
        choices: [
          'A) were',
          'B) is',
          'C) are',
          'D) have been'
        ],
        answer: 'B',
        rationale:
          'Verb agrees with nearer subject manager (singular).' 
      },
      {
        level: 'Hard',
        passage:
          'Since 2021, the research group _____ three follow-up studies on urban heat islands.',
        question: 'Best choice?',
        choices: [
          'A) publishes',
          'B) published',
          'C) has published',
          'D) publishing'
        ],
        answer: 'C',
        rationale:
          'Since + starting point to present typically uses present perfect.'
      }
    ],
    commonMistakes: [
      'Shifting tense without a timeline reason.',
      'Agreeing verb with nearby noun instead of true subject.',
      'Using simple past where past perfect is required.',
      'Missing agreement in neither...nor constructions.'
    ],
    quickReference:
      'Timeline first, subject second: then choose tense and agreement form.'
  }
};

const TOPICS = [
  TOPIC_CONTENT.cross_text_connections,
  TOPIC_CONTENT.rhetorical_purpose,
  TOPIC_CONTENT.text_structure,
  TOPIC_CONTENT.words_in_context,
  TOPIC_CONTENT.concision,
  TOPIC_CONTENT.rhetorical_synthesis,
  TOPIC_CONTENT.sentence_placement,
  TOPIC_CONTENT.transitions,
  TOPIC_CONTENT.central_idea,
  TOPIC_CONTENT.command_of_evidence,
  TOPIC_CONTENT.inference,
  TOPIC_CONTENT.quantitative_information,
  TOPIC_CONTENT.grammar,
  TOPIC_CONTENT.modifier_placement,
  TOPIC_CONTENT.parallel_structure,
  TOPIC_CONTENT.pronoun_clarity,
  TOPIC_CONTENT.punctuation,
  TOPIC_CONTENT.verb_tense_and_agreement
];

function rgb(arr) {
  return arr;
}

function drawPageChrome(doc, accentColor, sectionLabel) {
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(rgb([251, 253, 255]));

  doc.rect(0, 0, PAGE_WIDTH, 76).fill(rgb(NAVY));
  doc.rect(0, 70, PAGE_WIDTH, 6).fill(rgb(accentColor));

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(rgb([191, 219, 254]))
    .text('BUDY.STUDY', CONTENT_X, 18, { width: 140 });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(rgb(WHITE))
    .text(sectionLabel, CONTENT_X, 34, { width: CONTENT_W });
}

function drawFooter(doc, pageNum, skill) {
  const footerY = PAGE_HEIGHT - 32;
  doc
    .moveTo(CONTENT_X, footerY - 8)
    .lineTo(PAGE_WIDTH - CONTENT_X, footerY - 8)
    .lineWidth(0.8)
    .strokeColor(rgb([224, 231, 255]))
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(rgb(MID_GRAY))
    .text(
      `Budy.Study | SAT Reading & Writing | ${skill}`,
      CONTENT_X,
      footerY,
      { width: 360, align: 'left' }
    );

  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(rgb(BRAND_BLUE))
    .text(`Page ${pageNum} of 5`, PAGE_WIDTH - 140, footerY, { width: 100, align: 'right' });
}

function sectionHeader(doc, text, y) {
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .fillColor(rgb(NAVY))
    .text(text, CONTENT_X, y, { width: CONTENT_W });

  const lineY = doc.y + 5;
  doc
    .moveTo(CONTENT_X, lineY)
    .lineTo(PAGE_WIDTH - CONTENT_X, lineY)
    .lineWidth(0.8)
    .strokeColor(rgb([203, 213, 225]))
    .stroke();

  doc.roundedRect(CONTENT_X, lineY - 2, 54, 4, 2).fill(rgb(BRAND_BLUE));
  return lineY + 10;
}

function bodyText(doc, text, x, y, width, height, size = 9.5) {
  doc
    .font('Helvetica')
    .fontSize(size)
    .fillColor(rgb(NAVY))
    .text(text, x, y, {
      width,
      height,
      lineGap: 4,
      ellipsis: false
    });
}

function bulletList(doc, items, x, y, width, lineGap = 3) {
  let currentY = y;
  for (const item of items) {
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(rgb(BRAND_BLUE))
      .text('•', x, currentY + 0.5, { width: 10 });

    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(rgb(NAVY))
      .text(item, x + 12, currentY, { width: width - 12, lineGap });
    currentY = doc.y + 3;
  }
  return currentY;
}

function numberedList(doc, items, x, y, width) {
  let currentY = y;
  items.forEach((item, idx) => {
    doc.roundedRect(x, currentY + 1, 14, 14, 4).fill(rgb([219, 234, 254]));
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(rgb(BRAND_BLUE))
      .text(String(idx + 1), x, currentY + 4, { width: 14, align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(rgb(NAVY))
      .text(item, x + 20, currentY, { width: width - 20, lineGap: 3 });
    currentY = doc.y + 3;
  });
  return currentY;
}

function drawThinAccent(doc, color) {
  doc.rect(0, 0, PAGE_WIDTH, 6).fill(rgb(color));
}

function drawBox(doc, x, y, w, h, fillColor, strokeColor = null) {
  doc.save();
  doc.roundedRect(x, y + 2, w, h, 8).fill(rgb([241, 245, 249]));
  doc.roundedRect(x, y, w, h, 8).fill(rgb(fillColor));
  if (strokeColor) {
    doc
      .roundedRect(x, y, w, h, 8)
      .lineWidth(1)
      .strokeColor(rgb(strokeColor))
      .stroke();
  }
  doc.restore();
}

function drawCoverPage(doc, topic) {
  drawPageChrome(doc, GOLD, `Reading & Writing  |  ${topic.domain}`);

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(rgb(GOLD))
    .text('SAT PREP STUDY GUIDE', CONTENT_X, 48, {
      width: CONTENT_W
    });

  doc.roundedRect(CONTENT_X, 92, 240, 20, 10).fill(rgb([30, 41, 59]));
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(rgb([147, 197, 253]))
    .text(topic.domain.toUpperCase(), CONTENT_X, 98, { width: 240, align: 'center' });

  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(rgb(WHITE))
    .text(topic.skill, CONTENT_X, 118, {
      width: CONTENT_W
    });

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(rgb(LIGHT_GRAY))
    .text('Reading & Writing Study Guide', CONTENT_X, 150, {
      width: CONTENT_W
    });

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(rgb(MID_GRAY))
    .text('5 pages  |  built for fast revision', CONTENT_X, 166, {
      width: CONTENT_W
    });

  let y = 210;
  y = sectionHeader(doc, 'Topic Overview', y);
  bodyText(doc, topic.overview, CONTENT_X, y, CONTENT_W, 86);

  y = 306;
  y = sectionHeader(doc, 'Key Concepts', y);
  bulletList(doc, topic.keyConcepts, 50, y, PAGE_WIDTH - 100);

  y = 552;
  y = sectionHeader(doc, 'Why This Matters on the SAT', y);
  bodyText(doc, topic.whyMatters, CONTENT_X, y, CONTENT_W, 130);

  drawFooter(doc, 1, topic.skill);
}

function drawCoreRulesPage(doc, topic) {
  drawPageChrome(doc, BRAND_BLUE, `${topic.skill}  |  Core Toolkit`);

  let y = 98;
  y = sectionHeader(doc, 'Core Strategies', y);
  numberedList(doc, topic.coreStrategies, 50, y, PAGE_WIDTH - 100);

  y = 230;
  y = sectionHeader(doc, 'Key Patterns & Signals', y);
  bulletList(doc, topic.patternsSignals, 50, y, PAGE_WIDTH - 100);

  y = 445;
  y = sectionHeader(doc, 'Step-by-Step Approach', y);
  numberedList(doc, topic.stepByStep, 50, y, PAGE_WIDTH - 100);

  y = 648;
  drawBox(doc, 40, y, PAGE_WIDTH - 80, 68, [239, 246, 255], BRAND_BLUE);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(rgb(BRAND_BLUE))
    .text('Time Management Tip', 52, y + 10, { width: PAGE_WIDTH - 104 });
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(rgb(NAVY))
    .text('Target about 75 seconds per question. If you are stuck at 50 seconds, eliminate two choices and move on.', 52, y + 28, {
      width: PAGE_WIDTH - 104,
      lineGap: 3
    });

  drawFooter(doc, 2, topic.skill);
}

function drawWorkedExamplesPage(doc, topic) {
  drawPageChrome(doc, GOLD, `${topic.skill}  |  Worked Examples`);

  let y = 98;
  y = sectionHeader(doc, 'Worked Examples', y);

  const blockHeight = 318;
  topic.workedExamples.forEach((ex, idx) => {
    const top = y + idx * 325;

    drawBox(doc, 40, top, PAGE_WIDTH - 80, blockHeight, [255, 251, 235], [245, 158, 11]);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(rgb(NAVY))
      .text(`Example ${idx + 1}`, 52, top + 10, { width: PAGE_WIDTH - 104 });

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(rgb(BRAND_BLUE))
      .text('Passage + Question', 52, top + 30, { width: PAGE_WIDTH - 104 });

    bodyText(doc, `${ex.passage}\n\n${ex.question}`, 52, top + 44, PAGE_WIDTH - 104, 92, 8.7);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(rgb(BRAND_BLUE))
      .text('Choices', 52, top + 138, { width: PAGE_WIDTH - 104 });

    let choiceY = top + 152;
    ex.choices.forEach((choice) => {
      bodyText(doc, choice, 60, choiceY, PAGE_WIDTH - 120, 18, 8.6);
      choiceY += 16;
    });

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(rgb([5, 120, 84]))
      .text(`Correct Answer: ${ex.answer}`, 52, top + 220, { width: PAGE_WIDTH - 104 });

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(rgb(BRAND_BLUE))
      .text('Step-by-Step Explanation', 52, top + 236, { width: PAGE_WIDTH - 104 });

    bodyText(doc, ex.explanation, 52, top + 250, PAGE_WIDTH - 104, 36, 8.6);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(rgb(ROSE))
      .text('Why Wrong Answers Fail', 52, top + 286, { width: PAGE_WIDTH - 104 });

    bodyText(doc, ex.wrongWhy, 52, top + 299, PAGE_WIDTH - 104, 22, 8.4);
  });

  drawFooter(doc, 3, topic.skill);
}

function drawPracticePage(doc, topic) {
  drawPageChrome(doc, GREEN, `${topic.skill}  |  Practice`);

  let y = 98;
  y = sectionHeader(doc, 'Practice Questions', y);

  const qBoxHeight = 208;
  topic.practiceQuestions.forEach((q, idx) => {
    const top = y + idx * 215;
    drawBox(doc, 40, top, PAGE_WIDTH - 80, qBoxHeight, [236, 253, 245], [16, 185, 129]);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(rgb(NAVY))
      .text(`Question ${idx + 1} (${q.level})`, 52, top + 10, { width: PAGE_WIDTH - 104 });

    bodyText(doc, `${q.passage}\n\n${q.question}`, 52, top + 28, PAGE_WIDTH - 104, 72, 8.8);

    let cy = top + 104;
    q.choices.forEach((choice) => {
      bodyText(doc, choice, 60, cy, PAGE_WIDTH - 120, 15, 8.6);
      cy += 14;
    });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(rgb(MID_GRAY))
      .text('Your answer: ____', 52, top + 186, { width: PAGE_WIDTH - 104 });
  });

  drawFooter(doc, 4, topic.skill);
}

function drawAnswerKeyPage(doc, topic) {
  drawPageChrome(doc, BRAND_BLUE, `${topic.skill}  |  Review`);

  let y = 98;
  y = sectionHeader(doc, 'Answer Key', y);

  const answerHeight = 246;
  drawBox(doc, 40, y, PAGE_WIDTH - 80, answerHeight, [239, 246, 255], [26, 86, 219]);

  let ay = y + 12;
  topic.practiceQuestions.forEach((q, idx) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(rgb(NAVY))
      .text(`Q${idx + 1}: ${q.answer}`, 52, ay, { width: PAGE_WIDTH - 104 });
    ay += 15;
    bodyText(doc, q.rationale, 52, ay, PAGE_WIDTH - 104, 52, 8.8);
    ay += 68;
  });

  y = 302;
  y = sectionHeader(doc, 'Common Mistakes to Avoid', y);
  bulletList(doc, topic.commonMistakes, 50, y, PAGE_WIDTH - 100);

  y = 474;
  y = sectionHeader(doc, 'Quick Reference Card', y);
  drawBox(doc, 40, y, PAGE_WIDTH - 80, 122, [255, 251, 235], [245, 158, 11]);
  bodyText(doc, topic.quickReference, 52, y + 14, PAGE_WIDTH - 104, 84, 10);

  drawBox(doc, 40, 642, PAGE_WIDTH - 80, 52, [240, 244, 255], [148, 163, 184]);
  doc
    .font('Helvetica-Bold')
    .fontSize(8.8)
    .fillColor(rgb(BRAND_BLUE))
    .text(
      'Need more help? Visit budy.study for practice tests, AI explanations, and score tracking.',
      52,
      661,
      { width: PAGE_WIDTH - 104, align: 'center' }
    );

  drawFooter(doc, 5, topic.skill);
}

async function generateStudyGuidePDF(topic) {
  const doc = new PDFDocument({
    size: 'letter',
    margins: {
      top: MARGIN_TOP,
      bottom: MARGIN_BOTTOM,
      left: MARGIN_LEFT,
      right: MARGIN_RIGHT
    },
    info: {
      Title: `${topic.skill} - SAT Reading & Writing Study Guide`,
      Author: 'Budy.Study',
      Subject: `SAT Reading & Writing | ${topic.domain} | ${topic.skill}`
    }
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  drawCoverPage(doc, topic);

  doc.addPage();
  drawCoreRulesPage(doc, topic);

  doc.addPage();
  drawWorkedExamplesPage(doc, topic);

  doc.addPage();
  drawPracticePage(doc, topic);

  doc.addPage();
  drawAnswerKeyPage(doc, topic);

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Generating ${TOPICS.length} Reading & Writing study guides...`);

  const manifest = [];

  for (let i = 0; i < TOPICS.length; i += 1) {
    const topic = TOPICS[i];
    const pdf = await generateStudyGuidePDF(topic);
    const outPath = path.join(OUT_DIR, topic.filename);
    fs.writeFileSync(outPath, pdf);

    manifest.push({
      section: 'reading_writing',
      domain: topic.domain,
      skill: topic.skill,
      filename: topic.filename,
      pages: 5
    });

    console.log(`[${i + 1}/${TOPICS.length}] ${topic.skill} -> ${topic.filename}`);
  }

  const manifestPath = path.join(OUT_DIR, 'manifest-rw.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Done. Wrote ${TOPICS.length} PDFs and manifest-rw.json to data/study-guides/.`);
}

main().catch((err) => {
  console.error('Failed to generate Reading & Writing study guides:', err);
  process.exit(1);
});
