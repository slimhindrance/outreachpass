import { TrendingDown } from 'lucide-react';
import type { ConversionFunnelResponse } from '@/types/analytics';

interface ConversionFunnelProps {
  data: ConversionFunnelResponse;
  loading?: boolean;
}

export function ConversionFunnel({ data, loading }: ConversionFunnelProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.stages.map((s) => s.unique_cards));

  const getStageColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
    ];
    return colors[index % colors.length];
  };

  const getStageTextColor = (index: number) => {
    const colors = [
      'text-blue-700',
      'text-green-700',
      'text-yellow-700',
      'text-purple-700',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Conversion Funnel</h3>
          <p className="text-sm text-gray-500 mt-1">
            User journey from card view to wallet add
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Overall Conversion</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.overall_conversion_rate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {data.total_cards_completed_funnel} of {data.total_cards_entered_funnel} cards
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {data.stages.map((stage, index) => {
          const widthPercent = (stage.unique_cards / maxValue) * 100;
          const isFirst = index === 0;

          return (
            <div key={stage.stage_name} className="relative">
              {/* Stage bar */}
              <div className="relative">
                <div
                  className={`${getStageColor(index)} h-20 rounded-lg transition-all hover:opacity-90 flex items-center justify-between px-6`}
                  style={{ width: `${widthPercent}%`, minWidth: '40%' }}
                >
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-lg">
                      {stage.stage_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-white/90 text-sm">
                      {stage.unique_cards.toLocaleString()} unique cards
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold text-2xl">
                      {stage.unique_cards.toLocaleString()}
                    </span>
                    {!isFirst && (
                      <div className="flex items-center gap-1 text-white/90 text-sm mt-1">
                        <TrendingDown className="h-3 w-3" />
                        <span>{stage.conversion_from_previous.toFixed(1)}% from previous</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector arrow */}
                {index < data.stages.length - 1 && (
                  <div className="absolute left-1/2 -bottom-5 transform -translate-x-1/2 flex flex-col items-center">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Stage details */}
              <div className="mt-2 ml-2 text-sm text-gray-600">
                <span className={`font-medium ${getStageTextColor(index)}`}>
                  {stage.total_events.toLocaleString()}
                </span>{' '}
                total events
                {stage.unique_cards > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium">
                      {(stage.total_events / stage.unique_cards).toFixed(1)}
                    </span>{' '}
                    events per card
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Entered Funnel</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {data.total_cards_entered_funnel.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Completed Funnel</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {data.total_cards_completed_funnel.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Drop-off Rate</p>
            <p className="text-xl font-bold text-red-600 mt-1">
              {(100 - data.overall_conversion_rate).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Analysis Period</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {data.date_range_days} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
