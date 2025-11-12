import Link from "next/link";
import { ArrowRight, QrCode, Users, BarChart3, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <QrCode className="h-8 w-8 text-brand-primary" />
            <span className="text-2xl font-bold text-gray-900">OutreachPass</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-brand-primary transition">
              Features
            </Link>
            <Link href="#how-it-works" className="text-gray-600 hover:text-brand-primary transition">
              How It Works
            </Link>
            <Link href="/admin" className="text-gray-600 hover:text-brand-primary transition">
              Admin
            </Link>
          </nav>
          <div className="flex space-x-4">
            <a
              href="/attendee/"
              className="px-4 py-2 text-brand-primary hover:text-brand-primary/80 transition"
            >
              Sign In
            </a>
            <a
              href="/admin/dashboard/"
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Professional Networking
          <br />
          <span className="text-brand-primary">Made Simple</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Streamline your conference networking with digital contact cards, QR codes, and seamless Apple Wallet integration.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/admin/dashboard/"
            className="px-8 py-4 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition inline-flex items-center justify-center"
          >
            Start Your Event
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
          <Link
            href="#how-it-works"
            className="px-8 py-4 border-2 border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/5 transition"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Everything You Need for Professional Networking
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<QrCode className="h-12 w-12 text-brand-primary" />}
            title="QR Code Cards"
            description="Instantly share contact information with a quick scan. No apps required."
          />
          <FeatureCard
            icon={<Smartphone className="h-12 w-12 text-brand-primary" />}
            title="Wallet Passes"
            description="Add event passes directly to Apple Wallet and Google Pay for easy access."
          />
          <FeatureCard
            icon={<Users className="h-12 w-12 text-brand-primary" />}
            title="Attendee Management"
            description="Import attendees via CSV and manage contacts effortlessly."
          />
          <FeatureCard
            icon={<BarChart3 className="h-12 w-12 text-brand-primary" />}
            title="Analytics Dashboard"
            description="Track engagement, scans, and networking activity in real-time."
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Step number={1} title="Create Your Event" description="Set up your conference or networking event in minutes." />
            <Step number={2} title="Import Attendees" description="Upload your attendee list via CSV or add them manually." />
            <Step number={3} title="Issue Passes" description="Generate QR codes and wallet passes for seamless check-in." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-brand-primary rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Event?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of event organizers using OutreachPass
          </p>
          <a
            href="/admin/dashboard/"
            className="px-8 py-4 bg-white text-brand-primary rounded-lg hover:bg-gray-100 transition inline-flex items-center"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <QrCode className="h-6 w-6" />
                <span className="text-xl font-bold">OutreachPass</span>
              </div>
              <p className="text-gray-400">
                Professional networking made simple.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-white transition">How It Works</Link></li>
                <li><Link href="/admin" className="hover:text-white transition">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition">About</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            © 2025 OutreachPass by Base2ML. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
