import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { HomePage } from './pages/HomePage';
import { QBankPage } from './pages/QBankPage';
import { ReelsPage } from './pages/ReelsPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [cartCount, setCartCount] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tesma-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tesma-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tesma-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      if (e.detail?.tab) setActiveTab(e.detail.tab);
    };
    window.addEventListener('tesma:switch-tab', handleSwitchTab);
    return () => window.removeEventListener('tesma:switch-tab', handleSwitchTab);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-200 flex flex-col">
      {/* Top Bar: hidden when in Reels mode */}
      {activeTab !== 'reels' && (
        <TopBar
          cartCount={cartCount}
          onCartClick={() => setCartCount((prev) => (prev > 0 ? 0 : 1))}
        />
      )}

      {/* Active Tab Page Content */}
      <main className={activeTab === 'reels' ? 'flex-1 w-full h-[100dvh] overflow-hidden' : 'flex-1 w-full pb-20'}>
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'qbank' && <QBankPage />}
        {activeTab === 'reels' && <ReelsPage onExit={() => setActiveTab('home')} />}
        {activeTab === 'profile' && (
          <ProfilePage
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        )}
      </main>

      {/* 4-Icon Bottom Navigation Bar: hidden in Reels mode in favor of fixed Reels bar */}
      {activeTab !== 'reels' && (
        <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
}
