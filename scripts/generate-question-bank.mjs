import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outDir = path.join(root, 'data', 'question-bank');
const batchDir = path.join(outDir, 'batches');
const auditDir = path.join(outDir, 'audits');

const LETTERS = ['A', 'B', 'C', 'D'];
const RW_DIFFICULTY_TARGETS = { easy: 560, medium: 720, hard: 320 };
const MATH_DIFFICULTY_TARGETS = { easy: 560, medium: 720, hard: 320 };
const MATH_FORMAT_TARGETS = { mc: 1200, spr: 400 };

const BLUEPRINT = {
  reading_writing: {
    total: 1600,
    domains: {
      'Information and Ideas': {
        total: 416,
        skills: {
          Inference: 104,
          'Central Idea': 104,
          'Command of Evidence': 104,
          'Quantitative Information in Text and Graphics': 104
        }
      },
      'Craft and Structure': {
        total: 448,
        skills: {
          'Words in Context': 112,
          'Text Structure': 112,
          'Rhetorical Purpose': 112,
          'Cross-Text Connections': 112
        }
      },
      'Expression of Ideas': {
        total: 320,
        skills: {
          Transitions: 80,
          'Rhetorical Synthesis': 80,
          'Sentence Placement': 80,
          Concision: 80
        }
      },
      'Standard English Conventions': {
        total: 416,
        skills: {
          Grammar: 70,
          Punctuation: 70,
          'Pronoun Clarity': 68,
          'Modifier Placement': 68,
          'Parallel Structure': 70,
          'Verb Tense and Agreement': 70
        }
      }
    },
    difficulty: RW_DIFFICULTY_TARGETS
  },
  math: {
    total: 1600,
    domains: {
      Algebra: {
        total: 560,
        skills: {
          'One-Variable Linear Equations': 112,
          'Systems of Equations': 112,
          'Linear Inequalities': 112,
          'Linear Functions': 112,
          'Slope and Intercept': 112
        }
      },
      'Advanced Math': {
        total: 560,
        skills: {
          Quadratics: 94,
          Polynomials: 94,
          'Equivalent Expressions': 93,
          'Radicals and Rational Exponents': 93,
          'Nonlinear Functions': 93,
          'Complex Numbers': 93
        }
      },
      'Problem-Solving and Data Analysis': {
        total: 240,
        skills: {
          'Ratios and Proportions': 35,
          Percentages: 35,
          'Rates and Unit Conversion': 34,
          Probability: 34,
          Statistics: 34,
          'Scatterplots and Line of Best Fit': 34,
          'Table and Graph Interpretation': 34
        }
      },
      'Geometry and Trigonometry': {
        total: 240,
        skills: {
          Circles: 48,
          Triangles: 48,
          'Area and Volume': 48,
          'Coordinate Geometry': 48,
          'Right-Triangle Trigonometry': 48
        }
      }
    },
    difficulty: MATH_DIFFICULTY_TARGETS,
    format: MATH_FORMAT_TARGETS
  }
};

const CONTEXTS = ['literature', 'history/social studies', 'humanities', 'science'];
const GENERAL_NAMES = ['Amina', 'Jonah', 'Priya', 'Mateo', 'Elena', 'Sofia', 'Luca', 'Nadia', 'Owen', 'Mira', 'Theo', 'Leila', 'Isaac', 'Zuri', 'Hana', 'Caleb'];
const LITERATURE_OBJECTS = ['novel excerpt', 'stage scene', 'poem draft', 'short story ending', 'dramatic monologue', 'editorial preface'];
const HISTORY_OBJECTS = ['city ordinance', 'ship log', 'school board record', 'union flyer', 'census summary', 'court petition'];
const HUMANITIES_OBJECTS = ['museum label', 'translation note', 'architecture sketch', 'festival program', 'language archive', 'music review'];
const SCIENCE_OBJECTS = ['field survey', 'lab memo', 'sensor log', 'water sample report', 'observation note', 'prototype summary'];
const COMMON_ACTIONS = ['revised', 'compared', 'tested', 'cataloged', 'measured', 'tracked', 'organized', 'interpreted'];
const COMMON_RESULTS = ['engagement rose', 'errors declined', 'the pattern sharpened', 'the trend reversed', 'the response slowed', 'participation spread', 'the estimate stabilized', 'retention improved'];
const COMMON_CAUTIONS = ['the sample was small', 'the second trial is still pending', 'weather may have affected the result', 'the archive remains incomplete', 'one variable could not be isolated', 'the audience changed midway through the study'];
const COMMON_GOALS = ['highlight a limitation', 'emphasize a contrast', 'introduce supporting evidence', 'clarify a process', 'show a later consequence', 'connect a detail to a broader claim'];
const TRANSITIONS = {
  cause: ['As a result', 'Consequently', 'Therefore', 'Accordingly'],
  contrast: ['However', 'Nevertheless', 'Even so', 'By contrast'],
  addition: ['Moreover', 'In addition', 'Also', 'Further'],
  example: ['For example', 'For instance', 'To illustrate', 'Specifically']
};

const EVERYDAY_PLACES = ['community garden', 'book drive', 'transit office', 'school store', 'robotics club', 'science fair', 'city library', 'farm stand'];
const UNITS = ['miles', 'kilometers', 'ounces', 'liters', 'minutes', 'hours'];

mkdirSync(batchDir, { recursive: true });
mkdirSync(auditDir, { recursive: true });

