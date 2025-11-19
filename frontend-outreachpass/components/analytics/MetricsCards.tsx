import { Eye, Download, Wallet, Mail, TrendingUp, Users } from 'lucide-react';
import type { EventSummaryResponse } from '@/types/analytics';

interface MetricsCardsProps {
  data: EventSummaryResponse;
  loading?: boolean;
}

export function MetricsCards({ data, loading }: MetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Cards',
      value: data.total_cards.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Card Views',
      value: data.total_views.toLocaleString(),
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'vCard Downloads',
      value: data.total_vcard_downloads.toLocaleString(),
      icon: Download,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Wallet Adds',
      value: data.total_wallet_adds.toLocaleString(),
      icon: Wallet,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      sublabel: `Apple: ${data.total_apple_wallet_adds} | Google: ${data.total_google_wallet_adds}`,
    },
    {
      label: 'Emails Sent',
      value: data.total_emails_sent.toLocaleString(),
      icon: Mail,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      sublabel: data.total_emails_failed > 0 ? `${data.total_emails_failed} failed` : undefined,
      sublabelColor: 'text-red-600',
    },
    {
      label: 'QR Codes Generated',
      value: data.total_qr_generated.toLocaleString(),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'View→Download Rate',
      value: `${data.conversion_rates.view_to_download.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: 'View→Wallet Rate',
      value: `${data.conversion_rates.view_to_wallet.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">{metric.label}</p>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-5 w-5 ${metric.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          {metric.sublabel && (
            <p className={`text-xs mt-1 ${metric.sublabelColor || 'text-gray-500'}`}>
              {metric.sublabel}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
