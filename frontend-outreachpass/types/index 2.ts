// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// User & Auth Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'attendee' | 'exhibitor';
  tenantId: string;
}

// Tenant & Brand Types
export interface Tenant {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  tenantId: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}

// Event Types - Match backend schema
export interface Event {
  event_id: string;
  tenant_id: string;
  brand_id: string;
  name: string;
  slug: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  settings_json: Record<string, any>;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Legacy/convenience fields
  location?: string;
  description?: string;
}

export interface CreateEventInput {
  brand_id: string;
  name: string;
  slug: string;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  settings_json?: Record<string, any>;
}

// Dashboard Stats
export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalAttendees: number;
  totalScans: number;
}

// Attendee Types
export interface Attendee {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
  status: string;
  createdAt: string;
}

export interface CreateAttendeeInput {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
}

// Card Types
export interface Card {
  id: string;
  attendeeId: string;
  qrCodeUrl: string;
  publicUrl: string;
  createdAt: string;
}

// Wallet Pass Types
export interface WalletPass {
  id: string;
  attendeeId: string;
  platform: 'apple' | 'google';
  passUrl: string;
  serialNumber: string;
  status: string;
  createdAt: string;
}

// Analytics Types
export interface DailyScan {
  eventId: string;
  scanDate: string;
  totalScans: number;
}

export interface EventAnalytics {
  eventId: string;
  totalAttendees: number;
  totalScans: number;
  passesIssued: number;
  dailyScans: DailyScan[];
}

// Exhibitor Types
export interface Exhibitor {
  id: string;
  eventId: string;
  companyName: string;
  contactEmail: string;
  boothNumber?: string;
  status: string;
  createdAt: string;
}

export interface ExhibitorLead {
  id: string;
  exhibitorId: string;
  attendeeId: string;
  notes?: string;
  rating?: number;
  createdAt: string;
}
