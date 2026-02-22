import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: 23 February 2026</p>

      <div className="space-y-8 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>By accessing or using eipi ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
          <p>eipi is an online exam preparation platform for Australian selective school entry tests. The Platform provides practice questions, timed simulations, and performance analytics.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. User Accounts</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>One account per person. Creating multiple accounts to circumvent platform limits is prohibited.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Share, reproduce, or distribute exam questions from the Platform.</li>
            <li>Use automated tools, bots, or scripts to access the Platform.</li>
            <li>Attempt to gain unauthorized access to other users' accounts or data.</li>
            <li>Use the Platform for any unlawful purpose.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Intellectual Property</h2>
          <p>All questions, content, and materials on the Platform are the property of eipi education and are protected by copyright. You may not copy, modify, or distribute any content without prior written consent.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Disclaimer</h2>
          <p>The Platform is provided "as is" without warranties of any kind. We do not guarantee specific exam results or outcomes. Practice questions are for preparation purposes only and may not reflect actual exam content.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms, without prior notice.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of the Platform after changes constitutes acceptance of the updated terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:wangmengjames@gmail.com" className="text-blue-600 hover:underline">wangmengjames@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsPage;
