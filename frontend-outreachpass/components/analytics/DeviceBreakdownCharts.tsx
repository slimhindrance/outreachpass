import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { DeviceBreakdownResponse } from '@/types/analytics';

interface DeviceBreakdownChartsProps {
  data: DeviceBreakdownResponse;
  loading?: boolean;
}

const DEVICE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const OS_COLORS = ['#06b6d4', '#14b8a6', '#f97316', '#ec4899', '#a855f7'];
const BROWSER_COLORS = ['#6366f1', '#22c55e', '#eab308', '#f43f5e', '#9333ea'];

export function DeviceBreakdownCharts({ data, loading }: DeviceBreakdownChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const deviceData = data.devices.map((d) => ({
    name: d.device_type || 'Unknown',
    value: d.count,
    percentage: d.percentage,
  }));

  const osData = data.operating_systems.map((os) => ({
    name: os.os || 'Unknown',
    value: os.count,
    percentage: os.percentage,
  }));

  const browserData = data.browsers.map((browser) => ({
    name: browser.browser || 'Unknown',
    value: browser.count,
    percentage: browser.percentage,
  }));

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: any) => {
    if (percentage < 5) return null; // Don't show labels for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-col gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.value}</span>
            </div>
            <span className="text-gray-500 font-medium">
              {entry.payload.percentage.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Device Type */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Device Types</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={deviceData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {deviceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Operating Systems */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Systems</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={osData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#82ca9d"
              dataKey="value"
            >
              {osData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={OS_COLORS[index % OS_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Browsers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Browsers</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={browserData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#ffc658"
              dataKey="value"
            >
              {browserData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BROWSER_COLORS[index % BROWSER_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
