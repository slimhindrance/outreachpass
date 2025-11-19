"use client";

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonBadgeProps {
  currentValue: number;
  previousValue: number;
  format?: 'number' | 'percentage';
}

export function ComparisonBadge({
  currentValue,
  previousValue,
  format = 'number'
}: ComparisonBadgeProps) {
  // Handle division by zero
  if (previousValue === 0) {
    if (currentValue === 0) {
      return (
        <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          <Minus className="h-3 w-3 mr-1" />
          No change
        </div>
      );
    }
    return (
      <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <TrendingUp className="h-3 w-3 mr-1" />
        New data
      </div>
    );
  }

  const change = currentValue - previousValue;
  const percentChange = (change / previousValue) * 100;

  const isIncrease = change > 0;
  const isDecrease = change < 0;
  const noChange = change === 0;

  if (noChange) {
    return (
      <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
        <Minus className="h-3 w-3 mr-1" />
        0%
      </div>
    );
  }

  const displayValue = format === 'percentage'
    ? `${Math.abs(change).toFixed(1)}pp`  // percentage points
    : `${Math.abs(percentChange).toFixed(1)}%`;

  if (isIncrease) {
    return (
      <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{displayValue}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
      <TrendingDown className="h-3 w-3 mr-1" />
      {displayValue}
    </div>
  );
}

export function ComparisonText({
  currentValue,
  previousValue,
}: {
  currentValue: number;
  previousValue: number;
}) {
  if (previousValue === 0) {
    return <span className="text-xs text-gray-500">vs. 0 previous</span>;
  }

  return (
    <span className="text-xs text-gray-500">
      vs. {previousValue.toLocaleString()} previous
    </span>
  );
}
