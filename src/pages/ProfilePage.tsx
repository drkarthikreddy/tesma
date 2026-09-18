import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Moon,
  Sun,
  Bell,
  Database,
  BookMarked,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { AdminDashboardModal } from '../components/AdminDashboardModal';

interface ProfilePageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ darkMode, onToggleDarkMode }) => {
  const [notifications, setNotifications] = useState(true);
  const [autoNext, setAutoNext] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <motion.main
      id="profile-page-container"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="max-w-md mx-auto px-4 py-6 pb-24 space-y-5"
    >
      {/* Student Profile Card */}
      <div
        id="profile-header-card"
        className="bg-white dark:bg-stone-800/90 rounded-2xl p-5 border border-amber-200/70 dark:border-stone-700/80 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-orange-500/20">
            MS
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 truncate">
              Medical Student
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-orange-500" />
              <span>MBBS / USMLE Candidate</span>
            </div>
            <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 font-medium">
              tesma Free Tier
            </span>
          </div>
        </div>
      </div>

      {/* Settings Section: Appearance & Dark Mode */}
      <div className="bg-white dark:bg-stone-800/90 rounded-2xl p-4 border border-amber-200/70 dark:border-stone-700/80 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-1">
          Appearance
        </h3>

        {/* Dark Mode Switch */}
        <div
          id="dark-mode-toggle-row"
          className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-stone-900/60 border border-amber-100 dark:border-stone-700/60"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-stone-700 flex items-center justify-center text-orange-600 dark:text-orange-400">
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Dark Mode
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {darkMode ? 'Night theme enabled' : 'Yellow & orange day theme'}
              </div>
            </div>
          </div>

          <button
            id="toggle-dark-mode-btn"
            type="button"
            role="switch"
            aria-checked={darkMode}
            onClick={onToggleDarkMode}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              darkMode ? 'bg-orange-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-6 shadow-sm' : 'translate-x-1 shadow-xs'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Settings Section: Study & QBank Preferences */}
      <div className="bg-white dark:bg-stone-800/90 rounded-2xl p-4 border border-amber-200/70 dark:border-stone-700/80 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-1">
          Normal Settings
        </h3>

        {/* Study Notifications */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-stone-700/70 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Daily Study Reminder
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Practice alerts for questions
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={notifications}
            onClick={() => setNotifications(!notifications)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              notifications ? 'bg-orange-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-6 shadow-sm' : 'translate-x-1 shadow-xs'
              }`}
            />
          </button>
        </div>

        {/* Auto Advance */}
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-stone-700/70 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Auto-Advance Questions
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Auto-scroll upon answering
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoNext}
            onClick={() => setAutoNext(!autoNext)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              autoNext ? 'bg-orange-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                autoNext ? 'translate-x-6 shadow-sm' : 'translate-x-1 shadow-xs'
              }`}
            />
          </button>
        </div>

        {/* Database & Cloudflare SQL Connection */}
        <div
          id="cloudflare-sql-info-row"
          onClick={() => setShowAdminModal(true)}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-stone-700/70 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Cloudflare SQL Tables
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                D1 Database linked (tesma-db)
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400" />
        </div>

        {/* Admin Dashboard Access Button */}
        <div
          id="admin-dashboard-btn"
          onClick={() => setShowAdminModal(true)}
          className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 dark:bg-orange-500/15 dark:hover:bg-orange-500/20 border border-amber-300/60 dark:border-orange-500/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>Admin Dashboard</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-500 text-white">
                  Admin
                </span>
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Upload & manage QBank questions
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-orange-500" />
        </div>
      </div>

      {/* App Info Footer */}
      <div className="text-center pt-2">
        <p className="text-xs text-stone-400 dark:text-stone-500">
          tesma v1.0.0 • Medical Education Platform
        </p>
      </div>

      {/* Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </motion.main>
  );
};
