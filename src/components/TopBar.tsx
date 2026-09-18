import React, { useState } from 'react';
import { Search, ShoppingCart, X } from 'lucide-react';

interface TopBarProps {
  cartCount?: number;
  onCartClick?: () => void;
  onSearch?: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  cartCount = 0,
  onCartClick,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <header
      id="top-bar"
      className="sticky top-0 z-40 w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-amber-200/60 dark:border-stone-800 shadow-[0_2px_10px_rgba(245,158,11,0.05)] transition-colors duration-200"
    >
      <div className="max-w-md mx-auto px-3.5 h-14 flex items-center justify-between gap-2.5">
        {/* Left Corner: 't' logo and 'tesma' name */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            id="tesma-t-logo"
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-orange-500/25 select-none"
          >
            t
          </div>
          <span
            id="tesma-brand-name"
            className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent select-none hidden sm:inline font-sans"
          >
            tesma
          </span>
          {/* Mobile small screen label if very tight */}
          <span className="text-base font-extrabold tracking-tight text-orange-600 dark:text-orange-400 select-none sm:hidden font-sans">
            tesma
          </span>
        </div>

        {/* Middle: Search Bar */}
        <div className="flex-1 min-w-0 max-w-xs relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-amber-500/70 dark:text-stone-400 pointer-events-none" />
            <input
              id="top-search-input"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search questions, topics..."
              className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm bg-amber-50/60 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-full border border-amber-200/80 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Corner: Cart Icon */}
        <div className="shrink-0 flex items-center">
          <button
            id="top-cart-btn"
            type="button"
            aria-label="Shopping Cart"
            onClick={onCartClick}
            className="relative p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors focus:outline-none"
          >
            <ShoppingCart className="w-5 h-5" strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-orange-500 text-white shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
