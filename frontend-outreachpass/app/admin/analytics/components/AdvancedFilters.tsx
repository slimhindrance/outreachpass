"use client";

import { Filter, X } from 'lucide-react';
import { useState } from 'react';

interface AdvancedFiltersProps {
  // Source filters
  selectedSources: string[];
  setSelectedSources: (sources: string[]) => void;
  availableSources: string[];

  // Device filters
  selectedDevices: string[];
  setSelectedDevices: (devices: string[]) => void;
  availableDevices: string[];

  // Platform filters
  selectedPlatforms: string[];
  setSelectedPlatforms: (platforms: string[]) => void;
  availablePlatforms: string[];

  // Clear all filters
  onClearAll: () => void;
}

export function AdvancedFilters({
  selectedSources,
  setSelectedSources,
  availableSources,
  selectedDevices,
  setSelectedDevices,
  availableDevices,
  selectedPlatforms,
  setSelectedPlatforms,
  availablePlatforms,
  onClearAll,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSource = (source: string) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const toggleDevice = (device: string) => {
    if (selectedDevices.includes(device)) {
      setSelectedDevices(selectedDevices.filter(d => d !== device));
    } else {
      setSelectedDevices([...selectedDevices, device]);
    }
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const activeFiltersCount = selectedSources.length + selectedDevices.length + selectedPlatforms.length;

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition"
      >
        <Filter className="h-5 w-5 mr-2 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
        {activeFiltersCount > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-brand-primary text-white text-xs font-semibold rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Source Type Filters */}
            {availableSources.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Card View Source</h4>
                <div className="space-y-2">
                  {availableSources.map((source) => (
                    <label key={source} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source)}
                        onChange={() => toggleSource(source)}
                        className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {source.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Device Type Filters */}
            {availableDevices.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Device Type</h4>
                <div className="space-y-2">
                  {availableDevices.map((device) => (
                    <label key={device} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device)}
                        onChange={() => toggleDevice(device)}
                        className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {device}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Filters */}
            {availablePlatforms.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Wallet Platform</h4>
                <div className="space-y-2">
                  {availablePlatforms.map((platform) => (
                    <label key={platform} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {platform}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => {
                  onClearAll();
                  setIsOpen(false);
                }}
                disabled={activeFiltersCount === 0}
                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-sm text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && !isOpen && (
        <div className="absolute top-full mt-2 right-0 flex flex-wrap gap-2 max-w-md">
          {selectedSources.map((source) => (
            <FilterChip
              key={`source-${source}`}
              label={source.replace('_', ' ')}
              onRemove={() => toggleSource(source)}
            />
          ))}
          {selectedDevices.map((device) => (
            <FilterChip
              key={`device-${device}`}
              label={device}
              onRemove={() => toggleDevice(device)}
            />
          ))}
          {selectedPlatforms.map((platform) => (
            <FilterChip
              key={`platform-${platform}`}
              label={platform}
              onRemove={() => togglePlatform(platform)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-sm">
      <span className="capitalize">{label}</span>
      <button
        onClick={onRemove}
        className="ml-2 hover:text-brand-primary/70 transition"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
