import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@/services/hybridAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, password, fullName);
      toast.success('Account created successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase error messages
      if (error.message.includes('email-already-in-use')) {
        toast.error('Email already in use. Please use a different email or login.');
      } else if (error.message.includes('invalid-email')) {
        toast.error('Invalid email address');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center">
      <div className="w-full max-w-md px-6 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white mr-4" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold text-white">Sign up for Spotify</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-white">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="bg-zinc-800 border-zinc-700 text-white"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                className="bg-zinc-800 border-zinc-700 text-white pr-10"
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
          
          <p className="text-xs text-zinc-400 text-center mt-4">
            By creating an account, you agree to Spotify's Terms of Service and Privacy Policy.
          </p>
        </form>
        
        <div className="border-t border-zinc-800 my-8"></div>
        
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Already have an account?</p>
          <Link 
            to="/login" 
            className="inline-block border border-zinc-700 text-white rounded-full px-8 py-3 font-bold hover:border-white transition-colors"
          >
            Log in to Spotify
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register; 