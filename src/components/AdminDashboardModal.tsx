import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Code2,
  Database,
  Eye,
  EyeOff,
  LogOut,
  Copy,
  Check,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('tesma_admin_auth') === 'true';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Upload state
  const [jsInput, setJsInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    count?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Credentials: adminnn@123 / 0987poiu
    if (email.trim() === 'adminnn@123' && password.trim() === '0987poiu') {
      setIsAuthenticated(true);
      localStorage.setItem('tesma_admin_auth', 'true');
    } else {
      setLoginError('Invalid credentials. Please check your admin email and password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tesma_admin_auth');
    setEmail('');
    setPassword('');
    setUploadStatus(null);
    setGeneratedSql(null);
  };

  // Helper: Generates raw SQL statements from JSON array for D1 Console execution
  const generateD1SqlStatements = (questions: any[]): string => {
    const escapeSql = (str: any) => {
      if (str === null || str === undefined) return "''";
      return `'${String(str).replace(/'/g, "''")}'`;
    };

    const sqlLines = questions.map((q, i) => {
      const id = escapeSql(q.id || `q_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`);
      const subject = escapeSql(q.subject || 'General Medicine');
      const chapter = escapeSql(q.chapter || 'Chapter 1');
      const topic = escapeSql(q.topic || 'Topic 1');
      const subtopic = escapeSql(q.subtopic || 'Subtopic 1');
      const question = escapeSql(q.question || q.questionText || '');
      const options = escapeSql(JSON.stringify(Array.isArray(q.options) ? q.options : []));
      const correctAnswer = escapeSql(q.correctAnswer || q.correct_answer || q.answer || '');
      const explanation = escapeSql(q.explanation || '');
      const imageUrl = escapeSql(q.imageUrl || q.image_url || '');

      return `INSERT OR REPLACE INTO questions (id, subject, chapter, topic, subtopic, question, options, correct_answer, explanation, image_url)\nVALUES (${id}, ${subject}, ${chapter}, ${topic}, ${subtopic}, ${question}, ${options}, ${correctAnswer}, ${explanation}, ${imageUrl});`;
    });

    return sqlLines.join('\n\n');
  };

  const parseAndUploadQuestions = async () => {
    if (!jsInput.trim()) {
      setUploadStatus({ success: false, message: 'Please paste your JSON questions array first.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setGeneratedSql(null);

    try {
      let parsedData: any[] = [];
      const cleanInput = jsInput.trim();

      // Support direct JS array or "const questions = [...]" format
      let sanitized = cleanInput;
      if (sanitized.startsWith('const ') || sanitized.startsWith('let ') || sanitized.startsWith('var ')) {
        sanitized = sanitized.replace(/^(const|let|var)\s+[\w$]+\s*=\s*/, '').replace(/;\s*$/, '');
      }

      try {
        parsedData = JSON.parse(sanitized);
      } catch {
        // Fallback evaluate array notation safely
        // eslint-disable-next-line no-new-func
        const fn = new Function(`return (${sanitized});`);
        parsedData = fn();
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error('Data must be a non-empty array of question objects.');
      }

      // Generate the SQL string
      const sqlCode = generateD1SqlStatements(parsedData);
      setGeneratedSql(sqlCode);

      // 1. Direct POST to the Worker's /api/questions/batch endpoint
      const response = await fetch('/api/questions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ questions: parsedData }),
      });

      if (!response.ok) {
        let errDetail = `Status: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error) errDetail = errJson.error;
        } catch {
          // ignore
        }
        throw new Error(errDetail);
      }

      const resJson = await response.json();

      setUploadStatus({
        success: true,
        count: parsedData.length,
        message: `Successfully inserted ${resJson.uploadedCount || parsedData.length} questions directly into tesma-db!`,
      });

      // Dispatch global window event so Home, Reels, and QBank refresh immediately
      window.dispatchEvent(new CustomEvent('tesma:questions-updated'));

      setJsInput('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setUploadStatus({
        success: false,
        message: `Direct API note: ${err.message || 'Error executing batch'}. Use the generated 1-click queries below if deploying in dev mode.`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const copySqlToClipboard = async () => {
    if (!generatedSql) return;
    try {
      await navigator.clipboard.writeText(generatedSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback
    }
  };

  const sampleTemplate = `[
  {
    "id": "q_cardio_${Date.now()}",
    "subject": "Cardiology",
    "chapter": "Arrhythmias",
    "topic": "Supraventricular Tachycardia",
    "subtopic": "Adenosine Administration",
    "question": "What is the primary mechanism of action of adenosine in terminating AV nodal reentrant tachycardia (AVNRT)?",
    "options": [
      "Activation of A1 receptors causing transient AV nodal hyperpolarization",
      "Blockade of cardiac sodium channels in phase 0",
      "Inhibition of delayed rectifier potassium channels",
      "Nonselective beta-adrenergic receptor antagonism"
    ],
    "correctAnswer": "Activation of A1 receptors causing transient AV nodal hyperpolarization",
    "explanation": "Adenosine binds to myocardial A1 GPCRs, activating Gi proteins to open acetylcholine-sensitive K+ channels (IK,ACh) and hyperpolarize the AV node."
  }
]`;

  return (
    <div
      id="admin-dashboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="admin-dashboard-card"
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-amber-50/50 dark:bg-stone-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base leading-tight">
                Admin Dashboard
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isAuthenticated ? 'Direct tesma-db Cloudflare D1 Sync' : 'Authentication Required'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg leading-none p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!isAuthenticated ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4" id="admin-login-form">
              <div className="text-sm text-stone-600 dark:text-stone-300">
                Log in to execute updates directly into your <strong className="text-orange-600 dark:text-orange-400">tesma-db</strong> database.
              </div>

              {loginError && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Admin Email / Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                    <input
                      id="admin-email-input"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="adminnn@123"
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                    <input
                      id="admin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                id="admin-login-submit-btn"
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                Log In to Admin
              </button>
            </form>
          ) : (
            /* Upload Questions View */
            <div className="space-y-4" id="admin-upload-section">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-orange-500" />
                  Paste JSON Questions Array:
                </span>
                <button
                  type="button"
                  onClick={() => setJsInput(sampleTemplate)}
                  className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Load Sample Template
                </button>
              </div>

              <textarea
                id="admin-js-questions-input"
                value={jsInput}
                onChange={(e) => setJsInput(e.target.value)}
                placeholder="[
  {
    &quot;subject&quot;: &quot;Anatomy&quot;,
    &quot;chapter&quot;: &quot;Cardiovascular&quot;,
    &quot;topic&quot;: &quot;Coronary Arteries&quot;,
    &quot;subtopic&quot;: &quot;SA Node Supply&quot;,
    &quot;question&quot;: &quot;...&quot;,
    &quot;options&quot;: [&quot;A&quot;, &quot;B&quot;, &quot;C&quot;, &quot;D&quot;],
    &quot;correctAnswer&quot;: &quot;A&quot;,
    &quot;explanation&quot;: &quot;...&quot;
  }
]"
                rows={8}
                className="w-full p-3 font-mono text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />

              {uploadStatus && (
                <div
                  className={`flex items-start gap-2 p-3 text-xs rounded-xl border ${
                    uploadStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                  }`}
                >
                  {uploadStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  )}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              <button
                id="admin-upload-execute-btn"
                type="button"
                disabled={isUploading}
                onClick={parseAndUploadQuestions}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'Executing D1 Batch Insert...' : 'Update tesma-db Now'}</span>
              </button>

              {/* Generated Queries Section with 1-Click Copy */}
              {generatedSql && (
                <div className="pt-2 space-y-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-orange-500" />
                      Compiled Queries for Cloudflare D1 Console:
                    </span>
                    <button
                      type="button"
                      onClick={copySqlToClipboard}
                      className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Queries'}</span>
                    </button>
                  </div>

                  <pre className="p-3 max-h-36 overflow-y-auto text-[11px] font-mono bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-300 rounded-xl border border-stone-200 dark:border-stone-800 whitespace-pre-wrap">
                    {generatedSql}
                  </pre>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    💡 You can also paste this directly into Cloudflare Dashboard → <strong>D1</strong> → <strong>tesma-db</strong> → <strong>Console</strong> if running offline.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
