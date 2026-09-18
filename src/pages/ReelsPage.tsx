import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Share2,
  Bookmark,
  Sparkles,
  Database,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Lock,
  X,
  ChevronDown,
  Check,
  HelpCircle,
} from 'lucide-react';
import { Question } from '../types';
import { getQuestions } from '../services/questionService';

interface ReelsPageProps {
  onExit?: () => void;
}

export const ReelsPage: React.FC<ReelsPageProps> = ({ onExit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{ [id: string]: string }>({});
  const [bookmarked, setBookmarked] = useState<{ [id: string]: boolean }>({});
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const fetchReels = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getQuestions();
      setQuestions(list);
      setCurrentIndex(0);
    } catch (err: any) {
      setError(err.message || 'Failed to load reels');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();

    const handleUpdate = () => {
      fetchReels();
    };
    window.addEventListener('tesma:questions-updated', handleUpdate);
    return () => window.removeEventListener('tesma:questions-updated', handleUpdate);
  }, []);

  // Update current active index on snap scroll (IG Reels style)
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    if (clientHeight > 0) {
      const newIdx = Math.round(scrollTop / clientHeight);
      if (newIdx >= 0 && newIdx < questions.length && newIdx !== currentIndex) {
        setCurrentIndex(newIdx);
        // Automatically close explanation sheet if user scrolls to another reel
        setIsExplanationOpen(false);
      }
    }
  };

  // Keyboard navigation for desktop IG Reels experience (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < questions.length - 1 && containerRef.current) {
          const nextTop = (currentIndex + 1) * containerRef.current.clientHeight;
          containerRef.current.scrollTo({ top: nextTop, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0 && containerRef.current) {
          const prevTop = (currentIndex - 1) * containerRef.current.clientHeight;
          containerRef.current.scrollTo({ top: prevTop, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (qId: string, opt: string) => {
    if (selectedOptions[qId]) return; // Already answered
    setSelectedOptions((prev) => ({ ...prev, [qId]: opt }));
    // Do NOT open explanation automatically. User must tap the Explanation button.
  };

  const handleExplanationClick = () => {
    if (!currentQ) return;
    const hasAnswered = !!selectedOptions[currentQ.id];
    if (!hasAnswered) {
      showToast('Please answer the question first to unlock the explanation.');
      return;
    }
    setIsExplanationOpen(true);
  };

  const handleShare = async () => {
    if (!currentQ) return;
    const text = `Q: ${currentQ.question}\nSubject: ${currentQ.subject} • ${currentQ.chapter}\n\nStudy on tesma`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'tesma Medical Question',
          text,
          url: window.location.href,
        });
        showToast('Shared successfully!');
        return;
      } catch {
        // Fallback to clipboard if cancelled or not supported
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      showToast('Question copied to clipboard!');
    } catch {
      showToast('Question details ready to share');
    }
  };

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => {
      const next = !prev[id];
      showToast(next ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
      return { ...prev, [id]: next };
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 text-center space-y-3 px-4">
        <RefreshCw className="w-9 h-9 text-orange-500 animate-spin" />
        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
          Loading speed recall reels...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 text-center px-4 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h3 className="font-bold text-stone-800 dark:text-stone-200">Connection Notice</h3>
        <p className="text-xs text-stone-500 max-w-xs">{error}</p>
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Exit
            </button>
          )}
          <button
            type="button"
            onClick={fetchReels}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] w-full bg-stone-50 dark:bg-stone-950 text-center px-4 space-y-4">
        <Database className="w-10 h-10 text-stone-400" />
        <h3 className="font-bold text-stone-800 dark:text-stone-200">No Questions Available</h3>
        <p className="text-xs text-stone-500 max-w-xs">
          No questions found. Upload questions using the Admin Dashboard in Profile.
        </p>
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Back to Home
            </button>
          )}
          <button
            type="button"
            onClick={fetchReels}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const currentAnswered = currentQ ? !!selectedOptions[currentQ.id] : false;
  const isCurrentBookmarked = currentQ ? !!bookmarked[currentQ.id] : false;

  return (
    <div
      id="ig-reels-page-root"
      className="relative w-full h-[100dvh] bg-stone-100 dark:bg-stone-950 overflow-hidden select-none"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-stone-900/90 dark:bg-stone-100/90 text-white dark:text-stone-900 text-xs font-medium backdrop-blur-md shadow-xl max-w-[90vw] text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Minimal Overlay Controls (Instagram Reels Style) */}
      <div className="fixed top-3 left-0 right-0 z-30 max-w-md mx-auto px-4 flex items-center justify-between pointer-events-none">
        {/* Top-left back button */}
        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto w-10 h-10 rounded-full bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border border-stone-200/60 dark:border-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Counter Badge */}
        <div className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border border-stone-200/60 dark:border-stone-800 shadow-sm text-xs font-bold text-stone-800 dark:text-stone-200">
          <span className="text-orange-600 dark:text-orange-400 font-extrabold">
            {currentIndex + 1}
          </span>
          <span className="text-stone-400 dark:text-stone-500 font-normal"> / {questions.length}</span>
        </div>

        {/* Top-right bookmark button */}
        {currentQ && (
          <button
            type="button"
            onClick={() => toggleBookmark(currentQ.id)}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border border-stone-200/60 dark:border-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Bookmark"
          >
            <Bookmark
              className={`w-4 h-4 ${
                isCurrentBookmarked
                  ? 'fill-amber-500 text-amber-500'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            />
          </button>
        )}
      </div>

      {/* IG Reels Vertical Snap-Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full max-w-md mx-auto overflow-y-scroll snap-y snap-mandatory scroll-smooth overscroll-contain no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {questions.map((q, idx) => {
          const selectedOpt = selectedOptions[q.id];
          const hasAnswered = !!selectedOpt;
          const correctAnswer = q.correctAnswer || q.correct_answer;

          return (
            <section
              key={q.id}
              className="w-full h-[100dvh] snap-start snap-always shrink-0 flex flex-col justify-center items-center px-4 pt-16 pb-24 relative"
            >
              <div className="w-full bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between max-h-[72vh] overflow-y-auto">
                {/* Header Category Pills */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-orange-600 dark:text-orange-400 border border-amber-500/20">
                      {q.subject}
                    </span>
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate max-w-[180px]">
                      {q.chapter}
                    </span>
                  </div>

                  {/* Question Stem */}
                  <h2 className="text-stone-900 dark:text-stone-100 font-bold text-sm sm:text-base leading-snug my-2">
                    {q.question}
                  </h2>
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5 my-3">
                  {q.options.map((opt, optIndex) => {
                    const letter = String.fromCharCode(65 + optIndex);
                    const isSelected = selectedOpt === opt;
                    const isCorrect = opt === correctAnswer;

                    let optStyle =
                      'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200 hover:border-amber-400';

                    if (hasAnswered) {
                      if (isCorrect) {
                        optStyle =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold ring-2 ring-emerald-500/40';
                      } else if (isSelected && !isCorrect) {
                        optStyle =
                          'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-semibold ring-2 ring-rose-500/40';
                      } else {
                        optStyle = 'opacity-40 border-stone-200 dark:border-stone-800';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(q.id, opt)}
                        className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${optStyle}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              hasAnswered && isCorrect
                                ? 'bg-emerald-500 text-white'
                                : hasAnswered && isSelected && !isCorrect
                                ? 'bg-rose-500 text-white'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="leading-snug break-words">{opt}</span>
                        </div>

                        {hasAnswered && (
                          <div className="shrink-0 ml-1">
                            {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-rose-500" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Post-answer subtle callout */}
                {hasAnswered ? (
                  <div className="pt-2 text-center text-xs text-stone-500 dark:text-stone-400 flex items-center justify-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Tap "Explanation" below to view clinical rationale</span>
                  </div>
                ) : (
                  <div className="pt-1 text-center text-[11px] text-stone-400 dark:text-stone-500">
                    Select an option to test your recall
                  </div>
                )}
              </div>

              {/* Scroll Down Hint for first few reels */}
              {idx < questions.length - 1 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    Swipe up
                  </span>
                  <ChevronDown className="w-4 h-4 text-stone-500 animate-bounce" />
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* FIXED BOTTOM BAR (Instagram Reels Style with Explanation & Share) */}
      <footer
        id="reels-fixed-bottom-bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border-t border-stone-200/80 dark:border-stone-800 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      >
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Exit / Back button */}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
              title="Return to navigation"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit</span>
            </button>
          )}

          {/* Explanation Button (Active only after answering) */}
          <button
            type="button"
            id="reels-explanation-button"
            onClick={handleExplanationClick}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer select-none ${
              currentAnswered
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-orange-500/25 hover:from-amber-600 hover:to-orange-600 active:scale-98 animate-pulse'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border border-stone-200/60 dark:border-stone-700/60'
            }`}
          >
            {currentAnswered ? (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>View Explanation</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 opacity-60" />
                <span>Explanation (Answer First)</span>
              </>
            )}
          </button>

          {/* Share Button */}
          <button
            type="button"
            id="reels-share-button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 transition-all cursor-pointer"
            title="Share Reel"
          >
            <Share2 className="w-4 h-4 text-orange-500" />
            <span>Share</span>
          </button>
        </div>
      </footer>

      {/* EXPLANATION BOTTOM DRAWER / MODAL */}
      <AnimatePresence>
        {isExplanationOpen && currentQ && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
            {/* Backdrop click dismiss */}
            <div
              className="absolute inset-0"
              onClick={() => setIsExplanationOpen(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 rounded-t-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
            >
              {/* Drag Pill Handle */}
              <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-4" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Clinical Explanation
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      {currentQ.subject} • {currentQ.chapter}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExplanationOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Correct Answer Highlight Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 mb-4 flex items-start gap-2.5">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                    Correct Answer
                  </span>
                  <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                    {currentQ.correctAnswer || currentQ.correct_answer}
                  </span>
                </div>
              </div>

              {/* Rationale Content */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Clinical Rationale & High-Yield Learning</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-amber-50/50 dark:bg-stone-800/50 p-4 rounded-2xl border border-amber-200/50 dark:border-stone-800">
                  {currentQ.explanation || 'No detailed rationale available for this question.'}
                </p>
              </div>

              {/* Close & Continue Action */}
              <button
                type="button"
                onClick={() => setIsExplanationOpen(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer"
              >
                Got it, Continue Scrolling
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
