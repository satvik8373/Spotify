import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Footer from '@/components/Footer';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 text-gray-300">
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-4">Last updated: January 2026</p>
              <p className="mb-4">
                Welcome to Mavrixfy. These Terms of Service ("Terms") govern your use of our website and services, 
                including integration with third-party platforms such as Spotify. By using Mavrixfy, you agree to these Terms.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using Mavrixfy, you accept and agree to be bound by these Terms and our Privacy Policy. 
                If you do not agree to these Terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p className="mb-4">
                Mavrixfy is a music discovery and playlist management platform that integrates with third-party services 
                like Spotify to help users discover, organize, and manage their music collections. We do not host, stream, 
                or store music files directly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Spotify Integration and Compliance</h2>
              <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg mb-4">
                <p className="mb-4 text-green-400 font-medium">Mavrixfy fully complies with Spotify Developer Terms:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We only access Spotify data that you explicitly authorize</li>
                  <li>We do not download, store, or redistribute Spotify content</li>
                  <li>All music playback occurs through official Spotify APIs</li>
                  <li>You can revoke Spotify access at any time through your account settings</li>
                  <li>We respect Spotify's rate limits and usage guidelines</li>
                </ul>
              </div>
              <p className="text-yellow-400">
                Note: A valid Spotify Premium subscription may be required for full playback functionality through Spotify's Web Playback SDK.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. User Accounts and Authentication</h2>
              <p className="mb-4">
                To access certain features, you may authenticate through third-party services like Spotify. 
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the security of your third-party account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Complying with the terms of service of integrated platforms</li>
                <li>Notifying us of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use Policy</h2>
              <p className="mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the service for any unlawful purpose or in violation of any laws</li>
                <li>Attempt to circumvent or violate third-party platform restrictions</li>
                <li>Reverse engineer, decompile, or attempt to extract source code</li>
                <li>Use automated tools to access the service without permission</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Violate the intellectual property rights of others</li>
                <li>Share account credentials or allow unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Third-Party Services and Content</h2>
              <p className="mb-4">
                Mavrixfy integrates with third-party services including Spotify. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Third-party content is governed by their respective terms of service</li>
                <li>We are not responsible for the availability or content of third-party services</li>
                <li>Changes to third-party APIs may affect our service functionality</li>
                <li>You must comply with all applicable third-party terms and conditions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p className="mb-4">
                The Mavrixfy platform, including its design, code, and original content, is owned by us and protected 
                by intellectual property laws. All music content remains the property of respective rights holders and 
                is accessed through licensed third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Privacy and Data Protection</h2>
              <p className="mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, 
                use, and protect your information, including data received from third-party platforms like Spotify.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Service Availability and Modifications</h2>
              <p className="mb-4">
                We strive to provide reliable service but cannot guarantee uninterrupted availability. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify, suspend, or discontinue any part of the service</li>
                <li>Update features and functionality</li>
                <li>Perform maintenance and updates</li>
                <li>Change these Terms with appropriate notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Disclaimers and Limitation of Liability</h2>
              <p className="mb-4">
                The service is provided "as is" without warranties of any kind. We disclaim all warranties, 
                express or implied, including but not limited to merchantability and fitness for a particular purpose.
              </p>
              <p className="mb-4">
                In no event shall Mavrixfy be liable for any indirect, incidental, special, consequential, 
                or punitive damages arising from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Account Termination</h2>
              <p className="mb-4">
                We may terminate or suspend your access to the service at our discretion, including for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violation of these Terms</li>
                <li>Violation of third-party platform terms</li>
                <li>Suspected fraudulent or abusive behavior</li>
                <li>Extended periods of inactivity</li>
              </ul>
              <p className="mt-4">You may also terminate your account at any time through your account settings.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">12. Changes to These Terms</h2>
              <p className="mb-4">
                We may update these Terms periodically. Material changes will be communicated through the service 
                or via email. Continued use of the service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">13. Governing Law and Disputes</h2>
              <p className="mb-4">
                These Terms are governed by applicable laws. Any disputes will be resolved through binding arbitration 
                or in courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">14. Contact Information</h2>
              <p className="mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="mb-2">📧 Email: <span className="text-green-400">mavrixesports22@gmail.com</span></p>
                <p>🌐 Website: <span className="text-blue-400">https://www.mavrixfy.site</span></p>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                These Terms of Service are designed to comply with Spotify Developer Terms of Service and 
                support Spotify Extended Quota / Public Access approval.
              </p>
            </div>
          </div>
        </ScrollArea>
        
        <Footer />
      </div>
    </div>
  );
};

export default TermsOfService;