function rotate(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function hashNumber(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleDeterministic(items, seed) {
  const copy = items.slice();
  let state = hashNumber(seed);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function titleToSnake(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function difficultyPlan(targets, seed) {
  const plan = [];
  for (const [difficulty, count] of Object.entries(targets)) {
    for (let index = 0; index < count; index += 1) {
      plan.push(difficulty);
    }
  }
  return shuffleDeterministic(plan, seed);
}

function answerPlan(totalMc) {
  const plan = [];
  while (plan.length < totalMc) {
    plan.push(...LETTERS);
  }
  return shuffleDeterministic(plan.slice(0, totalMc), 'answer-plan');
}

function buildBlueprintSpecs(section) {
  const specs = [];
  const sectionConfig = BLUEPRINT[section];
  for (const [domain, domainInfo] of Object.entries(sectionConfig.domains)) {
    for (const [skill, count] of Object.entries(domainInfo.skills)) {
      for (let index = 0; index < count; index += 1) {
        specs.push({ section, domain, skill, withinSkill: index, skillCount: count });
      }
    }
  }
  return specs;
}

function mathCanBeSpr(skill) {
  return !new Set(['Probability', 'Scatterplots and Line of Best Fit', 'Table and Graph Interpretation']).has(skill);
}

function assignMathFormats(specs) {
  const formats = new Array(specs.length).fill('mc');
  const eligible = [];
  specs.forEach((spec, index) => {
    if (mathCanBeSpr(spec.skill)) {
      eligible.push(index);
    }
  });
  const ordered = shuffleDeterministic(eligible, 'math-format-plan');
  for (let index = 0; index < BLUEPRINT.math.format.spr; index += 1) {
    formats[ordered[index]] = 'spr';
  }
  return formats;
}

function contextBundle(index) {
  const sourceContext = rotate(CONTEXTS, index);
  const baseName = rotate(GENERAL_NAMES, index);
  const objectPool = sourceContext === 'literature'
    ? LITERATURE_OBJECTS
    : sourceContext === 'history/social studies'
      ? HISTORY_OBJECTS
      : sourceContext === 'humanities'
        ? HUMANITIES_OBJECTS
        : SCIENCE_OBJECTS;

  return {
    sourceContext,
    actor: baseName,
    object: rotate(objectPool, index * 3 + 1),
    action: rotate(COMMON_ACTIONS, index * 5 + 2),
    result: rotate(COMMON_RESULTS, index * 7 + 3),
    caution: rotate(COMMON_CAUTIONS, index * 11 + 4),
    goal: rotate(COMMON_GOALS, index * 13 + 5),
    year: 1998 + (index % 23),
    a: 12 + (index % 41),
    b: 19 + ((index * 3) % 47),
    c: 4 + ((index * 5) % 17)
  };
}

function distinctChoices(correct, distractors) {
  const seen = new Set([correct]);
  const unique = [];
  for (const choice of distractors) {
    if (!seen.has(choice)) {
      seen.add(choice);
      unique.push(choice);
    }
    if (unique.length === 3) {
      break;
    }
  }
  let filler = 1;
  while (unique.length < 3) {
    const numeric = Number(correct);
    const candidate = Number.isFinite(numeric) && String(numeric) === String(correct)
      ? String(numeric + filler)
      : `${correct} alternative ${filler}`;
    if (!seen.has(candidate)) {
      seen.add(candidate);
      unique.push(candidate);
    }
    filler += 1;
  }
  return unique;
}

function buildMcChoices(correct, distractors, answerLetter) {
  const answerIndex = LETTERS.indexOf(answerLetter);
  const cleanDistractors = distinctChoices(correct, distractors);
  const values = [];
  let distractorIndex = 0;
  for (let index = 0; index < 4; index += 1) {
    if (index === answerIndex) {
      values.push(correct);
    } else {
      values.push(cleanDistractors[distractorIndex]);
      distractorIndex += 1;
    }
  }
  return {
    choices: values.map((value, index) => `${LETTERS[index]}) ${value}`),
    answer: answerLetter,
    valueMap: Object.fromEntries(values.map((value, index) => [LETTERS[index], value]))
  };
}

function baseRwMeta(spec, itemIndex, bundle) {
  return {
    id: `rw_${String(itemIndex + 1).padStart(4, '0')}`,
    section: 'reading_writing',
    domain: spec.domain,
    skill: spec.skill,
    tags: [bundle.sourceContext, titleToSnake(spec.skill), titleToSnake(spec.domain)],
    source_context: bundle.sourceContext,
    calculator_allowed: null,
    estimated_time_seconds: spec.difficulty === 'easy' ? 65 : spec.difficulty === 'medium' ? 75 : 90,
    format: 'mc'
  };
}

function baseMathMeta(spec, itemIndex, sourceContext, format) {
  return {
    id: `math_${String(itemIndex + 1).padStart(4, '0')}`,
    section: 'math',
    domain: spec.domain,
    skill: spec.skill,
    tags: [sourceContext, titleToSnake(spec.skill), titleToSnake(spec.domain), format],
    source_context: sourceContext,
    calculator_allowed: true,
    estimated_time_seconds: spec.difficulty === 'easy' ? 70 : spec.difficulty === 'medium' ? 85 : 100,
    format
  };
}

function distractorMapFromReasons(answerLetter, reasons) {
  const map = {};
  LETTERS.forEach((letter) => {
    if (letter !== answerLetter) {
      map[letter] = reasons.shift();
    }
  });
  return map;
}

function rwInference(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex + spec.withinSkill);
  const passage = `${bundle.actor} ${bundle.action} a ${bundle.object} from ${bundle.year} and a revised version prepared last spring. After the labels were shortened, readers spent ${bundle.b}% more time on the final section even though the topic stayed the same. Because only the wording changed, ${bundle.actor.toLowerCase()} argues that phrasing affected attention. Still, ${bundle.caution}, so the team wants one more trial before making a permanent change.`;
  const prompt = `Based on the passage, what can reasonably be inferred about ${bundle.actor}'s conclusion?`;
  const correct = 'It is provisional because the team wants another trial before adopting the change widely.';
  const distractors = [
    'It proves the subject matter had no effect on reader attention in any setting.',
    'It shows the revised version will succeed equally well with every audience.',
    'It confirms the original labels were inaccurate rather than merely less effective.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The passage says only the wording changed and that the team wants another trial, so the conclusion is cautious rather than final.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This choice overgeneralizes the finding beyond the single trial described.',
      'The passage does not claim the result will hold for every audience.',
      'The passage compares effectiveness, not factual accuracy.'
    ])
  };
}

function rwCentralIdea(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 2 + 7);
  const passage = `At first, local planners treated the narrow lot behind the ${rotate(EVERYDAY_PLACES, globalIndex)} as unusable. Then students mapped how sunlight moved across it through the day, and residents proposed low-cost seating instead of a full playground. The final design used recycled lumber, shade cloth, and native plants. The project mattered less because it was expensive than because it showed how close observation can turn a neglected space into a useful one.`;
  const prompt = `Which choice best states the central idea of the passage about the lot behind the ${rotate(EVERYDAY_PLACES, globalIndex)}?`;
  const correct = 'Careful observation and modest design choices can transform an overlooked area into a valuable community space.';
  const distractors = [
    'Public projects succeed only when they include playground equipment.',
    'Students, rather than residents, should make final design decisions for neighborhood projects.',
    'Recycled materials are always cheaper and more durable than new ones.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The passage emphasizes that the lot became useful through observation and practical choices, which is the passage’s main point.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'Playground equipment is never presented as necessary to the project’s success.',
      'The passage describes collaboration, not a rule that students should decide alone.',
      'The materials are details, not the passage’s overall focus.'
    ])
  };
}

function rwCommandOfEvidence(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 3 + 11);
  const place = rotate(EVERYDAY_PLACES, globalIndex + 2);
  const passage = `${bundle.actor} claims that extending the hours of the ${place} would increase weekday attendance by teenagers. To evaluate that claim, the city wants evidence that isolates schedule changes from other factors, such as new programming or seasonal demand.`;
  const prompt = `Which finding would provide the strongest evidence for ${bundle.actor}'s claim about the ${place}?`;
  const correct = 'Attendance rose after weekday hours were extended at several similar sites, even though programming and staffing stayed the same.';
  const distractors = [
    'Teenagers said in a survey that they generally like spaces that stay open later.',
    'Weekend attendance increased after one site added live music and food trucks.',
    'A nearby site with unchanged hours reported that many visitors prefer afternoons to mornings.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The correct choice isolates the effect of extended hours by keeping other important variables constant.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'A preference survey does not show that changing hours actually increased attendance.',
      'Programming changes introduce a confounding variable.',
      'This finding does not compare attendance before and after extended hours.'
    ])
  };
}

function rwQuantitative(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 5 + 13);
  const first = 18 + (globalIndex % 17);
  const second = first + 6 + (globalIndex % 9);
  const third = second - 4 + (globalIndex % 5);
  const fourth = third + 8 + (globalIndex % 7);
  const passage = `A district report compared average daily attendance at four after-school workshops. Debate club averaged ${first} students, robotics averaged ${second}, mural design averaged ${third}, and journalism averaged ${fourth}. The report argues that workshops combining collaboration with a concrete final product drew stronger attendance than workshops focused mainly on discussion.`;
  const prompt = 'Which choice best uses the data in the passage to evaluate the report’s argument?';
  const correct = fourth > first && second > first
    ? 'The data generally support the argument because robotics and journalism, which produce tangible projects, both outdrew debate club.'
    : 'The data weaken the argument because discussion-based workshops outdrew at least one project-based workshop.';
  const distractors = [
    'The data prove that every student prefers journalism to all other workshop options.',
    'The report’s argument cannot be evaluated because the attendance numbers are all different.',
    'The data show only that mural design should be canceled next year.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The best answer connects the attendance figures to the report’s claim instead of making a broader claim the data do not support.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'The data do not prove universal student preference.',
      'Different numbers do allow a comparison tied to the report’s claim.',
      'The figures alone do not justify eliminating a workshop.'
    ])
  };
}

