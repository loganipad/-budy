import json, re, sys

INPUT = '/Users/loganthomas/Desktop/budy-study/data/question-bank/question-bank.jsonl'

def clean_prompt(text):
    """Strip everything after the first '?' (removes 'Case N in skill_name.' artifacts)."""
    if not text:
        return text
    idx = text.find('?')
    if idx != -1:
        return text[:idx + 1]
    return text

def clean_passage(text):
    """
    1. If the passage starts with a question (e.g. 'Which choice...?'), strip up through and including the first '?'.
    2. Strip trailing artifact sentences: 'A follow-up note labeled X confirms the same context.'
       and 'The editing task focuses on X in a concise SAT-style context numbered N.'
    """
    if not text:
        return text

    # Step 1: strip leading question prefix if passage starts with a known question word
    idx = text.find('?')
    if idx != -1 and idx < 200:
        before = text[:idx].strip()
        question_starters = (
            'which ', 'what ', 'how ', 'where ', 'when ', 'why ', 'who ',
            'is ', 'does ', 'do ', 'the student', 'based on the prompt'
        )
        if any(before.lower().startswith(s) for s in question_starters):
            text = text[idx + 1:].strip().lstrip('"').strip()

    # Step 2: strip trailing artifact sentences
    text = re.sub(
        r'\s*A follow-up note labeled \S+ confirms the same context\.?\s*$',
        '', text, flags=re.IGNORECASE
    ).strip()
    text = re.sub(
        r'\s*The editing task focuses on .+?context numbered \d+\.?\s*$',
        '', text, flags=re.IGNORECASE
    ).strip()

    return text

lines = open(INPUT, encoding='utf-8').readlines()
cleaned = []
changed_prompt = 0
changed_passage = 0

for line in lines:
    line = line.strip()
    if not line:
        continue
    item = json.loads(line)
    orig_prompt = item.get('prompt', '')
    orig_passage = item.get('passage') or ''

    new_prompt = clean_prompt(orig_prompt)
    new_passage = clean_passage(orig_passage)
    if not new_passage:
        new_passage = None

    if new_prompt != orig_prompt:
        changed_prompt += 1
        item['prompt'] = new_prompt
    if (new_passage or '') != orig_passage:
        changed_passage += 1
        item['passage'] = new_passage

    cleaned.append(json.dumps(item, ensure_ascii=False))

with open(INPUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(cleaned) + '\n')

print(f"Done. Prompts cleaned: {changed_prompt}, Passages cleaned: {changed_passage}, Total questions: {len(cleaned)}")
