import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

/**
 * Dynamic configuration resolver so updates in Settings or Admin UI reflect immediately
 */
function getCloudflareConfig() {
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  let apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() || '';
  let databaseId =
    process.env.CLOUDFLARE_DATABASE_ID?.trim() || '9e692809-14a5-4076-b4dd-79e1fe03bc7f';
  let workerUrl = process.env.CLOUDFLARE_WORKER_URL?.trim() || '';

  // Always read from .env so user-provided tokens override stale container env vars
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (key === 'CLOUDFLARE_ACCOUNT_ID' && val) accountId = val;
        if (key === 'CLOUDFLARE_API_TOKEN' && val) apiToken = val;
        if (key === 'CLOUDFLARE_DATABASE_ID' && val) databaseId = val;
        if (key === 'CLOUDFLARE_WORKER_URL' && val) workerUrl = val;
      }
    }
  } catch (e) {
    console.warn('Could not read .env dynamically:', e);
  }

  return { databaseId, accountId, apiToken, workerUrl };
}

/**
 * Execute a SQL query on Cloudflare D1 SQL
 */
async function executeD1Query<T = any>(
  sql: string,
  params: any[] = []
): Promise<{ results: T[]; success: boolean; meta?: any }> {
  const { databaseId, accountId, apiToken, workerUrl } = getCloudflareConfig();

  // Mode 1: Direct Cloudflare D1 REST API (Executes true arbitrary SQL)
  if (accountId && apiToken) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsed: any;
      try {
        parsed = JSON.parse(errorText);
      } catch {}
      const msg = parsed?.errors?.[0]?.message || errorText;
      throw new Error(`Cloudflare D1 error (${response.status}): ${msg}`);
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

  // Mode 2: Cloudflare Worker proxy
  if (workerUrl) {
    const cleanUrl = workerUrl.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/api/questions`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Cloudflare Worker HTTP ${res.status}: ${txt}`);
    }
    const json: any = await res.json();
    return { results: json.data || [], success: true };
  }

  throw new Error(
    'Cloudflare D1 credentials required: Please enter your Cloudflare Account ID and API Token in Profile -> Admin Console.'
  );
}

/**
 * Execute multiple batch statements on Cloudflare D1 SQL
 */
async function executeD1Batch(
  statements: { sql: string; params: any[] }[],
  rawQuestions?: any[]
): Promise<any> {
  const { databaseId, accountId, apiToken, workerUrl } = getCloudflareConfig();

  // Mode 1: Direct Cloudflare D1 REST API
  // Note: Cloudflare /d1/database/:id/query endpoint requires a single object { sql, params }.
  // Passing a top-level array results in "400: Invalid input: Expected object, received array".
  // We execute prepared statements in parallel chunks of 5.
  if (accountId && apiToken) {
    const results: any[] = [];
    const CHUNK_SIZE = 5;

    for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
      const chunk = statements.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map((stmt) => executeD1Query(stmt.sql, stmt.params))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  // Mode 2: Cloudflare Worker proxy
  if (workerUrl) {
    const cleanUrl = workerUrl.replace(/\/$/, '');
    const payload =
      rawQuestions && rawQuestions.length > 0
        ? rawQuestions
        : statements.map((s, idx) => ({
            id: s.params[0] || `q_${Date.now()}_${idx}`,
            subject: s.params[1] || 'General Medicine',
            chapter: s.params[2] || 'Chapter 1',
            topic: s.params[3] || 'Topic 1',
            subtopic: s.params[4] || 'Subtopic 1',
            question: s.params[5] || '',
            options: typeof s.params[6] === 'string' ? JSON.parse(s.params[6]) : s.params[6],
            correctAnswer: s.params[7] || '',
            explanation: s.params[8] || '',
            imageUrl: s.params[9] || '',
          }));

    const res = await fetch(`${cleanUrl}/api/questions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: payload }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Cloudflare Worker HTTP ${res.status}: ${txt}`);
    }
    return await res.json();
  }

  throw new Error('Cloudflare D1 credentials missing (Account ID and API Token).');
}

