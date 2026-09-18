import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Question } from '../types';

interface QuestionPostCardProps {
  question: Question;
}

export const QuestionPostCard: React.FC<QuestionPostCardProps> = ({ question }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(question.likes || 124);
  const [bookmarked, setBookmarked] = useState(false);

  const correctAnswer = question.correctAnswer || question.correct_answer;

  const handleSelectOption = (opt: string) => {
    if (hasAnswered) return;
    setSelectedOption(opt);
    setHasAnswered(true);
    setShowExplanation(true);
  };

  const toggleLike = () => {
    if (liked) {
      setLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  return (
    <article
      id={`post-${question.id}`}
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs mb-5 transition-colors"
    >
      {/* Post Header (User & Hierarchy Tags) */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            {question.subject.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                {question.subject}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium border border-amber-200/60 dark:border-amber-900/60">
                {question.chapter}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {question.topic} • {question.subtopic}
            </p>
          </div>
        </div>

        {question.difficulty && (
          <span
            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
              question.difficulty === 'easy'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                : question.difficulty === 'hard'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
            }`}
          >
            {question.difficulty}
          </span>
        )}
      </header>

      {/* Post Question Body */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-stone-900 dark:text-stone-100 text-sm font-medium leading-relaxed mb-4">
          {question.question}
        </p>

        {question.imageUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800">
            <img
              src={question.imageUrl}
              alt="Question illustration"
              className="w-full h-auto object-cover max-h-72"
              loading="lazy"
            />
          </div>
        )}

        {/* Options Feed */}
        <div className="space-y-2 mb-3">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isSelected = selectedOption === opt;
            const isCorrect = opt === correctAnswer;

            let btnClasses =
              'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 text-stone-800 dark:text-stone-200 hover:bg-amber-50/50 dark:hover:bg-stone-800';

            if (hasAnswered) {
              if (isCorrect) {
                btnClasses =
                  'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500';
              } else if (isSelected && !isCorrect) {
                btnClasses =
                  'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500';
              } else {
                btnClasses =
                  'border-stone-200 dark:border-stone-800 opacity-60 text-stone-600 dark:text-stone-400';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                disabled={hasAnswered}
                className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${btnClasses}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-stone-200/80 dark:bg-stone-700 flex items-center justify-center font-bold text-xs text-stone-700 dark:text-stone-300 shrink-0">
                    {letter}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </div>

                {hasAnswered && (
                  <div className="shrink-0 ml-2">
                    {isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Card */}
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs space-y-1.5 mt-3"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>High-Yield Clinical Explanation</span>
            </div>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              {question.explanation}
            </p>
          </motion.div>
        )}
      </div>

      {/* Social Bar (Like, Comment, Share, Bookmark) */}
      <footer className="flex items-center justify-between px-4 py-2.5 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/40 dark:bg-stone-900/40">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                liked ? 'fill-rose-500 text-rose-500' : 'text-stone-500'
              }`}
            />
            <span className="font-semibold">{likesCount}</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-orange-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-stone-500" />
            <span>{question.commentsCount || 18}</span>
          </button>

          <button
            type="button"
            className="text-stone-500 hover:text-orange-500 transition-colors"
            title="Share Question"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasAnswered && (
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showExplanation ? 'Hide note' : 'Show note'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setBookmarked(!bookmarked)}
            className="text-stone-500 hover:text-amber-500 transition-colors"
            title="Bookmark"
          >
            <Bookmark
              className={`w-4 h-4 ${
                bookmarked ? 'fill-amber-500 text-amber-500' : 'text-stone-500'
              }`}
            />
          </button>
        </div>
      </footer>
    </article>
  );
};