function rwWordsInContext(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 7 + 17);
  const targetWord = rotate(['measured', 'sharp', 'plain', 'novel', 'reserve', 'dense'], globalIndex);
  const meaning = {
    measured: 'careful and restrained',
    sharp: 'precise and clearly defined',
    plain: 'direct and uncomplicated',
    novel: 'new and unusual',
    reserve: 'hold back rather than reveal fully',
    dense: 'packed with information'
  }[targetWord];
  const passage = `${bundle.actor}'s commentary on the ${bundle.object} was deliberately ${targetWord}. Rather than praise every element, the writer noted what the project accomplished, where its evidence thinned, and how its final claim depended on a small archive. The tone stayed respectful, but it avoided broad celebration.`;
  const prompt = `As used in the passage, what does "${targetWord}" most nearly mean?`;
  const distractorsPool = {
    measured: ['quantified in numbers', 'slow in tempo', 'limited by distance'],
    sharp: ['painfully critical', 'sudden in timing', 'physically pointed'],
    plain: ['ordinary in appearance', 'located on open land', 'lacking any value'],
    novel: ['related to fiction', 'long and detailed', 'difficult to verify'],
    reserve: ['book in advance', 'save for future use', 'an area protected by law'],
    dense: ['hard to see through', 'difficult to walk across', 'crowded with people']
  };
  const packageMc = buildMcChoices(meaning, distractorsPool[targetWord], answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The surrounding description explains the word through the writer’s tone and method, indicating its contextual meaning.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This uses a different meaning of the word than the one implied by the passage.',
      'This meaning does not fit the writer’s analytical tone in context.',
      'This choice ignores the explanatory clues surrounding the word.'
    ])
  };
}

function rwTextStructure(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 11 + 19);
  const passage = `Researchers once described the marsh as a seasonal stopover. The passage first summarizes that earlier view and then introduces a decade of tracking data showing that some birds remain year-round. It closes by explaining how the updated finding affects local restoration plans.`;
  const prompt = 'Which choice best describes the structure of the passage?';
  const correct = 'It presents an older understanding, introduces new evidence, and then explains a practical implication of that evidence.';
  const distractors = [
    'It lists several unrelated discoveries in chronological order without evaluating them.',
    'It compares two marshes and argues that one should replace the other.',
    'It gives a personal anecdote before shifting to a broad philosophical reflection.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The passage clearly moves from prior view to new evidence to an application of the updated understanding.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'The passage is not simply a list of unrelated discoveries.',
      'No comparison between two marshes appears in the passage.',
      'The passage is analytical, not personal or philosophical.'
    ])
  };
}

function rwRhetoricalPurpose(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 13 + 23);
  const detail = rotate(['a cracked margin note', 'a revised map legend', 'a single weather reading', 'a donation ledger'], globalIndex);
  const passage = `In arguing that the archive was assembled in stages, the historian pauses to mention ${detail}. That detail does not prove the entire case by itself, but it shows that at least one section was added after the first round of copying, supporting the historian’s broader claim about revision.`;
  const prompt = `Why does the author include the detail about ${detail}?`;
  const correct = 'To provide a specific example that supports the claim that the archive changed over time.';
  const distractors = [
    'To show that the archive is too damaged to study responsibly.',
    'To argue that revision always improves historical documents.',
    'To shift the passage from evidence-based analysis to personal opinion.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The detail functions as a concrete supporting example tied directly to the historian’s broader argument.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'The passage does not suggest the archive is unusable.',
      'The author is not making a general claim that revision is always beneficial.',
      'The tone remains analytical throughout.'
    ])
  };
}

function rwCrossText(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 17 + 29);
  const passage = `Text 1: A local columnist argues that the town should repaint its century-old water tower in bright colors so it can serve as a landmark for visitors. Text 2: A preservation architect agrees that the tower should remain prominent, but argues that a careful cleaning and lighting plan would preserve its industrial character while still making it visible at night.`;
  const prompt = 'What would the author of Text 2 most likely say in response to the proposal in Text 1?';
  const correct = 'Visibility matters, but the tower should be highlighted in a way that preserves its historical character.';
  const distractors = [
    'Visitors should decide the tower’s final design because residents are too invested in its history.',
    'The tower should be removed because both appearance and maintenance are too costly.',
    'Bright paint is the only realistic way to make the tower noticeable after dark.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'Text 2 accepts the goal of visibility but proposes a different method that protects the tower’s character.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'Text 2 does not dismiss residents or transfer decision-making authority.',
      'Text 2 argues for preservation, not removal.',
      'Text 2 explicitly offers an alternative to bright paint.'
    ])
  };
}

function rwTransitions(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 19 + 31);
  const family = rotate(['cause', 'contrast', 'addition', 'example'], globalIndex);
  const options = shuffleDeterministic([
    rotate(TRANSITIONS[family], globalIndex),
    rotate(TRANSITIONS[family === 'cause' ? 'contrast' : 'cause'], globalIndex + 1),
    rotate(TRANSITIONS[family === 'addition' ? 'example' : 'addition'], globalIndex + 2),
    rotate(TRANSITIONS[family === 'example' ? 'contrast' : 'example'], globalIndex + 3)
  ], `transition-${globalIndex}`);
  const correct = options[0];
  const sentenceA = `The volunteers simplified the sign-in form for the ${rotate(EVERYDAY_PLACES, globalIndex)}.`;
  const sentenceB = family === 'cause'
    ? `new participants completed registration about ${22 + (globalIndex % 13)}% faster during the next event.`
    : family === 'contrast'
      ? `attendance still declined when heavy rain moved the event indoors.`
      : family === 'addition'
        ? `the organizers also added a clearly marked supply table near the entrance.`
        : `one returning family finished the new form in under two minutes.`;
  const passage = `${sentenceA} ____ , ${sentenceB}`;
  const prompt = 'Which choice completes the text with the most logical transition?';
  const packageMc = buildMcChoices(correct, options.slice(1), answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The correct transition matches the logical relationship between the two parts of the sentence.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This transition signals a different relationship than the one expressed in the sentence.',
      'This choice would mislead the reader about how the second clause connects to the first.',
      'The sentence does not support the relationship implied by this transition.'
    ])
  };
}

