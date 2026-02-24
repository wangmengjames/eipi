import { Question, QuestionCategory } from '../types';

export function parseMarkdownQuestions(markdown: string): Question[] {
  const questions: Question[] = [];

  // Split on "## Question N" headers, capturing the question number
  const parts = markdown.split(/^## Question (\d+)\s*$/m);

  // parts[0] = file header, then pairs: parts[1]="1", parts[2]=Q1 content, ...
  for (let i = 1; i < parts.length; i += 2) {
    const num = parts[i];
    const block = parts[i + 1];
    if (!block) continue;

    // Topic and Category
    const tcMatch = block.match(/\*\*Topic:\*\*\s*(.+?)\s*\|\s*\*\*Category:\*\*\s*(.+)/);
    const topic = tcMatch?.[1]?.trim() || '';
    const categoryStr = tcMatch?.[2]?.trim() || '';

    // Source Page (optional)
    const spMatch = block.match(/\*\*Source Page:\*\*\s*(\d+)/);
    const sourcePage = spMatch ? parseInt(spMatch[1], 10) : undefined;

    // Image (optional)
    const imgMatch = block.match(/!\[Diagram\]\((data:[^)]+)\)/);
    const imageUrl = imgMatch?.[1] || undefined;

    // Options: **A.** text  through  **E.** text
    const optionMatches = [...block.matchAll(/\*\*[A-E]\.\*\*\s+(.+)/g)];
    const options = optionMatches.map(m => m[1].trim());

    // Correct answer letter → 0-based index
    const ansMatch = block.match(/>\s*\*\*Correct Answer:\*\*\s*([A-E])/);
    const correctLetter = ansMatch?.[1] || 'A';
    const correctAnswerIndex = correctLetter.charCodeAt(0) - 65;

    // Explanation (single line after "> **Explanation:**")
    const expMatch = block.match(/>\s*\*\*Explanation:\*\*\s*(.*)/);
    const explanation = expMatch?.[1]?.trim() || '';

    // Question text: between metadata lines and first option or image
    let textStart = 0;
    if (tcMatch?.index !== undefined) {
      textStart = tcMatch.index + tcMatch[0].length;
    }
    if (spMatch?.index !== undefined) {
      textStart = Math.max(textStart, spMatch.index + spMatch[0].length);
    }

    const firstOptionIdx = block.search(/\*\*[A-E]\.\*\*/);
    const imageIdx = block.indexOf('![Diagram]');
    let textEnd = firstOptionIdx;
    if (imageIdx >= 0 && (textEnd < 0 || imageIdx < textEnd)) {
      textEnd = imageIdx;
    }

    const text = textEnd > textStart
      ? block.substring(textStart, textEnd).trim()
      : '';

    questions.push({
      id: `q-${num}`,
      text,
      options,
      correctAnswerIndex,
      category: categoryStr as QuestionCategory,
      topic: topic || undefined,
      explanation: explanation || undefined,
      imageUrl,
      sourcePage,
      requiresImage: !!imageUrl,
      reviewStatus: 'reviewed',
    });
  }

  return questions;
}

export async function computeContentHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
