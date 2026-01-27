import { Link, useNavigate } from 'react-router-dom';
import { Play, Music, Users, Heart, Shield, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121212] text-white overflow-hidden">
      {/* Header */}
      <header className="relative z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/mavrixfy.png"
                alt="Mavrixfy"
                className="h-10 w-10 object-contain transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">Mavrixfy</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/privacy" 
              className="text-white/70 hover:text-white text-sm font-medium transition-colors relative group"
            >
              Privacy Policy
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full"></span>
            </Link>
            <Link 
              to="/terms" 
              className="text-white/70 hover:text-white text-sm font-medium transition-colors relative group"
            >
              Terms of Service
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-500 transition-all group-hover:w-full"></span>
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              className="text-white hover:bg-white/10 font-medium"
            >
              Log in
            </Button>
            <Button
              onClick={() => navigate('/register')}
              className="rounded-full bg-white hover:bg-white/90 text-black font-bold px-6 hover:scale-105 transition-all"
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Professional Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0f0f0f]">
          <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/8 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/6 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/4 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-white/90">Free Music Streaming Platform</span>
          </div>
          
          {/* Enhanced Title with Professional Animation */}
          <div className="mb-8 overflow-hidden">
            <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-black tracking-tight leading-none">
              <span className="inline-block animate-[slideUp_1s_ease-out] bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                Mavrixfy
              </span>
            </h1>
          </div>
          
          <div className="mb-12 animate-[fadeInUp_1.2s_ease-out]">
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed font-light">
              Discover millions of songs, create personalized playlists, and share your musical journey with the world.
            </p>
            <p className="text-lg text-green-400 font-medium mt-2">
              All for free, forever.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-[fadeInUp_1.4s_ease-out]">
            <Button
              onClick={() => navigate('/register')}
              className="group relative rounded-full bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 text-lg h-auto transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-green-500/25"
            >
              <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              Start Listening Free
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="rounded-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 font-bold px-8 py-4 text-lg h-auto backdrop-blur-sm transition-all duration-300"
            >
              I have an account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Professional Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-[fadeInUp_1.6s_ease-out]">
            <div className="text-center group">
              <div className="text-3xl font-bold text-white mb-1 transition-colors group-hover:text-green-400">10M+</div>
              <div className="text-sm text-white/60 font-medium">Songs Available</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-white mb-1 transition-colors group-hover:text-blue-400">50K+</div>
              <div className="text-sm text-white/60 font-medium">Active Users</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-white mb-1 transition-colors group-hover:text-purple-400">100%</div>
              <div className="text-sm text-white/60 font-medium">Free Forever</div>
            </div>
          </div>
        </div>

        {/* Elegant Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/40 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Everything you need to
              <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                enjoy music
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto font-light">
              Powerful features designed to enhance your music experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Music,
                title: "Unlimited Streaming",
                description: "Access millions of songs from various genres and artists. High-quality audio streaming with no limits.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: Users,
                title: "Social Playlists",
                description: "Create, share, and discover playlists. Connect with friends and explore music together.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Heart,
                title: "Smart Recommendations",
                description: "AI-powered suggestions based on your taste. Discover new favorites tailored just for you.",
                gradient: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => (
              <div key={index} className="group relative">
                <div className="relative p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-500 hover:scale-105">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-white/70 leading-relaxed font-light">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Functionality & Privacy Section */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-transparent to-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
                Built for
                <span className="block text-green-400">music lovers</span>
              </h2>
              
              <div className="space-y-6 mb-8">
                {[
                  "Stream from multiple sources including JioSaavn",
                  "Create unlimited personal playlists",
                  "Discover trending and curated music",
                  "Share your favorite songs with friends",
                  "Sync with Spotify to import your library"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-white/80 text-lg font-light">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => navigate('/register')}
                className="rounded-full bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 hover:scale-105 transition-all"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="h-8 w-8 text-green-500" />
                  <h3 className="text-2xl font-bold text-white">Privacy First</h3>
                </div>
                
                <p className="text-white/80 mb-6 font-light leading-relaxed">
                  Your data is safe with us. We only collect what's necessary to provide you with the best music experience.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: Lock, text: "Profile info for personalization" },
                    { icon: Lock, text: "Music preferences for recommendations" },
                    { icon: Lock, text: "Playlist data for synchronization" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-white/70 font-light">{item.text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-white/60 font-light">
                    We never sell your data. Read our{' '}
                    <Link to="/privacy" className="text-green-400 hover:text-green-300 underline font-medium">
                      Privacy Policy
                    </Link>{' '}
                    for complete details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-blue-600/20 to-purple-600/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Your music journey
            <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              starts here
            </span>
          </h2>
          <p className="text-xl text-white/70 mb-12 font-light max-w-2xl mx-auto">
            Join thousands of music enthusiasts who've already discovered their new favorite songs on Mavrixfy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/register')}
              className="group rounded-full bg-white hover:bg-white/90 text-black font-bold px-8 py-4 text-lg h-auto hover:scale-105 transition-all shadow-2xl"
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Start Your Journey
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="rounded-full border-white/30 text-white hover:bg-white/10 font-bold px-8 py-4 text-lg h-auto backdrop-blur-sm transition-all"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;