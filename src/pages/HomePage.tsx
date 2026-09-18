import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, BookOpen, Sparkles, Filter, Database, AlertCircle } from 'lucide-react';
import { Question } from '../types';
import { getQuestions } from '../services/questionService';
import { QuestionPostCard } from '../components/QuestionPostCard';

export const HomePage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuestions();
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('tesma:questions-updated', handleUpdate);
    return () => window.removeEventListener('tesma:questions-updated', handleUpdate);
  }, []);

  const subjects = ['All', ...Array.from(new Set(questions.map((q) => q.subject)))];

  const filteredQuestions =
    selectedSubject === 'All'
      ? questions
      : questions.filter((q) => q.subject === selectedSubject);

  return (
    <div id="home-page" className="max-w-md mx-auto px-4 pt-4 pb-12 space-y-4">
      {/* Top Feed Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        <div className="flex items-center gap-1.5 text-xs text-stone-500 shrink-0 font-medium px-1">
          <Filter className="w-3.5 h-3.5 text-orange-500" />
          <span>Feed:</span>
        </div>
        {subjects.map((sub) => (
          <button
            key={sub}
            type="button"
            onClick={() => setSelectedSubject(sub)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedSubject === sub
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Loading questions...
          </p>
        </div>
      ) : error ? (
        /* Connection error notice */
        <div className="py-14 text-center space-y-3 bg-white dark:bg-stone-900 rounded-2xl p-6 border border-rose-200 dark:border-rose-900/60">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
            Unable to Connect
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
            {error}. Check your network or reload questions.
          </p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : filteredQuestions.length === 0 ? (
        /* Empty state */
        <div className="py-16 text-center space-y-3 bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800">
          <Database className="w-10 h-10 text-stone-400 mx-auto" />
          <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
            No Questions Available
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
            No questions found. Use the Admin Dashboard in your Profile tab to upload question batches.
          </p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      ) : (
        /* Question Posts Feed */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {filteredQuestions.map((q) => (
            <QuestionPostCard key={q.id} question={q} />
          ))}

          <div className="text-center py-4 text-xs text-stone-400 dark:text-stone-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Updated live from question bank.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