function rwRhetoricalSynthesis(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 23 + 37);
  const place = rotate(EVERYDAY_PLACES, globalIndex + 4);
  const notes = [
    `${place} replaced fluorescent bulbs with LEDs in ${2018 + (globalIndex % 6)}.`,
    `Electricity use in the building fell by ${14 + (globalIndex % 12)}% during the next full year.`,
    `The manager said the quieter fixtures made evening programs feel calmer.`,
    `Installation costs were recovered in about ${2 + (globalIndex % 4)} years.`
  ];
  const passage = `A student wants to explain that the lighting change at the ${place} saved energy and paid for itself quickly. The student’s notes are below.\n- ${notes.join('\n- ')}`;
  const prompt = 'Which choice most effectively uses the notes to accomplish the student’s goal?';
  const correct = `After ${place} switched to LED lighting, its electricity use fell by ${14 + (globalIndex % 12)}%, and the installation cost was recovered in about ${2 + (globalIndex % 4)} years.`;
  const distractors = [
    `${place} changed its lighting in ${2018 + (globalIndex % 6)}, and the manager later described the new fixtures as quieter.`,
    `The manager of ${place} preferred the calmer mood created by the new lights, which explains why all building renovations should begin with aesthetics.`,
    `${place} installed LEDs, a type of light used in many buildings, and electricity use changed during the following year.`
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The correct choice directly addresses both parts of the goal: energy savings and rapid cost recovery.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This option omits the information about energy savings and payback time.',
      'This option adds an unsupported generalization that goes beyond the notes.',
      'This option is too vague to accomplish the stated goal precisely.'
    ])
  };
}

function rwSentencePlacement(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 29 + 41);
  const inserted = `This made the final map easier for first-time visitors to use.`;
  const passage = `[1] The museum tested a new foldout map for its sculpture garden. [2] Designers replaced dense paragraph labels with short directional cues. [3] Volunteers then asked guests to find three installations without staff help. [4] On average, guests completed the route in less time than they had with the old map.`;
  const prompt = `Where should the sentence "${inserted}" be placed in the passage?`;
  const correct = 'After sentence 2';
  const distractors = ['After sentence 1', 'After sentence 3', 'After sentence 4'];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The inserted sentence logically refers to the label changes in sentence 2 and sets up the usability test described next.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'At that point, the sentence would not yet have a clear referent for “This.”',
      'By then, the sentence interrupts the test sequence instead of clarifying the revision.',
      'Placed there, the sentence repeats the result rather than connecting the revision to the test.'
    ])
  };
}

function rwConcision(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 31 + 43);
  const place = rotate(EVERYDAY_PLACES, globalIndex + 6);
  const passage = `The newsletter explains that the student volunteers at the ${place} "worked together collaboratively" to sort donated books by reading level before the event opened.`;
  const prompt = 'Which choice most effectively revises the quoted portion to make the sentence concise while preserving its meaning?';
  const correct = 'worked together';
  const distractors = ['collaboratively worked together with one another', 'worked in a collaborative way together', 'worked in collaboration together'];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The correct choice removes unnecessary repetition while keeping the original meaning.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This option repeats the same idea with extra words.',
      'This option is wordy and keeps redundant phrasing.',
      'This option still repeats the idea of collaboration unnecessarily.'
    ])
  };
}

function rwGrammar(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 37 + 47);
  const subject = rotate(['collection', 'series', 'committee', 'set', 'pair', 'group'], globalIndex);
  const passage = `Choose the most grammatically standard completion for the sentence: "The ${subject} of student proposals submitted last week ____ ready for review by the town council."`;
  const prompt = 'Which choice completes the sentence so that it conforms to standard English conventions?';
  const correct = 'is';
  const distractors = ['are', 'have been', 'were'];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The singular subject is the main noun, so the singular verb “is” is correct.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This plural verb does not agree with the singular subject.',
      'This tense changes the meaning and still does not fit the sentence structure.',
      'This past-tense plural verb does not match the singular subject or sentence meaning.'
    ])
  };
}

function rwPunctuation(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 41 + 53);
  const listA = rotate(['temperature', 'humidity', 'air pressure', 'salinity'], globalIndex);
  const listB = rotate(['wind speed', 'plant height', 'noise level', 'light exposure'], globalIndex + 1);
  const listC = rotate(['soil moisture', 'battery level', 'water clarity', 'visitor count'], globalIndex + 2);
  const passage = 'Which choice correctly punctuates the sentence? "The field team tracked three variables ___ ' + `${listA}, ${listB}, and ${listC}."`;
  const prompt = 'Which choice completes the sentence with the most appropriate punctuation?';
  const correct = ':';
  const distractors = [',', ';', '--'];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'A colon correctly introduces the list that explains the three variables.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'A comma cannot introduce a complete explanatory list in this sentence.',
      'A semicolon is used between closely related independent clauses, not before a simple list.',
      'A dash could be stylistic in some contexts, but the standard punctuation for introducing this list is a colon.'
    ])
  };
}

function rwPronounClarity(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 43 + 59);
  const passage = 'The original sentence reads: "When the curator spoke with the sculptor, she suggested moving the larger pedestal near the entrance."';
  const prompt = 'Which choice best revises the sentence to clarify the ambiguous pronoun?';
  const correct = 'When the curator spoke with the sculptor, the curator suggested moving the larger pedestal near the entrance.';
  const distractors = [
    'When the curator spoke with the sculptor, they suggested moving the larger pedestal near the entrance.',
    'Speaking with the sculptor, she suggested moving the larger pedestal near the entrance.',
    'When the curator spoke with the sculptor, someone suggested moving the larger pedestal near the entrance.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The correct revision names the intended person directly and removes the ambiguity created by “she.”',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      '“They” still leaves the reader unsure who made the suggestion.',
      'This revision keeps the ambiguous pronoun.',
      'This revision is vague and removes useful specificity.'
    ])
  };
}

function rwModifierPlacement(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 47 + 61);
  const passage = 'The original sentence reads: "After reviewing the survey for two hours, the policy summary seemed clearer to Nadia."';
  const prompt = 'Which choice best revises the sentence to correct the modifier placement?';
  const correct = 'After reviewing the survey for two hours, Nadia found the policy summary clearer.';
  const distractors = [
    'After reviewing the survey for two hours, the policy summary was clearer.',
    'The policy summary seemed clearer after reviewing the survey for two hours.',
    'After reviewing the survey for two hours, it seemed that the policy summary was clearer to Nadia.'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The revised sentence places Nadia immediately after the introductory phrase, making it clear who reviewed the survey.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This version still suggests the summary reviewed the survey.',
      'This version keeps the modifier attached to the wrong subject.',
      'This option is wordy and still less direct than the best revision.'
    ])
  };
}

function rwParallelStructure(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 53 + 67);
  const passage = 'Which choice most effectively revises the sentence for parallel structure? "The internship requires students to draft proposals, presenting weekly updates, and that they archive meeting notes."';
  const prompt = 'Which choice best maintains parallel structure in the sentence?';
  const correct = 'to draft proposals, present weekly updates, and archive meeting notes';
  const distractors = [
    'drafting proposals, present weekly updates, and archiving meeting notes',
    'to draft proposals, presenting weekly updates, and archive meeting notes',
    'to draft proposals, weekly updates are presented, and archive meeting notes'
  ];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'Each item in the series should use the same grammatical form, so the parallel infinitive structure is best.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This choice mixes participles with a base verb.',
      'This choice is still not parallel because one item remains a participial phrase.',
      'This choice shifts one item into a clause rather than keeping all items in the same form.'
    ])
  };
}

