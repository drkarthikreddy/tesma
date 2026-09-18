-- tesma Medical QBank - Cloudflare D1 SQL Schema
-- Auto-executed when provisioning your Cloudflare D1 database

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL, -- JSON-stringified array: ["A", "B", "C", "D"]
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  image_url TEXT,
  difficulty TEXT DEFAULT 'medium',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_hierarchy 
ON questions(subject, chapter, topic, subtopic);

CREATE INDEX IF NOT EXISTS idx_questions_subject 
ON questions(subject);

-- Sample initial test questions
INSERT OR REPLACE INTO questions (id, subject, chapter, topic, subtopic, question, options, correct_answer, explanation)
VALUES 
(
  'q_anat_01',
  'Anatomy',
  'Cardiovascular System',
  'Heart Arterial Supply',
  'Coronary Arteries',
  'Which coronary artery branch typically supplies the sinoatrial (SA) node in the majority of individuals?',
  '["Right coronary artery (RCA)", "Left anterior descending artery (LAD)", "Left circumflex artery (LCx)", "Marginal artery"]',
  'Right coronary artery (RCA)',
  'The SA nodal artery arises from the right coronary artery (RCA) in approximately 60% of individuals and from the circumflex branch in 40%.'
),
(
  'q_pharm_01',
  'Pharmacology',
  'Autonomic Nervous System',
  'Cholinergic Agonists',
  'Direct Muscarinic Agonists',
  'A patient with non-obstructive postoperative urinary retention is prescribed bethanechol. What is the primary mechanism of action?',
  '["Direct muscarinic receptor stimulation", "Acetylcholinesterase inhibition", "Alpha-1 adrenergic receptor stimulation", "Beta-2 adrenergic receptor blockade"]',
  'Direct muscarinic receptor stimulation',
  'Bethanechol is a carbamoyl ester that directly activates M3 receptors on the detrusor muscle, causing bladder contraction.'
);
