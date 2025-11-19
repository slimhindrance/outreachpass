"use client";

import { TrendingUp } from 'lucide-react';

interface ComparisonToggleProps {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export function ComparisonToggle({ enabled, setEnabled }: ComparisonToggleProps) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
        className="sr-only peer"
      />
      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
      <span className="ms-3 text-sm font-medium text-gray-700 flex items-center gap-1">
        <TrendingUp className="h-4 w-4" />
        Compare Periods
      </span>
    </label>
  );
}
