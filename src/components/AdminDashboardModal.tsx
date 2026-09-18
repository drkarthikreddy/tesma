import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Key,
  Server,
  Sparkles,
  ExternalLink,
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
  const [activeTab, setActiveTab] = useState<'connection' | 'upload'>('connection');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Cloudflare D1 Credentials state
  const [accountId, setAccountId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showApiToken, setShowApiToken] = useState(false);
  const [databaseId, setDatabaseId] = useState('9e692809-14a5-4076-b4dd-79e1fe03bc7f');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{
    success?: boolean;
    text?: string;
  } | null>(null);

  // Status & Health
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    isConfigured?: boolean;
    status?: string;
    databaseId?: string;
    totalQuestions?: number;
    message?: string;
    error?: string;
  } | null>(null);

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

  // Quick actions
  const [isSeeding, setIsSeeding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Load existing configuration status on modal open
  const fetchStatus = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthStatus(data);

      const cfgRes = await fetch('/api/config/cloudflare');
      const cfgData = await cfgRes.json();
      if (cfgData.rawAccountId && !accountId) {
        setAccountId(cfgData.rawAccountId);
      }
      if (cfgData.databaseId) {
        setDatabaseId(cfgData.databaseId);
      }
    } catch {
      // ignore
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchStatus();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Credentials: adminnn@123 / 0987poiu
    if (email.trim() === 'adminnn@123' && password.trim() === '0987poiu') {
      setIsAuthenticated(true);
      localStorage.setItem('tesma_admin_auth', 'true');
      fetchStatus();
    } else {
      setLoginError('Invalid credentials. Please use adminnn@123 / 0987poiu');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tesma_admin_auth');
    setEmail('');
    setPassword('');
    setUploadStatus(null);
    setGeneratedSql(null);
    setConfigMessage(null);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId.trim() || !apiToken.trim()) {
      setConfigMessage({
        success: false,
        text: 'Please enter both Cloudflare Account ID and Cloudflare API Token.',
      });
      return;
    }

    setIsSavingConfig(true);
    setConfigMessage(null);

    try {
      const res = await fetch('/api/config/cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId.trim(),
          apiToken: apiToken.trim(),
          databaseId: databaseId.trim(),
        }),
      });

      const data = await res.json();

      if (data.connected) {
        setConfigMessage({
          success: true,
          text: `Connected to Cloudflare D1 SQL successfully! Database currently holds ${data.count} questions.`,
        });
        window.dispatchEvent(new CustomEvent('tesma:questions-updated'));
      } else if (data.tableMissing) {
        setConfigMessage({
          success: false,
          text: 'Credentials verified! However, the "questions" table is not created yet. Click "Initialize D1 Table" below.',
        });
      } else {
        setConfigMessage({
          success: false,
          text: data.message || data.error || 'Connection failed. Please check credentials.',
        });
      }
      fetchStatus();
    } catch (err: any) {
      setConfigMessage({
        success: false,
        text: err.message || 'Error communicating with server.',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleInitializeTable = async () => {
    setIsInitializing(true);
    setConfigMessage(null);
    try {
      const res = await fetch('/api/database/init', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setConfigMessage({
          success: true,
          text: 'Cloudflare D1 SQL "questions" table initialized successfully!',
        });
        fetchStatus();
      } else {
        setConfigMessage({ success: false, text: data.error || 'Initialization failed' });
      }
    } catch (err: any) {
      setConfigMessage({ success: false, text: err.message });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSeedCurriculum = async () => {
    setIsSeeding(true);
    setConfigMessage(null);
    try {
      const res = await fetch('/api/database/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setConfigMessage({
          success: true,
          text: `Successfully seeded ${data.seededCount} high-yield medical questions into Cloudflare D1 SQL!`,
        });
        window.dispatchEvent(new CustomEvent('tesma:questions-updated'));
        fetchStatus();
        if (onSuccess) onSuccess();
      } else {
        setConfigMessage({ success: false, text: data.error || 'Seeding failed' });
      }
    } catch (err: any) {
      setConfigMessage({ success: false, text: err.message });
    } finally {
      setIsSeeding(false);
    }
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

      let sanitized = cleanInput;
      if (sanitized.startsWith('const ') || sanitized.startsWith('let ') || sanitized.startsWith('var ')) {
        sanitized = sanitized.replace(/^(const|let|var)\s+[\w$]+\s*=\s*/, '').replace(/;\s*$/, '');
      }

      try {
        parsedData = JSON.parse(sanitized);
      } catch {
        // eslint-disable-next-line no-new-func
        const fn = new Function(`return (${sanitized});`);
        parsedData = fn();
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error('Data must be a non-empty array of question objects.');
      }

      const sqlCode = generateD1SqlStatements(parsedData);
      setGeneratedSql(sqlCode);

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
        } catch {}
        throw new Error(errDetail);
      }

      const resJson = await response.json();

      setUploadStatus({
        success: true,
        count: parsedData.length,
        message: `Successfully executed batch INSERT of ${resJson.uploadedCount || parsedData.length} questions directly into Cloudflare D1 SQL!`,
      });

      window.dispatchEvent(new CustomEvent('tesma:questions-updated'));
      setJsInput('');
      fetchStatus();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setUploadStatus({
        success: false,
        message: `D1 Upload note: ${err.message || 'Error executing batch'}. You can also copy the generated SQL below.`,
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
                Admin Console
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isAuthenticated ? 'Cloudflare D1 SQL (tesma-db)' : 'Authentication Required'}
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
                Sign in with your admin credentials to configure Cloudflare D1 SQL credentials and manage tables.
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
                    Admin Email
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

              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700/60 text-xs text-stone-500 flex items-center justify-between">
                <span>Default credentials:</span>
                <span className="font-mono text-stone-700 dark:text-stone-300">adminnn@123 / 0987poiu</span>
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
            /* Authenticated Admin View */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex border-b border-stone-200 dark:border-stone-800 pb-1 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('connection')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'connection'
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>D1 API Credentials</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'upload'
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Batch Upload Questions</span>
                </button>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${healthStatus?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      Cloudflare D1: {healthStatus?.databaseId?.slice(0, 8)}...
                    </span>
                    <div className="text-[11px] text-stone-500">
                      {healthStatus?.status === 'ok'
                        ? `${healthStatus?.totalQuestions || 0} Questions Live`
                        : healthStatus?.message || 'Awaiting connection'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchStatus}
                  disabled={healthLoading}
                  className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* TAB 1: Credentials & Configuration */}
              {activeTab === 'connection' && (
                <div className="space-y-4">
                  <form onSubmit={handleSaveCredentials} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                          <Server className="w-3.5 h-3.5 text-orange-500" />
                          Cloudflare Account ID
                        </label>
                        <a
                          href="https://dash.cloudflare.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                        >
                          Find in Dash <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <input
                        type="text"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        placeholder="e.g. 7f89d42ab123cde456..."
                        required
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                          <Key className="w-3.5 h-3.5 text-orange-500" />
                          Cloudflare API Token
                        </label>
                        <a
                          href="https://dash.cloudflare.com/profile/api-tokens"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
                        >
                          Create Token <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showApiToken ? 'text' : 'password'}
                          value={apiToken}
                          onChange={(e) => setApiToken(e.target.value)}
                          placeholder="••••••••••••••••••••••••••••••••"
                          required
                          className="w-full pl-3 pr-9 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiToken(!showApiToken)}
                          className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                        >
                          {showApiToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Permissions required: <code>Account - D1 - Edit</code>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Target D1 Database ID
                      </label>
                      <input
                        type="text"
                        value={databaseId}
                        onChange={(e) => setDatabaseId(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/40 text-stone-600 dark:text-stone-300"
                      />
                    </div>

                    {configMessage && (
                      <div
                        className={`flex items-start gap-2 p-3 text-xs rounded-xl border ${
                          configMessage.success
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                        }`}
                      >
                        {configMessage.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        )}
                        <span>{configMessage.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{isSavingConfig ? 'Testing Connection...' : 'Save & Connect to Cloudflare D1'}</span>
                    </button>
                  </form>

                  {/* Quick Maintenance Actions */}
                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Cloudflare D1 Table Utilities
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleInitializeTable}
                        disabled={isInitializing}
                        className="py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isInitializing ? 'Creating...' : 'Initialize Table'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSeedCurriculum}
                        disabled={isSeeding}
                        className="py-2 px-3 rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isSeeding ? 'Seeding...' : 'Seed Questions'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Batch Upload */}
              {activeTab === 'upload' && (
                <div className="space-y-3" id="admin-upload-section">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-orange-500" />
                      Paste JSON Questions Array:
                    </span>
                    <button
                      type="button"
                      onClick={() => setJsInput(sampleTemplate)}
                      className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Load Template
                    </button>
                  </div>

                  <textarea
                    id="admin-js-questions-input"
                    value={jsInput}
                    onChange={(e) => setJsInput(e.target.value)}
                    placeholder="[ { &quot;subject&quot;: &quot;Anatomy&quot;, &quot;chapter&quot;: &quot;Cardiovascular&quot;, ... } ]"
                    rows={7}
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
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Executing Batch Insert...' : 'Insert into Cloudflare D1 SQL'}</span>
                  </button>

                  {/* Generated SQL queries section */}
                  {generatedSql && (
                    <div className="pt-2 space-y-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          Compiled SQL for Cloudflare Console:
                        </span>
                        <button
                          type="button"
                          onClick={copySqlToClipboard}
                          className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                        </button>
                      </div>

                      <pre className="p-2.5 max-h-32 overflow-y-auto text-[10px] font-mono bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-300 rounded-xl border border-stone-200 dark:border-stone-800 whitespace-pre-wrap">
                        {generatedSql}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