// 1. Health check & Cloudflare D1 SQL status
app.get(['/api/health', '/api/status'], async (req, res) => {
  const cfg = getCloudflareConfig();

  if (!cfg.accountId && !cfg.workerUrl) {
    return res.json({
      status: 'pending_credentials',
      database: 'Cloudflare D1 SQL (tesma-db)',
      databaseId: cfg.databaseId,
      mode: 'Cloudflare D1 SQL Only',
      totalQuestions: 0,
      isConfigured: false,
      message: 'Cloudflare credentials not set yet. Enter Account ID and API Token in Profile -> Admin Dashboard.',
    });
  }

  try {
    const { results } = await executeD1Query<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions'
    );
    const count = results[0]?.count || 0;

    return res.json({
      status: 'ok',
      database: 'Cloudflare D1 SQL (tesma-db)',
      databaseId: cfg.databaseId,
      mode: 'Cloudflare D1 SQL Only',
      totalQuestions: count,
      isConfigured: true,
      message: 'Cloudflare D1 SQL database connected and operational.',
    });
  } catch (err: any) {
    return res.json({
      status: 'error',
      database: 'Cloudflare D1 SQL (tesma-db)',
      databaseId: cfg.databaseId,
      isConfigured: true,
      error: err.message,
    });
  }
});

// 2. Get current Cloudflare configuration state (masked)
app.get('/api/config/cloudflare', (req, res) => {
  const cfg = getCloudflareConfig();
  res.json({
    databaseId: cfg.databaseId,
    accountId: cfg.accountId
      ? cfg.accountId.length > 8
        ? `${cfg.accountId.slice(0, 4)}...${cfg.accountId.slice(-4)}`
        : '••••••••'
      : '',
    rawAccountId: cfg.accountId || '',
    hasAccountId: !!cfg.accountId,
    hasApiToken: !!cfg.apiToken,
    workerUrl: cfg.workerUrl,
    isConfigured: !!(cfg.accountId && cfg.apiToken) || !!cfg.workerUrl,
  });
});

