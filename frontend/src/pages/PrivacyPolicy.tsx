import { ScrollArea } from '@/components/ui/scroll-area';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 text-gray-300">
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-4">Last updated: January 2026</p>
              <p className="mb-4">
                Mavrixfy ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. 
                This Privacy Policy explains how we collect, use, and protect data when you use our website and services, 
                including authentication through third-party platforms such as Spotify.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p className="mb-4">We collect only the information necessary to provide and improve our services.</p>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-2">a) Information You Provide</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Email address (if you sign up or contact support)</li>
                  <li>Username or display name</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-2">b) Information from Spotify (With Your Consent)</h3>
                <p className="mb-2">When you log in using Spotify, we may access:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Spotify user ID</li>
                  <li>Display name</li>
                  <li>Profile image</li>
                  <li>Email address (if permission is granted)</li>
                  <li>Public playlists and basic account information</li>
                </ul>
                <p className="mt-2 text-yellow-400 font-medium">
                  We do not access private listening history or stream/download music from Spotify.
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-2">c) Automatically Collected Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Device type, browser type</li>
                  <li>IP address (for security and fraud prevention)</li>
                  <li>Usage data (pages visited, interactions)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-2">d) Cookies</h3>
                <p>We use cookies and similar technologies to maintain sessions, improve performance, and enhance user experience.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p className="mb-4">We use collected data to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Authenticate users securely</li>
                <li>Display user profiles and personalized content</li>
                <li>Improve app performance and features</li>
                <li>Communicate service-related updates</li>
                <li>Prevent misuse, fraud, or unauthorized access</li>
              </ul>
              <p className="mt-4 font-medium text-green-400">We do not use your data for unsolicited marketing.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Spotify Data Usage Compliance</h2>
              <p className="mb-4 text-green-400 font-medium">Mavrixfy complies fully with Spotify Developer Policies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Spotify data is used only for app functionality requested by the user</li>
                <li>No Spotify data is sold, shared, or redistributed</li>
                <li>No music is streamed, downloaded, or stored outside Spotify's official APIs</li>
                <li>Users may disconnect their Spotify account at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Information Sharing</h2>
              <p className="mb-4 font-medium text-green-400">We do not sell or rent your personal information.</p>
              <p className="mb-2">Data may be shared only:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>When required by law</li>
                <li>To protect security or prevent fraud</li>
                <li>With trusted infrastructure providers (hosting, analytics) under strict confidentiality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
              <p className="mb-4">We implement industry-standard security measures to protect your information, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Secure authentication</li>
                <li>Encrypted data transmission</li>
                <li>Restricted access to sensitive data</li>
              </ul>
              <p className="mt-4 text-yellow-400">
                However, no system is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Cookies and Tracking Technologies</h2>
              <p className="mb-4">Cookies help us:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keep users logged in</li>
                <li>Understand app usage</li>
                <li>Improve functionality</li>
              </ul>
              <p className="mt-4">
                You can disable cookies through your browser settings, though some features may not function properly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Services</h2>
              <p className="mb-4">
                Our services may integrate with third-party platforms (such as Spotify). We are not responsible for 
                the privacy practices of third-party services. Please review their privacy policies separately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Disconnect Spotify authorization at any time</li>
                <li>Opt out of non-essential communications</li>
              </ul>
              <p className="mt-4">To exercise these rights, contact us using the details below.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Data Retention</h2>
              <p className="mb-4">
                We retain user data only as long as necessary to provide services or comply with legal obligations. 
                Disconnected or deleted accounts will have their data removed within a reasonable timeframe.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy periodically. Any changes will be posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
              <p className="mb-4">
                If you have any questions or concerns about this Privacy Policy or your data:
              </p>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="mb-2">📧 Email: <span className="text-green-400">mavrixesports22@gmail.com</span></p>
                <p>🌐 Website: <span className="text-blue-400">https://www.mavrixfy.site</span></p>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                This Privacy Policy is specifically designed to comply with Spotify Developer Terms of Service and is suitable for Spotify Extended Quota / Public Access approval.
              </p>
            </div>
          </div>
        </ScrollArea>
        
        <Footer />
      </div>
    </div>
  );
};

export default PrivacyPolicy;