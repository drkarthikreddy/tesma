import React from 'react';
import { Home, BookOpen, Film, User } from 'lucide-react';
import { motion } from 'motion/react';
import { TabType } from '../types';

interface BottomBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'qbank', label: 'QBank', icon: BookOpen },
  { id: 'reels', label: 'Reels', icon: Film },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomBar: React.FC<BottomBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-amber-200/60 dark:border-stone-800 shadow-[0_-4px_20px_rgba(249,115,22,0.06)]"
    >
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              type="button"
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center w-16 py-1 transition-colors duration-200 focus:outline-none select-none"
            >
              {/* Active Indicator Highlight */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -top-1 w-10 h-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <div
                className={`flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40'
                    : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
                }`}
              >
                <Icon
                  className="w-5 h-5 transition-transform duration-200"
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
              </div>

              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 transition-colors duration-200 ${
                  isActive
                    ? 'text-orange-600 dark:text-orange-400 font-semibold'
                    : 'text-stone-400 dark:text-stone-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