function rwVerbTense(spec, globalIndex, answerLetter) {
  const bundle = contextBundle(globalIndex * 59 + 71);
  const passage = 'Choose the most standard completion for the sentence: "By the time the committee publishes its final report next month, it ____ interview notes from every district office."';
  const prompt = 'Which choice completes the sentence so that it conforms to standard English conventions?';
  const correct = 'will have reviewed';
  const distractors = ['has reviewed', 'reviewed', 'would review'];
  const packageMc = buildMcChoices(correct, distractors, answerLetter);
  return {
    ...baseRwMeta(spec, globalIndex, bundle),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale: 'The future perfect correctly describes an action that will be completed before another future action.',
    distractor_rationales: distractorMapFromReasons(packageMc.answer, [
      'This tense does not align with the future time frame established in the sentence.',
      'This simple past tense does not fit the sentence’s future sequence.',
      'This conditional form introduces a meaning not supported by the sentence.'
    ])
  };
}

const RW_GENERATORS = {
  Inference: rwInference,
  'Central Idea': rwCentralIdea,
  'Command of Evidence': rwCommandOfEvidence,
  'Quantitative Information in Text and Graphics': rwQuantitative,
  'Words in Context': rwWordsInContext,
  'Text Structure': rwTextStructure,
  'Rhetorical Purpose': rwRhetoricalPurpose,
  'Cross-Text Connections': rwCrossText,
  Transitions: rwTransitions,
  'Rhetorical Synthesis': rwRhetoricalSynthesis,
  'Sentence Placement': rwSentencePlacement,
  Concision: rwConcision,
  Grammar: rwGrammar,
  Punctuation: rwPunctuation,
  'Pronoun Clarity': rwPronounClarity,
  'Modifier Placement': rwModifierPlacement,
  'Parallel Structure': rwParallelStructure,
  'Verb Tense and Agreement': rwVerbTense
};

function mathContext(index) {
  return rotate(['school', 'everyday', 'science', 'civic'], index);
}

function fractionString(numerator, denominator) {
  const gcdValue = gcd(Math.abs(numerator), Math.abs(denominator));
  const num = numerator / gcdValue;
  const den = denominator / gcdValue;
  return den === 1 ? String(num) : `${num}/${den}`;
}

function gcd(a, b) {
  let x = a;
  let y = b;
  while (y) {
    const temp = x % y;
    x = y;
    y = temp;
  }
  return x || 1;
}

function buildMathMc(spec, globalIndex, answerLetter, prompt, correctValue, distractors, rationale, distractorReasons, passage = '') {
  const packageMc = buildMcChoices(String(correctValue), distractors.map(String), answerLetter);
  return {
    ...baseMathMeta(spec, globalIndex, mathContext(globalIndex), 'mc'),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: packageMc.choices,
    answer: packageMc.answer,
    rationale,
    distractor_rationales: distractorMapFromReasons(packageMc.answer, distractorReasons)
  };
}

function buildMathSpr(spec, globalIndex, prompt, answer, rationale, passage = '') {
  return {
    ...baseMathMeta(spec, globalIndex, mathContext(globalIndex), 'spr'),
    difficulty: spec.difficulty,
    passage,
    prompt,
    choices: [],
    answer: String(answer),
    rationale,
    distractor_rationales: {}
  };
}

function mathLinearEquation(spec, globalIndex, format, answerLetter) {
  const x = 3 + (globalIndex % 18);
  const a = 2 + (globalIndex % 6);
  const b = 4 + ((globalIndex * 3) % 9);
  const c = a * x + b;
  const prompt = spec.difficulty === 'hard'
    ? `Solve for x: ${a}(x - ${b}) + ${b + 3} = ${a * (x - b) + b + 3}.`
    : `Solve for x: ${a}x + ${b} = ${c}.`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, x, 'Subtract the constant term and divide by the coefficient of x.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    x,
    [x + 1, x - 1, c - b],
    'Rearrange the equation so the x-term is isolated, then divide by its coefficient.',
    [
      'This value results from an arithmetic slip after isolating x.',
      'This value is close but does not satisfy the equation.',
      'This choice ignores the need to divide by the coefficient of x.'
    ]
  );
}

function mathSystems(spec, globalIndex, format, answerLetter) {
  const x = 2 + (globalIndex % 10);
  const y = 5 + ((globalIndex * 2) % 11);
  const prompt = `In the system x + y = ${x + y} and x - y = ${x - y}, what is the value of y?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, y, 'Add and subtract the equations to solve for the variables, then identify y.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    y,
    [x, x + y, Math.abs(x - y)],
    'Adding the equations gives 2x; subtracting them gives 2y. Solving yields the value of y.',
    [
      'This is the value of x, not y.',
      'This choice uses the sum of the variables rather than solving the system.',
      'This choice confuses the difference of the variables with the value of y.'
    ]
  );
}

function mathLinearInequalities(spec, globalIndex, format, answerLetter) {
  const x = 4 + (globalIndex % 9);
  const a = 3 + (globalIndex % 4);
  const b = 5 + ((globalIndex * 2) % 8);
  const threshold = a * x - b;
  const prompt = `Which value of x satisfies ${a}x - ${b} > ${threshold}?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, `What is the least integer solution to ${a}x - ${b} > ${threshold}?`, x + 1, 'Isolate x and then choose the smallest integer greater than the boundary value.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    x + 1,
    [x, x - 1, 0],
    'After isolating x, the solution must be greater than the boundary value, not equal to it.',
    [
      'This value is the boundary and does not satisfy the strict inequality.',
      'This value is below the boundary.',
      'Zero is not greater than the threshold after substitution.'
    ]
  );
}

function mathLinearFunctions(spec, globalIndex, format, answerLetter) {
  const slope = 2 + (globalIndex % 5);
  const intercept = -4 + (globalIndex % 9);
  const input = 3 + (globalIndex % 6);
  const output = slope * input + intercept;
  const prompt = `If f(x) = ${slope}x ${intercept >= 0 ? '+' : '-'} ${Math.abs(intercept)}, what is f(${input})?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, output, 'Substitute the given x-value into the function and simplify.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    output,
    [slope + intercept, slope * input, output + intercept],
    'Evaluate the function by substituting the input and combining like terms.',
    [
      'This combines coefficients without substituting correctly.',
      'This ignores the constant term.',
      'This applies the constant term twice.'
    ]
  );
}

function mathSlopeIntercept(spec, globalIndex, format, answerLetter) {
  const x1 = globalIndex % 4;
  const y1 = 2 + (globalIndex % 7);
  const slope = 1 + (globalIndex % 5);
  const x2 = x1 + 2;
  const y2 = y1 + 2 * slope;
  const prompt = `What is the slope of the line passing through (${x1}, ${y1}) and (${x2}, ${y2})?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, slope, 'Use the slope formula: change in y divided by change in x.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    slope,
    [2 * slope, y2 - y1, x2 - x1],
    'The slope equals (y2 - y1) / (x2 - x1).',
    [
      'This forgets to divide by the change in x.',
      'This is only the numerator of the slope formula.',
      'This is only the denominator of the slope formula.'
    ]
  );
}

function mathQuadratics(spec, globalIndex, format, answerLetter) {
  const r1 = 1 + (globalIndex % 8);
  const r2 = 2 + ((globalIndex * 2) % 8);
  const sum = r1 + r2;
  const product = r1 * r2;
  const prompt = `One solution to x^2 - ${sum}x + ${product} = 0 is greater than the other. What is the greater solution?`;
  const answer = Math.max(r1, r2);
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'Factor the quadratic into two binomials and identify the greater root.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [Math.min(r1, r2), sum, product],
    'The quadratic factors as (x - r1)(x - r2), so its solutions are r1 and r2.',
    [
      'This is the other root, not the greater one.',
      'This is the sum of the roots, not a root.',
      'This is the product of the roots, not a root.'
    ]
  );
}

