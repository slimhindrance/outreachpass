"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { config } from '@/config';

interface Card {
  card_id: string;
  display_name: string;
  job_title?: string;
  company?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  qr_code_url?: string;
  apple_pass_url?: string;
  google_pass_url?: string;
  vcard_url?: string;
  status: string;
  is_primary: boolean;
  total_views: number;
  total_scans: number;
  total_downloads: number;
  created_at: string;
}

interface User {
  user_id: string;
  email: string;
  full_name?: string;
  tier: string;
  features: Record<string, any>;
  cards: Card[];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCopied, setShowCopied] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const apiUrl = config.api.baseUrl;
        const response = await fetch(`${apiUrl}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.clear();
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch profile');
        }

        const data: User = await response.json();
        setUser(data);

        // Get primary card or first card
        if (data.cards && data.cards.length > 0) {
          const primaryCard = data.cards.find(c => c.is_primary) || data.cards[0];
          setCard(primaryCard);
        }

        // Show created banner if redirected after card creation
        if (searchParams.get('created') === 'true') {
          setShowCreatedBanner(true);
          setTimeout(() => setShowCreatedBanner(false), 5000);
        }
      } catch (err) {
        console.error('[Dashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, searchParams]);

  const copyShareLink = () => {
    if (card) {
      const shareUrl = `${config.app.url}/c/${card.card_id}`;
      navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{config.brand.name}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Created Banner */}
      {showCreatedBanner && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 font-medium">Your card has been created successfully!</span>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* No Card State */}
        {!card && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your First Card</h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your digital business card. It only takes a minute!
            </p>
            <button
              onClick={() => router.push('/seeme/create-card')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Create Card
            </button>
          </div>
        )}

        {/* Card Display */}
        {card && (
          <div className="space-y-6">
            {/* Card Preview */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0">
                    {card.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold truncate">{card.display_name}</h2>
                    {card.job_title && <p className="text-blue-100">{card.job_title}</p>}
                    {card.company && <p className="text-blue-200 text-sm">{card.company}</p>}
                  </div>
                  {card.qr_code_url && (
                    <img
                      src={card.qr_code_url}
                      alt="QR Code"
                      className="w-20 h-20 bg-white rounded-lg p-1"
                    />
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  {card.email && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-600">{card.email}</span>
                    </div>
                  )}
                  {card.phone && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-gray-600">{card.phone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={copyShareLink}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {showCopied ? 'Copied!' : 'Share'}
                  </button>

                  {card.vcard_url && (
                    <a
                      href={card.vcard_url}
                      download
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      vCard
                    </a>
                  )}

                  {card.apple_pass_url && (
                    <a
                      href={card.apple_pass_url}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple
                    </a>
                  )}

                  {card.google_pass_url && (
                    <a
                      href={card.google_pass_url}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Google
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{card.total_views}</p>
                  <p className="text-sm text-gray-600">Views</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{card.total_scans}</p>
                  <p className="text-sm text-gray-600">QR Scans</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{card.total_downloads}</p>
                  <p className="text-sm text-gray-600">Downloads</p>
                </div>
              </div>
            </div>

            {/* Edit Card Button */}
            <div className="text-center">
              <button
                onClick={() => router.push(`/seeme/edit-card/${card.card_id}`)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit Card Details
              </button>
            </div>
          </div>
        )}

        {/* Upgrade Banner for Free Tier */}
        {user?.tier === 'seeme' && (
          <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Upgrade to XraySpecs</h3>
            <p className="text-purple-100 mb-4">
              Get detailed analytics, multiple cards, and custom themes for $29/month.
            </p>
            <button className="px-4 py-2 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition">
              Learn More
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
