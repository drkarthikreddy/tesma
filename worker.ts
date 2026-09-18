/**
 * tesma - Cloudflare Worker & API for Medical QBank
 * Connects directly to Cloudflare D1 SQL database
 */

interface D1Result<T = any> {
  results?: T[];
  success?: boolean;
  error?: string;
  meta?: any;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run<T = any>(): Promise<D1Result<T>>;
  all<T = any>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec<T = any>(query: string): Promise<D1Result<T>>;
}

export interface Env {
  // Cloudflare D1 binding configured in wrangler.toml
  DB: D1Database;
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // 1. Health check & D1 connection test
      if (url.pathname === '/api/health' || url.pathname === '/') {
        const testQuery = await env.DB.prepare('SELECT COUNT(*) as count FROM questions').first();
        return Response.json(
          {
            status: 'ok',
            database: 'connected',
            totalQuestions: testQuery?.count || 0,
            message: 'tesma Cloudflare Worker & D1 SQL operational',
          },
          { headers: CORS_HEADERS }
        );
      }

      // 2. Fetch questions with hierarchy filtering
      if (url.pathname === '/api/questions' && request.method === 'GET') {
        const subject = url.searchParams.get('subject');
        const chapter = url.searchParams.get('chapter');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        let query = 'SELECT * FROM questions';
        const params: any[] = [];

        if (subject && chapter) {
          query += ' WHERE subject = ? AND chapter = ?';
          params.push(subject, chapter);
        } else if (subject) {
          query += ' WHERE subject = ?';
          params.push(subject);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const { results } = await env.DB.prepare(query).bind(...params).all();

        // Parse JSON options
        const parsed = (results || []).map((row: any) => ({
          ...row,
          options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
        }));

        return Response.json({ success: true, count: parsed.length, data: parsed }, { headers: CORS_HEADERS });
      }

      // 3. Batch upload questions directly from Admin dashboard
      if (url.pathname === '/api/questions/batch' && request.method === 'POST') {
        const body: any = await request.json();
        const questions = body.questions || [];

        if (!Array.isArray(questions) || questions.length === 0) {
          return Response.json({ success: false, error: 'Empty questions array' }, { status: 400, headers: CORS_HEADERS });
        }

        const statements = questions.map((q: any, i: number) => {
          const id = q.id || `q_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
          const subject = q.subject || 'General Medicine';
          const chapter = q.chapter || 'Chapter 1';
          const topic = q.topic || 'Topic 1';
          const subtopic = q.subtopic || 'Subtopic 1';
          const questionText = q.question || q.questionText || '';
          const optionsStr = JSON.stringify(q.options || []);
          const correctAnswer = q.correctAnswer || q.correct_answer || q.answer || '';
          const explanation = q.explanation || '';
          const imageUrl = q.imageUrl || q.image_url || '';

          return env.DB.prepare(
            `INSERT OR REPLACE INTO questions (id, subject, chapter, topic, subtopic, question, options, correct_answer, explanation, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(id, subject, chapter, topic, subtopic, questionText, optionsStr, correctAnswer, explanation, imageUrl);
        });

        // Execute batch transaction in Cloudflare D1
        const results = await env.DB.batch(statements);

        return Response.json(
          {
            success: true,
            uploadedCount: results.length,
            message: `Successfully inserted/updated ${results.length} questions in Cloudflare D1 SQL.`,
          },
          { headers: CORS_HEADERS }
        );
      }

      // If request doesn't match an /api route, serve static assets (Vite React app)
      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return Response.json({ error: 'Endpoint not found' }, { status: 404, headers: CORS_HEADERS });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500, headers: CORS_HEADERS });
    }
  },
};
