import { Question } from '../types';

/**
 * Loads questions from the database API (/api/questions).
 * No hardcoded or mock questions are returned.
 */
export async function getQuestions(subject?: string, chapter?: string): Promise<Question[]> {
  const queryParams = new URLSearchParams();
  if (subject && subject !== 'All') queryParams.append('subject', subject);
  if (chapter) queryParams.append('chapter', chapter);

  const url = `/api/questions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch questions from database (Status: ${res.status})`);
  }

  const json = await res.json();
  if (!json.success && !Array.isArray(json.data)) {
    throw new Error(json.error || 'Invalid response from database');
  }

  const rawList = Array.isArray(json.data) ? json.data : [];

  // Normalize fields coming from database schema
  return rawList.map((row: any) => {
    let parsedOptions: string[] = [];
    if (Array.isArray(row.options)) {
      parsedOptions = row.options;
    } else if (typeof row.options === 'string') {
      try {
        parsedOptions = JSON.parse(row.options);
      } catch {
        parsedOptions = [];
      }
    }

    return {
      id: String(row.id),
      subject: String(row.subject || 'General'),
      chapter: String(row.chapter || ''),
      topic: String(row.topic || ''),
      subtopic: String(row.subtopic || ''),
      question: String(row.question || ''),
      options: parsedOptions,
      correctAnswer: String(row.correct_answer || row.correctAnswer || ''),
      explanation: String(row.explanation || ''),
      imageUrl: row.image_url || row.imageUrl || undefined,
      difficulty: row.difficulty || 'medium',
      created_at: row.created_at,
      likes: row.likes || 0,
      commentsCount: row.comments_count || 0,
    };
  });
}
