export function normalizeSecretKey(input) {
  if (!input) return '';

  let key = String(input).trim();

  const assignMatch = key.match(/^[A-Za-z_][A-Za-z0-9_]*=(.+)$/);
  if (assignMatch) {
    key = assignMatch[1].trim();
  }

  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  key = key.replace(/^Bearer\s+/i, '');
  key = key
    .replace(/^sklive_?/i, 'sk_live_')
    .replace(/^sktest_?/i, 'sk_test_')
    .replace(/^sk[_-]?live_?/i, 'sk_live_')
    .replace(/^sk[_-]?test_?/i, 'sk_test_');

  return key;
}

export function looksMaskedKey(key) {
  return key.includes('*') || key.endsWith('...') || /<|>|\[|\]/.test(key);
}
