"use client";

import { Calendar } from 'lucide-react';
import { useState } from 'react';

interface DateRangePickerProps {
  dateMode: 'preset' | 'custom';
  setDateMode: (mode: 'preset' | 'custom') => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}

export function DateRangePicker({
  dateMode,
  setDateMode,
  dateRange,
  setDateRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: DateRangePickerProps) {
  // Validate that end date is not before start date
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    if (value >= startDate) {
      setEndDate(value);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Calculate default start date (30 days ago)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];

  // Set defaults when switching to custom mode
  const handleModeChange = (mode: 'preset' | 'custom') => {
    setDateMode(mode);
    if (mode === 'custom' && !startDate && !endDate) {
      setStartDate(defaultStartDate);
      setEndDate(today);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Calendar className="h-5 w-5 text-gray-400" />

      {/* Mode Selector */}
      <select
        value={dateMode}
        onChange={(e) => handleModeChange(e.target.value as 'preset' | 'custom')}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-white text-sm"
      >
        <option value="preset">Quick Select</option>
        <option value="custom">Custom Range</option>
      </select>

      {/* Preset Date Ranges */}
      {dateMode === 'preset' && (
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-white"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="180d">Last 6 months</option>
          <option value="365d">Last year</option>
        </select>
      )}

      {/* Custom Date Inputs */}
      {dateMode === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              max={today}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <span className="text-gray-500 mt-5">→</span>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={startDate}
              max={today}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Date Range Display */}
      {dateMode === 'custom' && startDate && endDate && (
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected
        </div>
      )}
    </div>
  );
}
