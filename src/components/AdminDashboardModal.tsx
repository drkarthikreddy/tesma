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
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
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
  };

  const parseAndUploadQuestions = async () => {
    if (!jsInput.trim()) {
      setUploadStatus({ success: false, message: 'Please paste your JS/JSON questions array first.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      // Safely parse JS object array or JSON array
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
        throw new Error('Data must be a non-empty array of questions.');
      }

      // Save to local storage for immediate preview fallback
      const existing = JSON.parse(localStorage.getItem('tesma_questions') || '[]');
      const merged = [...existing, ...parsedData];
      localStorage.setItem('tesma_questions', JSON.stringify(merged));

      // Attempt sync to Cloudflare Worker / D1 SQL endpoint
      let apiSuccessMessage = '';
      try {
        const res = await fetch('/api/questions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: parsedData }),
        });

        if (res.ok) {
          const json = await res.json();
          apiSuccessMessage = ` and synced to Cloudflare D1 (${json.uploadedCount || parsedData.length} records)`;
        }
      } catch {
        apiSuccessMessage = ' (saved locally in browser storage; ready for D1 export)';
      }

      setUploadStatus({
        success: true,
        count: parsedData.length,
        message: `Successfully uploaded ${parsedData.length} questions${apiSuccessMessage}!`,
      });
      setJsInput('');
    } catch (err: any) {
      setUploadStatus({
        success: false,
        message: `Parse/Upload Error: ${err.message || 'Invalid format'}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const sampleTemplate = `[
  {
    "id": "q_${Date.now()}",
    "subject": "Anatomy",
    "chapter": "Cardiovascular",
    "topic": "Coronary Circulation",
    "subtopic": "Right Coronary Artery",
    "question": "Which artery supplies the SA node in ~60% of people?",
    "options": ["Right Coronary Artery", "LAD", "Left Circumflex", "Marginal Artery"],
    "correctAnswer": "Right Coronary Artery",
    "explanation": "The SA nodal branch arises from the RCA in majority of individuals."
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
                {isAuthenticated ? 'Cloudflare D1 SQL Upload' : 'Authentication Required'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg leading-none p-1"
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
                Please log in with your administrative credentials to manage questions and Cloudflare D1.
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
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
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
                  Paste JS / JSON Question Array:
                </span>
                <button
                  type="button"
                  onClick={() => setJsInput(sampleTemplate)}
                  className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
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
    subject: 'Anatomy',
    chapter: 'Cardiovascular',
    topic: 'Coronary Arteries',
    subtopic: 'SA Node Supply',
    question: '...',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: '...'
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
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  {uploadStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
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
                <span>{isUploading ? 'Uploading to D1...' : 'Upload Questions to Database'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
