"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/config';
import { Wallet, Mail, Download, ExternalLink, CheckCircle, Send } from 'lucide-react';

// VERSION MARKER - If you see this in console, you have fresh code
const CODE_VERSION = "2024-12-01-wallet-url-fix-v3";
console.log('[CreateCard] Code version:', CODE_VERSION);

// Step definitions
const STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Name and contact' },
  { id: 'professional', title: 'Professional', description: 'Work details' },
  { id: 'social', title: 'Social Links', description: 'Connect everywhere' },
  { id: 'preview', title: 'Preview', description: 'Review your card' },
];

interface CardFormData {
  // Basic Info
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_mobile: string;

  // Professional
  title: string;
  org_name: string;
  department: string;

  // Social Media
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  github_url: string;
  tiktok_url: string;
  youtube_url: string;

  // Messaging
  whatsapp: string;
  telegram: string;

  // Websites
  website_personal: string;
  website_work: string;
  website_portfolio: string;

  // Additional
  bio: string;
  pronouns: string;
}

const initialFormData: CardFormData = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  phone_mobile: '',
  title: '',
  org_name: '',
  department: '',
  linkedin_url: '',
  twitter_url: '',
  instagram_url: '',
  github_url: '',
  tiktok_url: '',
  youtube_url: '',
  whatsapp: '',
  telegram: '',
  website_personal: '',
  website_work: '',
  website_portfolio: '',
  bio: '',
  pronouns: '',
};

// Card response from API includes pre-generated wallet pass URLs
interface CreatedCard {
  card_id: string;
  apple_pass_url?: string;
  google_pass_url?: string;
  vcard_url?: string;
  qr_code_url?: string;
}

function CreateCardContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<CardFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [createdCard, setCreatedCard] = useState<CreatedCard | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    // Pre-fill form with user data
    setFormData(prev => ({
      ...prev,
      display_name: userData.full_name || '',
      email: userData.email || '',
      first_name: userData.full_name?.split(' ')[0] || '',
      last_name: userData.full_name?.split(' ').slice(1).join(' ') || '',
    }));
  }, [router]);

  const updateField = (field: keyof CardFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const apiUrl = config.api.baseUrl;
      const response = await fetch(`${apiUrl}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: formData.display_name,
          job_title: formData.title,
          company: formData.org_name,
          email: formData.email,
          phone: formData.phone || formData.phone_mobile,
          linkedin_url: formData.linkedin_url,
          twitter_url: formData.twitter_url,
          website_url: formData.website_personal || formData.website_work,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create card' }));
        throw new Error(errorData.detail || 'Failed to create card');
      }

      const card = await response.json();
      console.log('[CreateCard] Card created:', card.card_id);
      console.log('[CreateCard] Card URLs:', {
        apple_pass_url: card.apple_pass_url,
        google_pass_url: card.google_pass_url,
        vcard_url: card.vcard_url
      });

      // Show success state with wallet pass options instead of redirecting
      console.log('[CreateCard] Setting createdCard with full response');
      setCreatedCard(card);
      console.log('[CreateCard] createdCard set, waiting for re-render');
    } catch (err: any) {
      console.error('[CreateCard] Error:', err);
      setError(err.message || 'Failed to create card');
    } finally {
      setLoading(false);
    }
  };

  // Wallet pass handler functions - use pre-generated URLs from card response
  const getApiBaseUrl = () => {
    const apiUrl = config.api.baseUrl || 'https://hwl4ycnvda.execute-api.us-east-1.amazonaws.com/api/seeme';
    return apiUrl.replace(/\/api\/.*$/, '');
  };

  const handleAddToAppleWallet = () => {
    if (!createdCard?.apple_pass_url) {
      console.error('[CreateCard] No apple_pass_url available');
      alert('Apple Wallet pass is not available yet. Please try again.');
      return;
    }
    console.log('[CreateCard] Opening Apple Wallet URL:', createdCard.apple_pass_url);
    window.location.href = createdCard.apple_pass_url;
  };

  const handleAddToGoogleWallet = () => {
    if (!createdCard?.google_pass_url) {
      console.error('[CreateCard] No google_pass_url available');
      alert('Google Wallet pass is not available yet. Please try again.');
      return;
    }
    console.log('[CreateCard] Opening Google Wallet URL:', createdCard.google_pass_url);
    window.location.href = createdCard.google_pass_url;
  };

  const handleDownloadVCard = () => {
    if (!createdCard?.vcard_url) {
      console.error('[CreateCard] No vcard_url available');
      alert('vCard is not available yet. Please try again.');
      return;
    }
    console.log('[CreateCard] Opening vCard URL:', createdCard.vcard_url);
    window.location.href = createdCard.vcard_url;
  };

  const handleSendPassToEmail = async () => {
    if (!createdCard?.card_id || !formData.email) return;
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.api.baseUrl}/cards/${createdCard.card_id}/send-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: formData.email }),
      });
      if (response.ok) {
        setEmailSent(true);
      } else {
        alert('Failed to send pass. Please try again.');
      }
    } catch (err) {
      console.error('Error sending pass:', err);
      alert('Failed to send pass. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleViewCard = () => {
    if (!createdCard?.card_id) return;
    window.open(`${getApiBaseUrl()}/c/${createdCard.card_id}`, '_blank');
  };

  // Validation for current step
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return formData.display_name.trim().length > 0;
      case 1: // Professional (optional)
        return true;
      case 2: // Social (optional)
        return true;
      case 3: // Preview
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep formData={formData} updateField={updateField} />;
      case 1:
        return <ProfessionalStep formData={formData} updateField={updateField} />;
      case 2:
        return <SocialStep formData={formData} updateField={updateField} />;
      case 3:
        return <PreviewStep formData={formData} />;
      default:
        return null;
    }
  };

  // Success state - show wallet pass options after card creation
  if (createdCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Card Created!</h1>
            <p className="text-gray-600 mt-2">
              Your digital business card is ready. Add it to your wallet or share it.
            </p>
          </div>

          {/* Card Preview Link */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-blue-600" />
              Your Card
            </h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{formData.display_name}</p>
                {formData.title && <p className="text-sm text-gray-600">{formData.title}</p>}
              </div>
              <button
                onClick={handleViewCard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View
              </button>
            </div>
          </div>

          {/* Add to Wallet Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              Add to Your Wallet
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToAppleWallet}
                className="flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-xl hover:bg-gray-800 transition"
              >
                <Wallet className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-semibold">Apple Wallet</p>
                  <p className="text-xs text-gray-300">iPhone & iPad</p>
                </div>
              </button>
              <button
                onClick={handleAddToGoogleWallet}
                className="flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-900 px-6 py-4 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Wallet className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold">Google Wallet</p>
                  <p className="text-xs text-gray-600">Android devices</p>
                </div>
              </button>
            </div>
          </div>

          {/* Send to Email Section */}
          {formData.email && (
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Your Pass
              </h2>
              {emailSent ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>Pass sent to {formData.email}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg text-gray-600 truncate">
                    {formData.email}
                  </div>
                  <button
                    onClick={handleSendPassToEmail}
                    disabled={sendingEmail}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Download vCard */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Download Options
            </h2>
            <button
              onClick={handleDownloadVCard}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-200 transition border border-gray-300"
            >
              <Download className="w-5 h-5" />
              Download vCard (.vcf)
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/seeme/dashboard')}
              className="px-6 py-3 text-gray-600 hover:text-gray-900"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                setCreatedCard(null);
                setFormData(initialFormData);
                setCurrentStep(0);
                setEmailSent(false);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Another Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Your Card</h1>
          <p className="text-gray-600 mt-2">
            Fill in your details to create your digital business card
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                      ${index < currentStep ? 'bg-green-500 text-white' :
                        index === currentStep ? 'bg-blue-600 text-white' :
                        'bg-gray-200 text-gray-500'}`}
                  >
                    {index < currentStep ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="mt-2 text-center hidden sm:block">
                    <p className={`text-xs font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-0.5
                      ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{STEPS[currentStep].title}</h2>
            <p className="text-gray-500 text-sm">{STEPS[currentStep].description}</p>
          </div>

          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-6 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                disabled={!isStepValid()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !isStepValid()}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create My Card'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip for now link */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/seeme/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// Step Components
function BasicInfoStep({ formData, updateField }: { formData: CardFormData; updateField: (field: keyof CardFormData, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.display_name}
          onChange={(e) => updateField('display_name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="John Doe"
          required
        />
        <p className="text-xs text-gray-500 mt-1">This is how your name appears on your card</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="john@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
          <input
            type="tel"
            value={formData.phone_mobile}
            onChange={(e) => updateField('phone_mobile', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 987-6543"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
        <select
          value={formData.pronouns}
          onChange={(e) => updateField('pronouns', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select (optional)</option>
          <option value="he/him">he/him</option>
          <option value="she/her">she/her</option>
          <option value="they/them">they/them</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}

function ProfessionalStep({ formData, updateField }: { formData: CardFormData; updateField: (field: keyof CardFormData, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Software Engineer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company / Organization</label>
        <input
          type="text"
          value={formData.org_name}
          onChange={(e) => updateField('org_name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Acme Inc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input
          type="text"
          value={formData.department}
          onChange={(e) => updateField('department', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Engineering"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="A brief description about yourself..."
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
      </div>

      <p className="text-sm text-gray-500 italic">
        All fields are optional. Add what you&apos;d like to share.
      </p>
    </div>
  );
}

function SocialStep({ formData, updateField }: { formData: CardFormData; updateField: (field: keyof CardFormData, value: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Social Media */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Social Media</h3>
        <div className="space-y-3">
          <InputWithIcon
            icon="linkedin"
            placeholder="linkedin.com/in/username"
            value={formData.linkedin_url}
            onChange={(v) => updateField('linkedin_url', v)}
          />
          <InputWithIcon
            icon="twitter"
            placeholder="twitter.com/username"
            value={formData.twitter_url}
            onChange={(v) => updateField('twitter_url', v)}
          />
          <InputWithIcon
            icon="instagram"
            placeholder="instagram.com/username"
            value={formData.instagram_url}
            onChange={(v) => updateField('instagram_url', v)}
          />
          <InputWithIcon
            icon="github"
            placeholder="github.com/username"
            value={formData.github_url}
            onChange={(v) => updateField('github_url', v)}
          />
          <InputWithIcon
            icon="tiktok"
            placeholder="tiktok.com/@username"
            value={formData.tiktok_url}
            onChange={(v) => updateField('tiktok_url', v)}
          />
          <InputWithIcon
            icon="youtube"
            placeholder="youtube.com/@username"
            value={formData.youtube_url}
            onChange={(v) => updateField('youtube_url', v)}
          />
        </div>
      </div>

      {/* Messaging */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Messaging</h3>
        <div className="space-y-3">
          <InputWithIcon
            icon="whatsapp"
            placeholder="WhatsApp number"
            value={formData.whatsapp}
            onChange={(v) => updateField('whatsapp', v)}
          />
          <InputWithIcon
            icon="telegram"
            placeholder="Telegram username"
            value={formData.telegram}
            onChange={(v) => updateField('telegram', v)}
          />
        </div>
      </div>

      {/* Websites */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Websites</h3>
        <div className="space-y-3">
          <InputWithIcon
            icon="globe"
            placeholder="Personal website"
            value={formData.website_personal}
            onChange={(v) => updateField('website_personal', v)}
          />
          <InputWithIcon
            icon="briefcase"
            placeholder="Work website"
            value={formData.website_work}
            onChange={(v) => updateField('website_work', v)}
          />
          <InputWithIcon
            icon="folder"
            placeholder="Portfolio"
            value={formData.website_portfolio}
            onChange={(v) => updateField('website_portfolio', v)}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 italic">
        Add links you want to share. All fields are optional.
      </p>
    </div>
  );
}

function PreviewStep({ formData }: { formData: CardFormData }) {
  return (
    <div className="space-y-6">
      {/* Card Preview */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {formData.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold">{formData.display_name || 'Your Name'}</h3>
            {formData.title && <p className="text-blue-100">{formData.title}</p>}
            {formData.org_name && <p className="text-blue-200 text-sm">{formData.org_name}</p>}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {formData.email && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{formData.email}</span>
            </div>
          )}
          {(formData.phone || formData.phone_mobile) && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{formData.phone || formData.phone_mobile}</span>
            </div>
          )}
          {formData.linkedin_url && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="truncate">LinkedIn</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">What&apos;s included:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Digital business card with QR code
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Apple Wallet &amp; Google Wallet pass
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Downloadable vCard file
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Shareable link
          </li>
        </ul>
      </div>

      <p className="text-sm text-gray-500 text-center">
        Your card will be ready in seconds after creation.
      </p>
    </div>
  );
}

// Helper component for social inputs with icons
function InputWithIcon({ icon, placeholder, value, onChange }: { icon: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const iconMap: Record<string, React.ReactNode> = {
    linkedin: (
      <svg className="w-5 h-5 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    twitter: (
      <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    instagram: (
      <svg className="w-5 h-5 text-[#E4405F]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    github: (
      <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    tiktok: (
      <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    youtube: (
      <svg className="w-5 h-5 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    whatsapp: (
      <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    telegram: (
      <svg className="w-5 h-5 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    globe: (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    briefcase: (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    folder: (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        {iconMap[icon] || iconMap.globe}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <CreateCardContent />
    </Suspense>
  );
}
