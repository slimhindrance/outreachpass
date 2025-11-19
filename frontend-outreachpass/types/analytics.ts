// Enhanced Analytics TypeScript Types
// Corresponds to backend API response models from /backend/app/api/analytics.py

export interface ConversionRates {
  view_to_download: number;
  view_to_wallet: number;
  download_to_wallet: number;
}

export interface DeviceStats {
  device_type: string;
  count: number;
  percentage: number;
}

export interface OSStats {
  os: string;
  count: number;
  percentage: number;
}

export interface BrowserStats {
  browser: string;
  count: number;
  percentage: number;
}

export interface EventSummaryResponse {
  event_id: string;
  event_name: string;
  total_cards: number;
  total_views: number;
  total_vcard_downloads: number;
  total_apple_wallet_adds: number;
  total_google_wallet_adds: number;
  total_wallet_adds: number;
  total_qr_generated: number;
  total_emails_sent: number;
  total_emails_failed: number;
  conversion_rates: ConversionRates;
  device_breakdown: DeviceStats[];
  date_range_days: number;
}

export interface TimeSeriesDataPoint {
  period: string; // ISO timestamp
  count: number;
  unique_cards: number;
}

export interface TimeSeriesResponse {
  event_id: string;
  metric: string;
  granularity: string;
  data: TimeSeriesDataPoint[];
  total_events: number;
  unique_cards: number;
  date_range_days: number;
}

export interface DeviceBreakdownResponse {
  event_id: string;
  devices: DeviceStats[];
  operating_systems: OSStats[];
  browsers: BrowserStats[];
  total_events_analyzed: number;
  date_range_days: number;
}

export interface FunnelStage {
  stage_name: string;
  unique_cards: number;
  total_events: number;
  conversion_from_previous: number;
}

export interface ConversionFunnelResponse {
  event_id: string;
  stages: FunnelStage[];
  overall_conversion_rate: number;
  date_range_days: number;
  total_cards_entered_funnel: number;
  total_cards_completed_funnel: number;
}

export interface TenantSummaryResponse {
  tenant_id: string;
  total_events: number;
  total_cards: number;
  total_views: number;
  total_downloads: number;
  total_wallet_adds: number;
  total_emails_sent: number;
  date_range_days: number;
  top_events: Array<{
    event_id: string;
    event_name: string;
    views: number;
    downloads: number;
    wallet_adds: number;
  }>;
}

// Query parameter types for API calls
export interface AnalyticsQueryParams {
  days?: number;
  event_id?: string;
  metric?: 'views' | 'downloads' | 'wallet_adds' | 'emails_sent';
  granularity?: 'hour' | 'day' | 'week';
}

// Card-level analytics types
export interface CardActivityEvent {
  event_name: string;
  occurred_at: string;
  device_type?: string;
  browser?: string;
  os?: string;
}

export interface CardAnalyticsResponse {
  card_id: string;
  total_views: number;
  total_vcard_downloads: number;
  total_apple_wallet_adds: number;
  total_google_wallet_adds: number;
  total_wallet_adds: number;
  total_email_opens: number;
  total_email_clicks: number;
  first_viewed_at?: string;
  last_activity_at?: string;
  recent_activity: CardActivityEvent[];
}
