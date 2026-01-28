'use client';

import { Bike, MapPin } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
            <Bike className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)] leading-tight">
              Stay Singletrack
            </h1>
            <p className="text-xs text-[var(--foreground-muted)] hidden sm:block">
              Colorado Trail Conditions
            </p>
          </div>
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--foreground-muted)]">
            <MapPin className="w-4 h-4" />
            <span>Front Range, CO</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
