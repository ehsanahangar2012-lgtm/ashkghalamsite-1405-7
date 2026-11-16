/**
 * Lightweight 100% offline Persian + English text similarity engine.
 * Designed for 3GB RAM cPanel hosting (<5MB memory footprint, zero heavy models).
 */

export function normalizePersianText(input: string): string {
  return (input || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u064B-\u065F]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildWordShingles(text: string, n = 3): Set<string> {
  const words = normalizePersianText(text)
    .split(' ')
    .filter((w) => w.length > 1);
  const shingles = new Set<string>();
  if (words.length < n) {
    for (const w of words) shingles.add(w);
    return shingles;
  }
  for (let i = 0; i <= words.length - n; i++) {
    shingles.add(words.slice(i, i + n).join(' '));
  }
  return shingles;
}

export function jaccardSimilarity(textA: string, textB: string, shingleSize = 3): number {
  const setA = buildWordShingles(textA, shingleSize);
  const setB = buildWordShingles(textB, shingleSize);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function findMaxSimilarityWithPosts(
  candidateTitle: string,
  candidateContent: string,
  existingPosts: Array<{ title: string; content: string }>
): { maxContentSimilarity: number; maxTitleSimilarity: number; matchedTitle?: string } {
  let maxContentSimilarity = 0;
  let maxTitleSimilarity = 0;
  let matchedTitle: string | undefined;

  for (const post of existingPosts) {
    const contentSim = jaccardSimilarity(candidateContent, `${post.title} ${post.content}`, 3);
    const titleSim = jaccardSimilarity(candidateTitle, post.title, 2);

    if (contentSim > maxContentSimilarity) {
      maxContentSimilarity = contentSim;
      matchedTitle = post.title;
    }
    if (titleSim > maxTitleSimilarity) {
      maxTitleSimilarity = titleSim;
    }
  }

  return {
    maxContentSimilarity: Number(maxContentSimilarity.toFixed(3)),
    maxTitleSimilarity: Number(maxTitleSimilarity.toFixed(3)),
    matchedTitle,
  };
}
