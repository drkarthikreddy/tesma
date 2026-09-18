import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  FolderTree,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Database,
  AlertCircle,
} from 'lucide-react';
import { Question } from '../types';
import { getQuestions } from '../services/questionService';

type HierarchyLevel = 'subjects' | 'chapters' | 'topics' | 'subtopics' | 'questions';

export const QBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active navigation state
  const [currentLevel, setCurrentLevel] = useState<HierarchyLevel>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  // Question solving state
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: string }>({});
  const [revealedNotes, setRevealedNotes] = useState<{ [qId: string]: boolean }>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getQuestions();
      setQuestions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load QBank hierarchy');
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

  // 1. Unique Subjects from Question Bank
  const subjects = Array.from(new Set(questions.map((q) => q.subject))).sort();

  // 2. Chapters for selected Subject
  const chapters = selectedSubject
    ? Array.from(
        new Set(
          questions
            .filter((q) => q.subject === selectedSubject)
            .map((q) => q.chapter)
        )
      ).sort()
    : [];

  // 3. Topics for selected Chapter
  const topics =
    selectedSubject && selectedChapter
      ? Array.from(
          new Set(
            questions
              .filter(
                (q) =>
                  q.subject === selectedSubject && q.chapter === selectedChapter
              )
              .map((q) => q.topic)
          )
        ).sort()
      : [];

  // 4. Subtopics for selected Topic
  const subtopics =
    selectedSubject && selectedChapter && selectedTopic
      ? Array.from(
          new Set(
            questions
              .filter(
                (q) =>
                  q.subject === selectedSubject &&
                  q.chapter === selectedChapter &&
                  q.topic === selectedTopic
              )
              .map((q) => q.subtopic)
          )
        ).sort()
      : [];

  // 5. Questions matching the complete 4-level filter
  const activeQuestions =
    selectedSubject && selectedChapter && selectedTopic && selectedSubtopic
      ? questions.filter(
          (q) =>
            q.subject === selectedSubject &&
            q.chapter === selectedChapter &&
            q.topic === selectedTopic &&
            q.subtopic === selectedSubtopic
        )
      : [];

  const handleSelectSubject = (s: string) => {
    setSelectedSubject(s);
    setCurrentLevel('chapters');
  };

  const handleSelectChapter = (c: string) => {
    setSelectedChapter(c);
    setCurrentLevel('topics');
  };

  const handleSelectTopic = (t: string) => {
    setSelectedTopic(t);
    setCurrentLevel('subtopics');
  };

  const handleSelectSubtopic = (sub: string) => {
    setSelectedSubtopic(sub);
    setCurrentLevel('questions');
    setActiveQuestionIndex(0);
  };

  const handleBack = () => {
    if (currentLevel === 'questions') {
      setCurrentLevel('subtopics');
    } else if (currentLevel === 'subtopics') {
      setCurrentLevel('topics');
      setSelectedTopic(null);
    } else if (currentLevel === 'topics') {
      setCurrentLevel('chapters');
      setSelectedChapter(null);
    } else if (currentLevel === 'chapters') {
      setCurrentLevel('subjects');
      setSelectedSubject(null);
    }
  };

  const handleSelectOption = (qId: string, opt: string) => {
    if (userAnswers[qId]) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: opt }));
    setRevealedNotes((prev) => ({ ...prev, [qId]: true }));
  };

  return (
    <div id="qbank-container" className="max-w-md mx-auto px-4 py-4 pb-20 space-y-4">
      {/* Hierarchy Breadcrumb Banner */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <FolderTree className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              QBank 4-Level Curriculum
            </h2>
          </div>

          {currentLevel !== 'subjects' && (
            <button
              type="button"
              onClick={handleBack}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
          <span
            onClick={() => {
              setCurrentLevel('subjects');
              setSelectedSubject(null);
              setSelectedChapter(null);
              setSelectedTopic(null);
              setSelectedSubtopic(null);
            }}
            className="hover:underline cursor-pointer font-medium text-stone-700 dark:text-stone-300"
          >
            Subjects
          </span>
          {selectedSubject && (
            <>
              <ChevronRight className="w-3 h-3 text-stone-400" />
              <span
                onClick={() => {
                  setCurrentLevel('chapters');
                  setSelectedChapter(null);
                  setSelectedTopic(null);
                  setSelectedSubtopic(null);
                }}
                className="hover:underline cursor-pointer font-medium text-orange-600 dark:text-orange-400"
              >
                {selectedSubject}
              </span>
            </>
          )}
          {selectedChapter && (
            <>
              <ChevronRight className="w-3 h-3 text-stone-400" />
              <span
                onClick={() => {
                  setCurrentLevel('topics');
                  setSelectedTopic(null);
                  setSelectedSubtopic(null);
                }}
                className="hover:underline cursor-pointer font-medium text-stone-700 dark:text-stone-300 truncate max-w-[100px]"
              >
                {selectedChapter}
              </span>
            </>
          )}
          {selectedTopic && (
            <>
              <ChevronRight className="w-3 h-3 text-stone-400" />
              <span
                onClick={() => {
                  setCurrentLevel('subtopics');
                  setSelectedSubtopic(null);
                }}
                className="hover:underline cursor-pointer font-medium text-stone-700 dark:text-stone-300 truncate max-w-[100px]"
              >
                {selectedTopic}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-xs text-stone-500">Loading curriculum hierarchy...</p>
        </div>
      ) : error ? (
        <div className="py-14 text-center space-y-3 bg-white dark:bg-stone-900 rounded-2xl p-6 border border-rose-200 dark:border-rose-900/60">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
            Connection Notice
          </h4>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
          <Database className="w-10 h-10 text-stone-400 mx-auto" />
          <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">
            No Questions in Database
          </h4>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Your question database currently has 0 questions. Use the Admin Dashboard in Profile to upload question batches.
          </p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LEVEL 1: Subjects List */}
          {currentLevel === 'subjects' && (
            <motion.div
              key="level-subjects"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2.5"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Select Subject ({subjects.length})
                </span>
              </div>
              {subjects.map((sub) => {
                const count = questions.filter((q) => q.subject === sub).length;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSelectSubject(sub)}
                    className="w-full bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-orange-400 dark:hover:border-orange-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {sub}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {count} {count === 1 ? 'question' : 'questions'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-orange-500 transition-colors" />
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* LEVEL 2: Chapters List */}
          {currentLevel === 'chapters' && (
            <motion.div
              key="level-chapters"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2.5"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1">
                {selectedSubject} Chapters ({chapters.length})
              </span>
              {chapters.map((chap) => {
                const count = questions.filter(
                  (q) => q.subject === selectedSubject && q.chapter === chap
                ).length;
                return (
                  <button
                    key={chap}
                    type="button"
                    onClick={() => handleSelectChapter(chap)}
                    className="w-full bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between hover:border-orange-400 dark:hover:border-orange-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-xs">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                          {chap}
                        </h4>
                        <p className="text-xs text-stone-500">{count} questions</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-orange-500" />
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* LEVEL 3: Topics List */}
          {currentLevel === 'topics' && (
            <motion.div
              key="level-topics"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2.5"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1">
                Topics ({topics.length})
              </span>
              {topics.map((top) => (
                <button
                  key={top}
                  type="button"
                  onClick={() => handleSelectTopic(top)}
                  className="w-full bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between hover:border-orange-400 transition-all text-left cursor-pointer"
                >
                  <span className="font-medium text-sm text-stone-900 dark:text-stone-100">
                    {top}
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              ))}
            </motion.div>
          )}

          {/* LEVEL 4: Subtopics List */}
          {currentLevel === 'subtopics' && (
            <motion.div
              key="level-subtopics"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2.5"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 px-1">
                Subtopics ({subtopics.length})
              </span>
              {subtopics.map((sub) => {
                const count = questions.filter(
                  (q) =>
                    q.subject === selectedSubject &&
                    q.chapter === selectedChapter &&
                    q.topic === selectedTopic &&
                    q.subtopic === sub
                ).length;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleSelectSubtopic(sub)}
                    className="w-full bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between hover:border-orange-400 transition-all text-left cursor-pointer group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                        {sub}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {count} questions ready
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-orange-500" />
                  </button>
                );
              })}
            </motion.div>
          )}

          {/* LEVEL 5: Question Interactive Practice Engine */}
          {currentLevel === 'questions' && (
            <motion.div
              key="level-questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {activeQuestions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <p className="text-xs text-stone-500">
                    No questions found for this specific subtopic branch.
                  </p>
                </div>
              ) : (
                (() => {
                  const q = activeQuestions[activeQuestionIndex];
                  const userAnswer = userAnswers[q.id];
                  const hasAnswered = !!userAnswer;
                  const correctAnswer = q.correctAnswer || q.correct_answer;

                  return (
                    <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                      {/* Subtopic Header & Question Progress */}
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-100 dark:border-stone-800">
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {q.subtopic}
                        </span>
                        <span className="font-semibold text-stone-500">
                          Q {activeQuestionIndex + 1} of {activeQuestions.length}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-relaxed">
                        {q.question}
                      </p>

                      {/* Options */}
                      <div className="space-y-2">
                        {q.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const isSelected = userAnswer === opt;
                          const isCorrect = opt === correctAnswer;

                          let btnStyle =
                            'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 text-stone-800 dark:text-stone-200 hover:border-amber-400';

                          if (hasAnswered) {
                            if (isCorrect) {
                              btnStyle =
                                'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500';
                            } else if (isSelected && !isCorrect) {
                              btnStyle =
                                'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500';
                            } else {
                              btnStyle = 'opacity-50 border-stone-200 dark:border-stone-800';
                            }
                          }

                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={hasAnswered}
                              onClick={() => handleSelectOption(q.id, opt)}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-md bg-stone-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs text-stone-700 dark:text-stone-300 shrink-0">
                                  {letter}
                                </span>
                                <span>{opt}</span>
                              </div>

                              {hasAnswered && (
                                <div className="shrink-0 ml-2">
                                  {isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  )}
                                  {isSelected && !isCorrect && (
                                    <XCircle className="w-4 h-4 text-rose-500" />
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Note */}
                      {hasAnswered && revealedNotes[q.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                            <span>Comprehensive Explanation</span>
                          </div>
                          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                            {q.explanation}
                          </p>
                        </motion.div>
                      )}

                      {/* Question Navigation Controls */}
                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                        <button
                          type="button"
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-30 hover:bg-stone-200 cursor-pointer"
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          disabled={activeQuestionIndex === activeQuestions.length - 1}
                          onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                          className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-30 shadow-xs hover:from-amber-600 cursor-pointer"
                        >
                          Next Question
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