// 3. Save / Update Cloudflare D1 credentials and immediately test connection
app.post('/api/config/cloudflare', async (req, res) => {
  try {
    const { accountId, apiToken, databaseId, workerUrl } = req.body;

    if (accountId !== undefined) process.env.CLOUDFLARE_ACCOUNT_ID = String(accountId).trim();
    if (apiToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = String(apiToken).trim();
    if (databaseId !== undefined && String(databaseId).trim()) {
      process.env.CLOUDFLARE_DATABASE_ID = String(databaseId).trim();
    }
    if (workerUrl !== undefined) process.env.CLOUDFLARE_WORKER_URL = String(workerUrl).trim();

    // Persist to .env on server filesystem so it persists across container restarts
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

      const updateOrAppend = (content: string, key: string, val: string) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}="${val}"`);
        }
        return `${content}\n${key}="${val}"`;
      };

      if (process.env.CLOUDFLARE_ACCOUNT_ID) {
        envContent = updateOrAppend(envContent, 'CLOUDFLARE_ACCOUNT_ID', process.env.CLOUDFLARE_ACCOUNT_ID);
      }
      if (process.env.CLOUDFLARE_API_TOKEN) {
        envContent = updateOrAppend(envContent, 'CLOUDFLARE_API_TOKEN', process.env.CLOUDFLARE_API_TOKEN);
      }
      if (process.env.CLOUDFLARE_DATABASE_ID) {
        envContent = updateOrAppend(envContent, 'CLOUDFLARE_DATABASE_ID', process.env.CLOUDFLARE_DATABASE_ID);
      }
      if (process.env.CLOUDFLARE_WORKER_URL) {
        envContent = updateOrAppend(envContent, 'CLOUDFLARE_WORKER_URL', process.env.CLOUDFLARE_WORKER_URL);
      }

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    } catch (e) {
      console.warn('Could not write to .env:', e);
    }

    // Run connection test query
    try {
      const test = await executeD1Query('SELECT COUNT(*) as count FROM questions');
      const count = test.results?.[0]?.count || 0;
      return res.json({
        success: true,
        connected: true,
        count,
        message: `Successfully connected to Cloudflare D1 SQL! Total questions in table: ${count}`,
      });
    } catch (err: any) {
      const errMsg = err.message || '';
      const isTableMissing = errMsg.includes('no such table') || errMsg.includes('questions');
      return res.json({
        success: true,
        connected: false,
        tableMissing: isTableMissing,
        error: errMsg,
        message: isTableMissing
          ? 'Connected to Cloudflare D1, but the "questions" table has not been created yet. Click "Initialize Table".'
          : `Connection error: ${errMsg}`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Initialize Cloudflare D1 schema (CREATE TABLE IF NOT EXISTS)
app.post('/api/database/init', async (req, res) => {
  try {
    const initSql = `
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        chapter TEXT NOT NULL,
        topic TEXT NOT NULL,
        subtopic TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        image_url TEXT,
        difficulty TEXT DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0
      );
    `;
    await executeD1Query(initSql);
    return res.json({
      success: true,
      message: 'Cloudflare D1 "questions" table structure verified/created successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Seed high-yield curriculum questions directly into Cloudflare D1 SQL
app.post('/api/database/seed', async (req, res) => {
  try {
    const SEED_QUESTIONS = [
      {
        id: 'q_anat_01',
        subject: 'Anatomy',
        chapter: 'Cardiovascular System',
        topic: 'Heart Arterial Supply',
        subtopic: 'Coronary Arteries',
        question: 'Which coronary artery branch typically supplies the sinoatrial (SA) node in the majority of individuals?',
        options: ['Right coronary artery (RCA)', 'Left anterior descending artery (LAD)', 'Left circumflex artery (LCx)', 'Marginal artery'],
        correctAnswer: 'Right coronary artery (RCA)',
        explanation: 'The SA nodal artery arises from the right coronary artery (RCA) in approximately 60% of individuals and from the circumflex branch in 40%.',
      },
      {
        id: 'q_anat_02',
        subject: 'Anatomy',
        chapter: 'Neuroanatomy',
        topic: 'Cranial Nerves',
        subtopic: 'Cavernous Sinus',
        question: 'Which cranial nerve is located closest to the internal carotid artery within the cavernous sinus?',
        options: ['Abducens nerve (CN VI)', 'Oculomotor nerve (CN III)', 'Trochlear nerve (CN IV)', 'Ophthalmic nerve (CN V1)'],
        correctAnswer: 'Abducens nerve (CN VI)',
        explanation: 'CN VI runs freely inside the cavernous sinus lumen alongside the internal carotid artery, making it most vulnerable to cavernous sinus pathology or aneurysms.',
      },
      {
        id: 'q_phys_01',
        subject: 'Physiology',
        chapter: 'Renal Physiology',
        topic: 'Glomerular Filtration',
        subtopic: 'Clearance & GFR',
        question: 'Which substance has a renal clearance that most accurately estimates the Glomerular Filtration Rate (GFR)?',
        options: ['Inulin', 'Para-aminohippurate (PAH)', 'Urea', 'Glucose'],
        correctAnswer: 'Inulin',
        explanation: 'Inulin is freely filtered across the glomerulus and is neither reabsorbed, secreted, nor metabolized by the renal tubules, making its clearance equal to GFR.',
      },
      {
        id: 'q_phys_02',
        subject: 'Physiology',
        chapter: 'Cardiovascular System',
        topic: 'Cardiac Cycle',
        subtopic: 'Heart Sounds',
        question: 'The third heart sound (S3) is physiologically caused by which event?',
        options: [
          'Rapid passive ventricular filling into a compliant or volume-overloaded ventricle',
          'Atrial contraction against a stiff ventricular wall',
          'Closure of aortic and pulmonic valves',
          'Turbulent flow across a stenotic mitral valve',
        ],
        correctAnswer: 'Rapid passive ventricular filling into a compliant or volume-overloaded ventricle',
        explanation: 'S3 occurs during the early rapid filling phase of diastole as blood decelerates abruptly against the ventricular wall.',
      },
      {
        id: 'q_pharm_01',
        subject: 'Pharmacology',
        chapter: 'Autonomic Nervous System',
        topic: 'Cholinergic Agonists',
        subtopic: 'Direct Muscarinic Agonists',
        question: 'A patient with non-obstructive postoperative urinary retention is prescribed bethanechol. What is the primary mechanism of action?',
        options: [
          'Direct muscarinic receptor stimulation',
          'Acetylcholinesterase inhibition',
          'Alpha-1 adrenergic receptor stimulation',
          'Beta-2 adrenergic receptor blockade',
        ],
        correctAnswer: 'Direct muscarinic receptor stimulation',
        explanation: 'Bethanechol is a carbamoyl ester that directly activates M3 receptors on the detrusor muscle, causing bladder contraction.',
      },
      {
        id: 'q_pharm_02',
        subject: 'Pharmacology',
        chapter: 'Cardiovascular Drugs',
        topic: 'Antihypertensives',
        subtopic: 'ACE Inhibitors',
        question: 'Which endogenous peptide accumulation is primarily responsible for ACE inhibitor-induced dry cough and angioedema?',
        options: ['Bradykinin', 'Angiotensin II', 'Substance P alone', 'Endothelin-1'],
        correctAnswer: 'Bradykinin',
        explanation: 'ACE (kininase II) normally breaks down bradykinin. Inhibiting ACE leads to accumulation of bradykinin, causing bronchial irritation and vasodilatory angioedema.',
      },
      {
        id: 'q_path_01',
        subject: 'Pathology',
        chapter: 'General Pathology',
        topic: 'Cell Injury & Necrosis',
        subtopic: 'Patterns of Tissue Necrosis',
        question: 'Which type of necrosis is typically observed following an acute ischemic infarction in the brain parenchyma?',
        options: ['Liquefactive necrosis', 'Coagulative necrosis', 'Caseous necrosis', 'Fat necrosis'],
        correctAnswer: 'Liquefactive necrosis',
        explanation: 'Due to the brain high lipid content and abundant microglial hydrolytic lysosomal enzymes, CNS infarcts lead to liquefactive necrosis.',
      },
      {
        id: 'q_micro_01',
        subject: 'Microbiology',
        chapter: 'Bacteriology',
        topic: 'Gram-Positive Cocci',
        subtopic: 'Staphylococci',
        question: 'Which test reliably differentiates Staphylococcus aureus from coagulase-negative staphylococci?',
        options: ['Coagulase test', 'Catalase test', 'Bacitracin susceptibility', 'Optochin test'],
        correctAnswer: 'Coagulase test',
        explanation: 'Staphylococcus aureus produces coagulase which converts fibrinogen to fibrin, distinguishing it from S. epidermidis and S. saprophyticus.',
      },
      {
        id: 'q_surg_01',
        subject: 'Surgery',
        chapter: 'Gastrointestinal Surgery',
        topic: 'Acute Abdomen',
        subtopic: 'Acute Appendicitis',
        question: 'Pain referred to McBurney point in acute appendicitis initially starts in the periumbilical region due to which innervation pathway?',
        options: [
          'Visceral afferent fibers entering the spinal cord at T10',
          'Somatic afferent irritation of the parietal peritoneum',
          'Phrenic nerve irritation',
          'Iliohypogastric nerve compression',
        ],
        correctAnswer: 'Visceral afferent fibers entering the spinal cord at T10',
        explanation: 'Early appendiceal inflammation distends the visceral peritoneum, stimulating visceral afferents that enter the T10 dermatomal segment.',
      },
      {
        id: 'q_peds_01',
        subject: 'Pediatrics',
        chapter: 'Cardiology',
        topic: 'Congenital Heart Disease',
        subtopic: 'Cyanotic Heart Lesions',
        question: 'What is the most common cyanotic congenital heart disease manifesting in infants after the immediate neonatal period?',
        options: [
          'Tetralogy of Fallot',
          'Transposition of the Great Arteries',
          'Truncus Arteriosus',
          'Tricuspid Atresia',
        ],
        correctAnswer: 'Tetralogy of Fallot',
        explanation: 'Tetralogy of Fallot is the most common cyanotic congenital heart disease overall, characterized by VSD, overriding aorta, pulmonary stenosis, and RVH.',
      },
    ];

    const statements = SEED_QUESTIONS.map((q) => ({
      sql: `INSERT OR REPLACE INTO questions (id, subject, chapter, topic, subtopic, question, options, correct_answer, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        q.id,
        q.subject,
        q.chapter,
        q.topic,
        q.subtopic,
        q.question,
        JSON.stringify(q.options),
        q.correctAnswer,
        q.explanation,
      ],
    }));

    await executeD1Batch(statements, SEED_QUESTIONS);

    return res.json({
      success: true,
      seededCount: statements.length,
      message: `Successfully seeded ${statements.length} questions into Cloudflare D1 SQL.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Fetch questions from Cloudflare D1 SQL with hierarchy filtering
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

// 7. Batch upload questions directly into Cloudflare D1 SQL
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

    const result = await executeD1Batch(statements, questions);

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
