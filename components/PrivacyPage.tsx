import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: 23 February 2026</p>

      <div className="space-y-8 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
          <p>When you create an account on eipi, we collect:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li><strong>Account information:</strong> your name, email address, school, and year level.</li>
            <li><strong>Google account data:</strong> if you sign in with Google, we receive your name, email, and profile picture from Google.</li>
            <li><strong>Exam results:</strong> your practice exam scores and topic performance data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Provide and maintain your account.</li>
            <li>Track your exam performance and display analytics.</li>
            <li>Improve our question bank and platform features.</li>
          </ul>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Data Storage</h2>
          <p>Your data is stored securely using Google Firebase (Firestore) infrastructure located in Australia. We use industry-standard security measures to protect your information.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li><strong>Firebase Authentication:</strong> for secure sign-in (email/password and Google).</li>
            <li><strong>Cloud Firestore:</strong> for data storage.</li>
            <li><strong>Vercel:</strong> for hosting.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Your Rights</h2>
          <p>You may request to access, update, or delete your personal data at any time by contacting us. Upon account deletion, all associated data will be permanently removed.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Children's Privacy</h2>
          <p>eipi is designed for students preparing for selective school exams. We collect only the minimum information necessary to provide the service. Parental consent is recommended for users under 13.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Contact</h2>
          <p>For privacy-related questions, contact us at <a href="mailto:wangmengjames@gmail.com" className="text-blue-600 hover:underline">wangmengjames@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPage;
