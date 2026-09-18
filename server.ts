import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Cloudflare D1 SQL Configuration
const CLOUDFLARE_DATABASE_ID =
  process.env.CLOUDFLARE_DATABASE_ID || '9e692809-14a5-4076-b4dd-79e1fe03bc7f';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;

/**
 * Execute SQL statement directly on Cloudflare D1 SQL database
 */
async function executeD1Query<T = any>(
  sql: string,
  params: any[] = []
): Promise<{ results: T[]; success: boolean; meta?: any }> {
  // Option A: If a deployed Cloudflare Worker URL is specified
  if (CLOUDFLARE_WORKER_URL) {
    const cleanUrl = CLOUDFLARE_WORKER_URL.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/api/questions`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Cloudflare Worker returned HTTP ${res.status}`);
    }
    const json: any = await res.json();
    return { results: json.data || [], success: true };
  }

  // Option B: Direct Cloudflare D1 REST API
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      'Cloudflare D1 SQL configuration missing. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in app Settings. All local storage has been removed; queries run strictly on Cloudflare D1 SQL.'
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare D1 HTTP Error (${response.status}): ${errorText}`);
  }

  const json: any = await response.json();
  if (!json.success) {
    const errors = json.errors?.map((e: any) => e.message).join(', ') || 'Cloudflare D1 query failed';
    throw new Error(errors);
  }

  const firstResult = json.result?.[0];
  return {
    results: firstResult?.results || [],
    success: true,
    meta: firstResult?.meta,
  };
}

/**
 * Execute multiple batch SQL statements on Cloudflare D1 SQL
 */
async function executeD1Batch(
  statements: { sql: string; params: any[] }[]
): Promise<any> {
  if (CLOUDFLARE_WORKER_URL) {
    const cleanUrl = CLOUDFLARE_WORKER_URL.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/api/questions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: statements }),
    });
    if (!res.ok) {
      throw new Error(`Cloudflare Worker returned HTTP ${res.status}`);
    }
    return await res.json();
  }

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      'Cloudflare D1 SQL configuration missing. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in app Settings.'
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/query`;

  // D1 query API accepts array of queries for batch execution
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statements),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare D1 Batch Error (${response.status}): ${errorText}`);
  }

  const json: any = await response.json();
  if (!json.success) {
    const errors = json.errors?.map((e: any) => e.message).join(', ') || 'Cloudflare D1 batch failed';
    throw new Error(errors);
  }

  return json.result;
}

// 1. Health check & Cloudflare D1 SQL status
app.get(['/api/health', '/api/status'], async (req, res) => {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID && !CLOUDFLARE_WORKER_URL) {
      return res.json({
        status: 'pending_credentials',
        database: 'Cloudflare D1 SQL (tesma-db)',
        databaseId: CLOUDFLARE_DATABASE_ID,
        mode: 'Cloudflare D1 SQL Only (Local storage removed)',
        totalQuestions: 0,
        message: 'Awaiting CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN in Settings.',
      });
    }

    const { results } = await executeD1Query<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions'
    );
    const count = results[0]?.count || 0;

    return res.json({
      status: 'ok',
      database: 'Cloudflare D1 SQL (tesma-db)',
      databaseId: CLOUDFLARE_DATABASE_ID,
      mode: 'Cloudflare D1 SQL Only',
      totalQuestions: count,
      message: 'Cloudflare D1 SQL database connected and operational.',
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'error',
      database: 'Cloudflare D1 SQL (tesma-db)',
      databaseId: CLOUDFLARE_DATABASE_ID,
      error: err.message,
    });
  }
});

// 2. Fetch questions from Cloudflare D1 SQL with hierarchy filtering
app.get('/api/questions', async (req, res) => {
  try {
    const { subject, chapter, limit = 100 } = req.query;

    let sql = 'SELECT * FROM questions';
    const params: any[] = [];

    if (subject && subject !== 'All') {
      sql += ' WHERE subject = ?';
      params.push(String(subject));
      if (chapter) {
        sql += ' AND chapter = ?';
        params.push(String(chapter));
      }
    } else if (chapter) {
      sql += ' WHERE chapter = ?';
      params.push(String(chapter));
    }

    const limitNum = parseInt(String(limit), 10) || 100;
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limitNum);

    const { results } = await executeD1Query(sql, params);

    // Normalize rows from Cloudflare D1 SQL
    const normalized = (results || []).map((row: any) => {
      let options: string[] = [];
      if (typeof row.options === 'string') {
        try {
          options = JSON.parse(row.options);
        } catch {
          options = [row.options];
        }
      } else if (Array.isArray(row.options)) {
        options = row.options;
      }

      return {
        id: row.id,
        subject: row.subject,
        chapter: row.chapter,
        topic: row.topic || '',
        subtopic: row.subtopic || '',
        question: row.question || '',
        options,
        correct_answer: row.correct_answer || row.correctAnswer || '',
        correctAnswer: row.correct_answer || row.correctAnswer || '',
        explanation: row.explanation || '',
        image_url: row.image_url || row.imageUrl || '',
        imageUrl: row.image_url || row.imageUrl || '',
        difficulty: row.difficulty || 'medium',
        created_at: row.created_at || new Date().toISOString(),
        likes: Number(row.likes) || 0,
        comments_count: Number(row.comments_count) || 0,
      };
    });

    return res.json({
      success: true,
      count: normalized.length,
      data: normalized,
      source: 'Cloudflare D1 SQL',
    });
  } catch (err: any) {
    console.error('[Cloudflare D1 Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      source: 'Cloudflare D1 SQL',
    });
  }
});

// 3. Batch upload questions directly into Cloudflare D1 SQL
app.post('/api/questions/batch', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty questions array' });
    }

    const statements = questions.map((q: any, i: number) => {
      const id = String(
        q.id || `q_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
      );
      const subject = String(q.subject || 'General Medicine');
      const chapter = String(q.chapter || 'Chapter 1');
      const topic = String(q.topic || 'Topic 1');
      const subtopic = String(q.subtopic || 'Subtopic 1');
      const questionText = String(q.question || q.questionText || '');
      const optionsStr = JSON.stringify(Array.isArray(q.options) ? q.options : []);
      const correctAnswer = String(q.correctAnswer || q.correct_answer || q.answer || '');
      const explanation = String(q.explanation || '');
      const imageUrl = String(q.imageUrl || q.image_url || '');

      return {
        sql: `INSERT OR REPLACE INTO questions (id, subject, chapter, topic, subtopic, question, options, correct_answer, explanation, image_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          id,
          subject,
          chapter,
          topic,
          subtopic,
          questionText,
          optionsStr,
          correctAnswer,
          explanation,
          imageUrl,
        ],
      };
    });

    const result = await executeD1Batch(statements);

    return res.json({
      success: true,
      uploadedCount: statements.length,
      message: `Successfully executed batch INSERT of ${statements.length} questions into Cloudflare D1 SQL.`,
      result,
    });
  } catch (err: any) {
    console.error('[Cloudflare D1 Batch Insert Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      source: 'Cloudflare D1 SQL',
    });
  }
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[tesma-server] Running strictly with Cloudflare D1 SQL on http://0.0.0.0:${PORT}`);
  });
}

startServer();
