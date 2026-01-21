import React from 'react';
import FacebookLoginButton from '@/components/FacebookLoginButton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const FacebookLoginTest: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = (user: any) => {
    console.log('Facebook login successful:', user);
    alert(`Welcome ${user.name}! Facebook login successful.`);
  };

  const handleError = (error: any) => {
    console.error('Facebook login failed:', error);
    alert(`Facebook login failed: ${error.message}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Facebook Login Test
          </h1>
          <p className="text-gray-600">
            Test the Facebook login integration
          </p>
        </div>

        <div className="space-y-4">
          {/* Default Facebook Login Button */}
          <FacebookLoginButton
            onSuccess={handleSuccess}
            onError={handleError}
            className="w-full"
          />

          {/* Custom styled Facebook Login Button */}
          <FacebookLoginButton
            onSuccess={handleSuccess}
            onError={handleError}
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span>Sign in with Facebook</span>
          </FacebookLoginButton>

          {/* Compact Facebook Login Button */}
          <FacebookLoginButton
            onSuccess={handleSuccess}
            onError={handleError}
            variant="outline"
            className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <span>Facebook</span>
          </FacebookLoginButton>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Button
            onClick={() => navigate('/login')}
            variant="ghost"
            className="w-full text-gray-600"
          >
            ← Back to Login Page
          </Button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>
            Make sure you have configured your Facebook App ID in the environment variables.
          </p>
          <p className="mt-2">
            Check the console for detailed logs during the authentication process.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FacebookLoginTest;