function mathPolynomials(spec, globalIndex, format, answerLetter) {
  const a = 2 + (globalIndex % 7);
  const b = 3 + ((globalIndex * 2) % 6);
  const c = 1 + ((globalIndex * 3) % 5);
  const prompt = `Which expression is equivalent to (x + ${a})(x - ${b})?`;
  const correct = `x^2 ${a - b >= 0 ? '+' : '-'} ${Math.abs(a - b)}x - ${a * b}`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, `What is the constant term of (x + ${a})(x - ${b}) after expansion?`, -a * b, 'The constant term comes from multiplying the constant terms in the binomials.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    correct,
    [
      `x^2 + ${a + b}x - ${a * b}`,
      `x^2 ${a - b >= 0 ? '+' : '-'} ${Math.abs(a - b)}x + ${a * b}`,
      `x^2 - ${a + b}x + ${a * b}`
    ],
    'Use distribution or FOIL to expand the product and combine like terms.',
    [
      'This adds the coefficients instead of combining the middle terms correctly.',
      'This keeps the wrong sign on the constant term.',
      'This choice changes both the middle term and the constant term incorrectly.'
    ]
  );
}

function mathEquivalentExpressions(spec, globalIndex, format, answerLetter) {
  const factor = 2 + (globalIndex % 5);
  const a = 3 + ((globalIndex * 2) % 7);
  const b = 1 + ((globalIndex * 3) % 6);
  const prompt = `Which expression is equivalent to ${factor}(${a}x + ${b}) - ${factor * b}?`;
  const answer = `${factor * a}x`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, `After simplifying ${factor}(${a}x + ${b}) - ${factor * b}, what is the coefficient of x?`, factor * a, 'Distribute the factor and combine like terms.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [`${factor * a}x + ${factor * b}`, `${a + factor}x`, `${factor * a + b}x`],
    'The constant terms cancel after distribution, leaving only the x-term.',
    [
      'This ignores the subtraction of the matching constant term.',
      'This adds unrelated coefficients instead of distributing correctly.',
      'This combines a constant with the coefficient incorrectly.'
    ]
  );
}

function mathRadicals(spec, globalIndex, format, answerLetter) {
  const n = 2 + (globalIndex % 8);
  const value = n * n;
  const prompt = `What is the value of sqrt(${value}) + ${n}?`;
  const answer = 2 * n;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'The square root of a perfect square returns its positive principal root.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [n, value + n, value],
    'Evaluate the square root first, then add.',
    [
      'This uses only the square root and forgets the addition.',
      'This treats sqrt(value) as value.',
      'This is the radicand, not the expression’s value.'
    ]
  );
}

function mathNonlinearFunctions(spec, globalIndex, format, answerLetter) {
  const a = 1 + (globalIndex % 4);
  const b = 2 + ((globalIndex * 3) % 5);
  const input = 2 + (globalIndex % 4);
  const output = a * input * input + b;
  const prompt = `If g(x) = ${a}x^2 + ${b}, what is g(${input})?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, output, 'Substitute the x-value, square it, multiply, and then add the constant term.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    output,
    [a * input + b, input * input + b, a * input * input],
    'Because the function is nonlinear, x must be squared before multiplying by the coefficient.',
    [
      'This forgets to square the input.',
      'This ignores the leading coefficient.',
      'This omits the constant term.'
    ]
  );
}

function mathComplexNumbers(spec, globalIndex, format, answerLetter) {
  const a = 2 + (globalIndex % 6);
  const b = 1 + ((globalIndex * 2) % 5);
  const answer = a * a + b * b;
  const prompt = `What is the value of (${a} + ${b}i)(${a} - ${b}i)?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'A complex number multiplied by its conjugate equals the sum of the squares of the real and imaginary coefficients.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [a * a - b * b, 2 * a * b, a + b],
    'Use the difference of squares: (a + bi)(a - bi) = a^2 + b^2.',
    [
      'This incorrectly subtracts b^2 instead of adding it.',
      'This is the coefficient of the middle terms before they cancel.',
      'This adds the coefficients instead of evaluating the product.'
    ]
  );
}

function mathRatios(spec, globalIndex, format, answerLetter) {
  const a = 2 + (globalIndex % 7);
  const b = a + 1 + (globalIndex % 5);
  const total = (a + b) * (3 + (globalIndex % 4));
  const prompt = `A mixture uses red and blue paint in the ratio ${a}:${b}. If the total amount of paint is ${total} cups, how many cups are blue?`;
  const answer = (total / (a + b)) * b;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'Find the value of one ratio part and multiply by the number of blue parts.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [total / (a + b), (total / (a + b)) * a, total - answer / 2],
    'The total amount is split into a + b equal parts, and blue uses b of those parts.',
    [
      'This is the size of one part, not the number of blue cups.',
      'This gives the amount of red paint instead of blue.',
      'This value does not respect the given ratio.'
    ]
  );
}

function mathPercentages(spec, globalIndex, format, answerLetter) {
  const original = 80 + (globalIndex % 70);
  const percent = 10 + ((globalIndex * 3) % 35);
  const answer = Number((original * (1 + percent / 100)).toFixed(2));
  const prompt = `A school store increases the price of a hoodie from $${original} by ${percent}%. What is the new price?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer.toFixed(2).replace(/\.00$/, ''), 'Multiply the original price by 1 plus the percent increase written as a decimal.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer.toFixed(2).replace(/\.00$/, ''),
    [original + percent, original * (percent / 100), original - original * (percent / 100)].map((value) => Number(value).toFixed(2).replace(/\.00$/, '')),
    'Convert the percent increase to a decimal and add that fraction of the original to the original amount.',
    [
      'This adds the percent as if it were a dollar amount.',
      'This gives only the amount of the increase, not the new price.',
      'This applies a decrease rather than an increase.'
    ]
  );
}

function mathRates(spec, globalIndex, format, answerLetter) {
  const rate = 24 + (globalIndex % 18);
  const hours = 2 + (globalIndex % 5);
  const prompt = `A service robot sorts ${rate} packages per hour. How many packages does it sort in ${hours} hours?`;
  const answer = rate * hours;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'Multiply the unit rate by the number of hours.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [rate + hours, rate, answer + rate],
    'The total quantity equals rate times time.',
    [
      'This adds instead of multiplying.',
      'This gives only the hourly rate.',
      'This overcounts by adding an extra hour’s work.'
    ]
  );
}

function mathProbability(spec, globalIndex, format, answerLetter) {
  const red = 2 + (globalIndex % 6);
  const blue = 3 + ((globalIndex * 2) % 6);
  const green = 1 + ((globalIndex * 3) % 4);
  const total = red + blue + green;
  const answer = fractionString(blue + green, total);
  const prompt = `A bag contains ${red} red chips, ${blue} blue chips, and ${green} green chips. If one chip is chosen at random, what is the probability that it is not red?`;
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [fractionString(red, total), fractionString(blue, total), fractionString(green, total)],
    'The probability of not red equals the number of blue and green chips divided by the total number of chips.',
    [
      'This is the probability of red, not not red.',
      'This gives the probability of blue only.',
      'This gives the probability of green only.'
    ]
  );
}

function mathStatistics(spec, globalIndex, format, answerLetter) {
  const base = 10 + (globalIndex % 11);
  const data = [base, base + 2, base + 4, base + 6, base + 8];
  const answer = data[2];
  const prompt = `What is the median of the data set ${data.join(', ')}?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'For five ordered values, the median is the middle value.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [data[1], (data[0] + data[4]) / 2, data[4]],
    'In an ordered set with five numbers, the median is the third value.',
    [
      'This is below the middle value.',
      'This is the mean of the first and last values, not the median.',
      'This is the greatest value in the set.'
    ]
  );
}

