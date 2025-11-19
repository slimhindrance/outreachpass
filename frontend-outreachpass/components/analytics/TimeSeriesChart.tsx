import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { TimeSeriesResponse } from '@/types/analytics';

interface TimeSeriesChartProps {
  data: TimeSeriesResponse;
  loading?: boolean;
}

export function TimeSeriesChart({ data, loading }: TimeSeriesChartProps) {
  const [showUniqueCards, setShowUniqueCards] = useState(false);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const chartData = data.data.map((point) => ({
    date: format(parseISO(point.period), data.granularity === 'hour' ? 'MMM d, ha' : 'MMM d'),
    fullDate: point.period,
    count: point.count,
    uniqueCards: point.unique_cards,
  }));

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      views: 'Card Views',
      downloads: 'vCard Downloads',
      wallet_adds: 'Wallet Adds',
      emails_sent: 'Emails Sent',
    };
    return labels[metric] || metric;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {getMetricLabel(data.metric)} Over Time
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {data.granularity.charAt(0).toUpperCase() + data.granularity.slice(1)}ly breakdown
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Total:</span> {data.total_events.toLocaleString()}
          </div>
          <label className="flex items-center text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showUniqueCards}
              onChange={(e) => setShowUniqueCards(e.target.checked)}
              className="mr-2 rounded text-brand-primary"
            />
            Show Unique Cards
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#888"
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis stroke="#888" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'count' ? 'Total Events' : 'Unique Cards',
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Total Events"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {showUniqueCards && (
            <Line
              type="monotone"
              dataKey="uniqueCards"
              stroke="#10b981"
              strokeWidth={2}
              name="Unique Cards"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Events</p>
          <p className="text-xl font-bold text-gray-900">{data.total_events.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Unique Cards</p>
          <p className="text-xl font-bold text-gray-900">{data.unique_cards.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Avg Events/Card</p>
          <p className="text-xl font-bold text-gray-900">
            {data.unique_cards > 0 ? (data.total_events / data.unique_cards).toFixed(1) : '0'}
          </p>
        </div>
      </div>
    </div>
  );
}