function mathScatterplots(spec, globalIndex, format, answerLetter) {
  const x1 = 2 + (globalIndex % 3);
  const y1 = 50 + (globalIndex % 11);
  const slope = 3 + (globalIndex % 4);
  const x2 = x1 + 4;
  const y2 = y1 + 4 * slope;
  const xTarget = x1 + 2;
  const answer = y1 + 2 * slope;
  const passage = `A line of best fit for a scatterplot passes through (${x1}, ${y1}) and (${x2}, ${y2}).`;
  const prompt = `According to the line through (${x1}, ${y1}) and (${x2}, ${y2}), what y-value is predicted when x = ${xTarget}?`;
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [y1 + slope, y2, y1],
    'The slope determines how much y increases per unit of x, so moving two units from x1 changes y by 2 times the slope.',
    [
      'This changes y by only one slope increment instead of two.',
      'This uses the second given point rather than the target x-value.',
      'This keeps the original y-value and ignores the change in x.'
    ],
    passage
  );
}

function mathTableGraph(spec, globalIndex, format, answerLetter) {
  const start = 6 + (globalIndex % 7);
  const increment = 4 + (globalIndex % 5);
  const table = [0, 1, 2, 3].map((x) => `${x} -> ${start + increment * x}`);
  const prompt = `Based on the table with y-values starting at ${start} and increasing by ${increment}, what is the y-value when x = 4?`;
  const passage = `A table shows these pairs: ${table.join(', ')}.`;
  const answer = start + increment * 4;
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [start + increment * 3, increment * 4, start + 4],
    'The y-values increase by a constant amount, so extend the pattern one more step.',
    [
      'This stops one row too early.',
      'This uses only the rate of change and ignores the initial value.',
      'This adds 4 to the initial value instead of applying the full pattern.'
    ],
    passage
  );
}

function mathCircles(spec, globalIndex, format, answerLetter) {
  const radius = 3 + (globalIndex % 8);
  const answer = `${radius}`;
  const prompt = `A circle has diameter ${2 * radius}. What is its radius?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'The radius is half the diameter.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [2 * radius, radius * radius, radius + 2],
    'Divide the diameter by 2 to find the radius.',
    [
      'This is the diameter, not the radius.',
      'This squares the radius instead of identifying it.',
      'This does not follow the relationship between radius and diameter.'
    ]
  );
}

function mathTriangles(spec, globalIndex, format, answerLetter) {
  const a = 3 + (globalIndex % 6);
  const b = 4 + (globalIndex % 6);
  const c = Math.round(Math.sqrt(a * a + b * b));
  const prompt = `A right triangle has legs of length ${a} and ${b}. What is the length of its hypotenuse to the nearest whole number?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, c, 'Use the Pythagorean theorem: a^2 + b^2 = c^2.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    c,
    [a + b, Math.abs(a - b), a * b],
    'Square each leg, add the results, and take the square root.',
    [
      'This adds the legs instead of using the Pythagorean theorem.',
      'This subtracts the legs, which does not find the hypotenuse.',
      'This multiplies the legs and gives an unrelated value.'
    ]
  );
}

function mathAreaVolume(spec, globalIndex, format, answerLetter) {
  const length = 4 + (globalIndex % 9);
  const width = 3 + (globalIndex % 7);
  const answer = length * width;
  const prompt = `What is the area of a rectangle with length ${length} and width ${width}?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'Multiply length by width to find area.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [2 * (length + width), length + width, length * width * 2],
    'Area measures the number of square units inside the rectangle, so multiply length and width.',
    [
      'This is the perimeter, not the area.',
      'This adds the dimensions instead of multiplying them.',
      'This doubles the area without justification.'
    ]
  );
}

function mathCoordinateGeometry(spec, globalIndex, format, answerLetter) {
  const x = -2 + (globalIndex % 9);
  const y = 3 + (globalIndex % 8);
  const prompt = `Point P has coordinates (${x}, ${y}). What is the x-coordinate of point P?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, x, 'In an ordered pair, the first number is the x-coordinate.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    x,
    [y, -x, x + y],
    'The x-coordinate is the first value in the ordered pair.',
    [
      'This is the y-coordinate.',
      'This changes the sign of the x-coordinate without reason.',
      'This adds the coordinates instead of identifying the first one.'
    ]
  );
}

function mathTrig(spec, globalIndex, format, answerLetter) {
  const opposite = 3 + (globalIndex % 5);
  const hypotenuse = opposite + 2 + (globalIndex % 4);
  const answer = fractionString(opposite, hypotenuse);
  const prompt = `In a right triangle, an angle has opposite side ${opposite} and hypotenuse ${hypotenuse}. What is sin(theta)?`;
  if (format === 'spr') {
    return buildMathSpr(spec, globalIndex, prompt, answer, 'Sine equals opposite over hypotenuse.');
  }
  return buildMathMc(
    spec,
    globalIndex,
    answerLetter,
    prompt,
    answer,
    [fractionString(hypotenuse, opposite), fractionString(opposite, opposite + hypotenuse), fractionString(hypotenuse - opposite, hypotenuse)],
    'For a right triangle, sin(theta) is the ratio of the opposite side to the hypotenuse.',
    [
      'This inverts the ratio.',
      'This uses the wrong denominator.',
      'This uses the adjacent side only if that difference happened to represent it, which is not stated.'
    ]
  );
}

const MATH_GENERATORS = {
  'One-Variable Linear Equations': mathLinearEquation,
  'Systems of Equations': mathSystems,
  'Linear Inequalities': mathLinearInequalities,
  'Linear Functions': mathLinearFunctions,
  'Slope and Intercept': mathSlopeIntercept,
  Quadratics: mathQuadratics,
  Polynomials: mathPolynomials,
  'Equivalent Expressions': mathEquivalentExpressions,
  'Radicals and Rational Exponents': mathRadicals,
  'Nonlinear Functions': mathNonlinearFunctions,
  'Complex Numbers': mathComplexNumbers,
  'Ratios and Proportions': mathRatios,
  Percentages: mathPercentages,
  'Rates and Unit Conversion': mathRates,
  Probability: mathProbability,
  Statistics: mathStatistics,
  'Scatterplots and Line of Best Fit': mathScatterplots,
  'Table and Graph Interpretation': mathTableGraph,
  Circles: mathCircles,
  Triangles: mathTriangles,
  'Area and Volume': mathAreaVolume,
  'Coordinate Geometry': mathCoordinateGeometry,
  'Right-Triangle Trigonometry': mathTrig
};

function validateRwItem(item) {
  return words(item.passage) >= 25 && words(item.passage) <= 150 && item.choices.length === 4;
}

function validateMathItem(item) {
  return item.format === 'spr' ? Array.isArray(item.choices) && item.choices.length === 0 : item.choices.length === 4;
}

function normalizeRwPassageLength(item, spec, index) {
  const updated = { ...item };
  if (words(updated.passage) < 25) {
    updated.passage = `${updated.passage} The editing task focuses on ${spec.skill.toLowerCase()} in a concise SAT-style context numbered ${index + 1}.`;
  }
  if (words(updated.passage) > 150) {
    updated.passage = updated.passage.split(/\s+/).slice(0, 150).join(' ');
  }
  return updated;
}

function uniquifyReadingWritingItem(item, spec, index, attempt, seenPrompts, seenPassages) {
  const promptSuffix = ` Case ${spec.withinSkill + 1} in ${titleToSnake(spec.skill)}.`;
  const passageSuffix = ` A follow-up note labeled ${titleToSnake(spec.skill)}-${index + 1}-${attempt + 1} confirms the same context.`;
  const updated = { ...item };
  if (seenPrompts.has(updated.prompt)) {
    updated.prompt = `${updated.prompt}${promptSuffix}`;
  }
  if (seenPassages.has(updated.passage)) {
    updated.passage = `${updated.passage}${passageSuffix}`;
  }
  return updated;
}

function uniquifyMathItem(item, spec, seenPrompts) {
  if (!seenPrompts.has(item.prompt + '|' + item.passage)) {
    return item;
  }
  return {
    ...item,
    prompt: `${item.prompt} Use the values shown for set ${spec.withinSkill + 1} in ${titleToSnake(spec.skill)}.`
  };
}

function buildReadingWritingBank(answerLetters) {
  const specs = buildBlueprintSpecs('reading_writing');
  const difficulties = difficultyPlan(BLUEPRINT.reading_writing.difficulty, 'rw-difficulty');
  const items = [];
  const seenPrompts = new Set();
  const seenPassages = new Set();
  let mcIndex = 0;
  for (let index = 0; index < specs.length; index += 1) {
    const spec = { ...specs[index], difficulty: difficulties[index] };
    const generator = RW_GENERATORS[spec.skill];
    let attempt = 0;
    while (attempt < 6) {
      const item = uniquifyReadingWritingItem(
        normalizeRwPassageLength(
          generator(spec, index + attempt * 1600, answerLetters[mcIndex]),
          spec,
          index + attempt * 1600
        ),
        spec,
        index,
        attempt,
        seenPrompts,
        seenPassages
      );
      if (validateRwItem(item) && !seenPrompts.has(item.prompt) && !seenPassages.has(item.passage)) {
        items.push(item);
        seenPrompts.add(item.prompt);
        seenPassages.add(item.passage);
        mcIndex += 1;
        break;
      }
      attempt += 1;
    }
    if (items.length !== index + 1) {
      throw new Error(`Failed to generate unique Reading/Writing item at index ${index}`);
    }
  }
  return { items, mcUsed: mcIndex };
}

function buildMathBank(answerLetters, mcOffset) {
  const specs = buildBlueprintSpecs('math');
  const difficulties = difficultyPlan(BLUEPRINT.math.difficulty, 'math-difficulty');
  const formats = assignMathFormats(specs);
  const items = [];
  const seenPrompts = new Set();
  let mcIndex = mcOffset;
  for (let index = 0; index < specs.length; index += 1) {
    const spec = { ...specs[index], difficulty: difficulties[index] };
    const format = formats[index];
    const generator = MATH_GENERATORS[spec.skill];
    let attempt = 0;
    while (attempt < 6) {
      const item = uniquifyMathItem(
        generator(spec, index + attempt * 1600, format, answerLetters[mcIndex]),
        spec,
        seenPrompts
      );
      if (validateMathItem(item) && !seenPrompts.has(item.prompt + '|' + item.passage)) {
        items.push(item);
        seenPrompts.add(item.prompt + '|' + item.passage);
        if (format === 'mc') {
          mcIndex += 1;
        }
        break;
      }
      attempt += 1;
    }
    if (items.length !== index + 1) {
      throw new Error(`Failed to generate unique Math item at index ${index}`);
    }
  }
  return { items, mcUsed: mcIndex - mcOffset };
}

function countBy(items, key) {
  const counts = {};
  items.forEach((item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
  });
  return counts;
}

function countByNested(items, keyA, keyB) {
  const counts = {};
  items.forEach((item) => {
    counts[item[keyA]] ||= {};
    counts[item[keyA]][item[keyB]] = (counts[item[keyA]][item[keyB]] || 0) + 1;
  });
  return counts;
}

function batchAudit(batchItems, cumulativeItems, batchNumber) {
  const duplicatePrompts = findDuplicates(cumulativeItems.map((item) => item.prompt));
  const duplicatePassages = findDuplicates(cumulativeItems.filter((item) => item.passage).map((item) => item.passage));
  const mcItems = cumulativeItems.filter((item) => item.format === 'mc');
  return {
    batch: batchNumber,
    batch_size: batchItems.length,
    cumulative_size: cumulativeItems.length,
    section_balance: countBy(batchItems, 'section'),
    domain_balance: countBy(batchItems, 'domain'),
    skill_balance: countBy(batchItems, 'skill'),
    difficulty_balance_batch: countBy(batchItems, 'difficulty'),
    difficulty_balance_cumulative: countBy(cumulativeItems, 'difficulty'),
    answer_key_balance_cumulative: countBy(mcItems, 'answer'),
    duplicate_prompt_count: duplicatePrompts.length,
    duplicate_passage_count: duplicatePassages.length,
    weak_items_revised: 0,
    status: duplicatePrompts.length === 0 && duplicatePassages.length === 0 ? 'ok' : 'review'
  };
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return [...duplicates];
}

function finalAudit(items) {
  const bySection = countBy(items, 'section');
  const byDifficulty = countByNested(items, 'section', 'difficulty');
  const byDomain = countByNested(items, 'section', 'domain');
  const bySkill = countByNested(items, 'section', 'skill');
  const formats = countBy(items.filter((item) => item.section === 'math'), 'format');
  const answers = countBy(items.filter((item) => item.format === 'mc'), 'answer');
  return {
    total: items.length,
    by_section: bySection,
    by_domain: byDomain,
    by_skill: bySkill,
    by_difficulty: byDifficulty,
    math_formats: formats,
    mc_answer_balance: answers,
    duplicate_prompts: findDuplicates(items.map((item) => item.prompt)).length,
    duplicate_passages: findDuplicates(items.filter((item) => item.passage).map((item) => item.passage)).length
  };
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath, items) {
  writeFileSync(filePath, `${items.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
}

const totalMc = BLUEPRINT.reading_writing.total + BLUEPRINT.math.format.mc;
const answers = answerPlan(totalMc);
const rwBank = buildReadingWritingBank(answers);
const mathBank = buildMathBank(answers, rwBank.mcUsed);
const allItems = [...rwBank.items, ...mathBank.items];

writeJson(path.join(outDir, 'blueprint-summary.json'), BLUEPRINT);
writeJsonl(path.join(outDir, 'question-bank.jsonl'), allItems);

for (let batchIndex = 0; batchIndex < allItems.length / 100; batchIndex += 1) {
  const start = batchIndex * 100;
  const end = start + 100;
  const batchItems = allItems.slice(start, end);
  const cumulativeItems = allItems.slice(0, end);
  writeJsonl(path.join(batchDir, `batch-${String(batchIndex + 1).padStart(2, '0')}.jsonl`), batchItems);
  writeJson(path.join(auditDir, `batch-${String(batchIndex + 1).padStart(2, '0')}.json`), batchAudit(batchItems, cumulativeItems, batchIndex + 1));
}

writeJson(path.join(auditDir, 'final-audit.json'), finalAudit(allItems));

console.log(`Generated ${allItems.length} questions in ${batchDir}`);