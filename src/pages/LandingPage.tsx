/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Star, 
  Users, 
  Zap, 
  Sparkles, 
  Scissors,
  Type,
  Hash,
  TrendingUp,
  Clock,
  Target,
  Rocket
} from 'lucide-react';
import Typewriter from '../components/Typewriter';
import Navbar from '../components/Navbar';
// import { supabase } from '../lib/supabaseClient';

const LandingPage = () => {
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: Zap,
      title: 'AI Clip Finder',
      description: 'Automatically identifies the most engaging moments in your content'
    },
    {
      icon: Type,
      title: 'Auto-Captions in Your Brand Style',
      description: 'Generate captions that match your unique voice and brand personality'
    },
    {
      icon: Hash,
      title: 'Platform-Specific Formatting',
      description: 'Perfect sizing and formatting for TikTok, YouTube Shorts, Instagram Reels'
    },
    {
      icon: Hash,
      title: 'AI-Optimized Hashtags',
      description: 'Smart hashtag suggestions tailored to maximize reach and engagement'
    },
    {
      icon: Hash,
      title: 'Search-by-Prompt',
      description: 'Find specific moments with natural language: "funny parts" or "remove boring sections"'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Content Creator',
      rating: 5,
      content: 'This tool saved me 10+ hours per week. I went from posting once a week to daily across all platforms!'
    },
    {
      name: 'Mike Rodriguez',
      role: 'Social Media Manager',
      rating: 5,
      content: 'Our engagement increased 300% after using Zuexis. The captions are spot-on every time.'
    },
    {
      name: 'Jessica Park',
      role: 'YouTuber',
      rating: 5,
      content: 'Finally, a tool that understands what makes content viral. My clips are getting millions of views!'
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll-driven transform fallback for PNG mockup (broad browser support)
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll<HTMLElement>('.scrolly');
      const scrollY = window.scrollY || window.pageYOffset;
      elements.forEach((el) => {
        const speedAttr = el.getAttribute('data-speed');
        const speed = speedAttr ? parseFloat(speedAttr) : 0.08;
        el.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-x-hidden">
      <Navbar />
      
      {/* STUNNING HERO SECTION */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Enhanced Background Elements */}
        <div className="absolute inset-0 bg-mesh-sheen"></div>
        <div className="absolute inset-0 bg-grid-soft opacity-20"></div>
        
        {/* Radial Pulse Spotlight */}
        <div className="radial-pulse"></div>
        
        {/* Enhanced Floating Blobs with Better Positioning */}
        <div className="blob-animated absolute top-20 left-10 w-72 h-72 bg-purple-500/20"></div>
        <div className="blob-animated absolute top-40 right-20 w-96 h-96 bg-blue-500/20" style={{ animationDelay: '2s' }}></div>
        <div className="blob-animated absolute bottom-20 left-1/4 w-80 h-80 bg-indigo-500/20" style={{ animationDelay: '4s' }}></div>
        
        {/* Floating Geometric Elements */}
        <div className="absolute top-1/4 left-1/6 w-4 h-4 bg-purple-400 rounded-full opacity-60 float-slow"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-60 float-slow delay-1"></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-indigo-400 rounded-full opacity-60 float-slow delay-2"></div>
        
        {/* Main Hero Content */}
        <div className="relative max-w-7xl mx-auto text-center z-10">
          {/* Badge */}
          <div className="animate-fade-in-up mb-8">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>AI-Powered Video Transformation</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </div>

          {/* Main Headline - Hitting Harder with Financial Benefit First */}
          <div className="animate-fade-in-up mb-8">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 leading-tight tracking-tight">
              Turn Hours of Content Into
              <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mt-2">
                Viral Shorts — Instantly
              </span>
          </h1>
          </div>
            
          {/* Enhanced Subtitle - Leading with Results and Financial Benefit */}
          <div className="animate-fade-in-up mb-12">
              <Typewriter
              phrases={[
                "Stop wasting hours editing. Zuexis finds your best moments, captions them, and formats for every platform in minutes.",
                "One Video. Dozens of Viral Clips. Zero Editing. Save 10+ hours per video while creating content that actually performs."
              ]}
              typingSpeedMs={25}
              className="text-xl sm:text-2xl lg:text-3xl text-gray-300 max-w-5xl mx-auto leading-relaxed font-light"
              loop={false}
              />
            </div>

          {/* Key Benefits Pills - Emphasizing Financial Benefits */}
          <div className="animate-fade-in-up mb-12">
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {[
                { icon: Clock, text: "Save 10+ Hours", color: "from-green-500 to-emerald-500" },
                { icon: Target, text: "50+ Viral Clips", color: "from-purple-500 to-pink-500" },
                { icon: Rocket, text: "Zero Editing", color: "from-blue-500 to-cyan-500" }
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full">
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${benefit.color}`}></div>
                  <benefit.icon className="h-4 w-4 text-gray-300" />
                  <span className="text-sm font-medium text-gray-300">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>
            
          {/* Enhanced CTA Buttons */}
          <div className="animate-fade-in-up mb-16">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="group relative bg-gradient-to-r from-purple-500 to-blue-500 px-10 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10">Go to Dashboard</span>
                  <ArrowRight className="h-6 w-6 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
                  <div className="gradient-beam"></div>
                </Link>
              ) : (
                <>
            <Link
              to="/signup"
                    className="group relative bg-gradient-to-r from-purple-500 to-blue-500 px-10 py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-3 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10">Start Free Trial</span>
                    <ArrowRight className="h-6 w-6 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
                    <div className="gradient-beam"></div>
                  </Link>
                  <Link
                    to="/login"
                    className="group px-10 py-5 rounded-2xl font-bold text-xl border-2 border-gray-600 hover:border-purple-500 hover:text-purple-400 transition-all duration-300 backdrop-blur-sm bg-gray-800/30 hover:bg-gray-700/50"
                  >
                    <span>Sign In</span>
            </Link>
                </>
              )}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-gray-400">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">10,000+ Creators</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="text-sm">4.9/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-400" />
                <span className="text-sm">AI-Powered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Video Preview Mockup */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 hidden lg:block">
          <div className="relative w-80 h-64 scrolly" data-speed="0.05">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl backdrop-blur-sm border border-white/10"></div>
            <div className="absolute inset-2 bg-gray-800 rounded-xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <Play className="h-16 w-16 text-purple-400 opacity-60" />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-24 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Scissors className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce-y">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* How It Works - Mobile carousel */}
      <section id="how-it-works" className="md:hidden py-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800/50 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Simple 3-Step Process</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">How It Works</span>
          </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Transform your content in minutes, not hours</p>
          </div>
          <div className="marquee -mx-4 px-4">
            <div className="marquee-track slow">
              {[
                {
                  step: '01',
                  title: 'Upload Your Video',
                  description: 'Drag & drop or paste a link',
                  icon: Scissors,
                  color: 'from-purple-500 to-blue-500'
                },
                {
                  step: '02',
                  title: 'AI Finds Moments',
                  description: 'Detects hooks and writes captions',
                  icon: Zap,
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  step: '03',
                  title: 'Download or Post',
                  description: 'Perfect platform formats',
                  icon: Rocket,
                  color: 'from-cyan-500 to-purple-500'
                }
              ].concat([
                {
                  step: '01',
                  title: 'Upload Your Video',
                  description: 'Drag & drop or paste a link',
                  icon: Scissors,
                  color: 'from-purple-500 to-blue-500'
                },
                {
                  step: '02',
                  title: 'AI Finds Moments',
                  description: 'Detects hooks and writes captions',
                  icon: Zap,
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  step: '03',
                  title: 'Download or Post',
                  description: 'Perfect platform formats',
                  icon: Rocket,
                  color: 'from-cyan-500 to-purple-500'
                }
              ]).map((item, index) => (
                <div key={`how-m-${index}`} className="w-80 shrink-0 bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 mx-3 hover:border-purple-500/50 transition-all duration-300 group">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-sm font-bold text-purple-400 mb-2">{item.step}</div>
                  <div className="text-xl font-bold mb-2">{item.title}</div>
                  <div className="text-gray-300 text-sm leading-relaxed">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Desktop grid */}
       <section className="hidden md:block py-24 px-4 bg-gradient-to-b from-gray-900 to-gray-800/50 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Simple 3-Step Process</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">Transform your content in minutes, not hours with our AI-powered workflow</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Upload Your Video',
                description: 'Drag and drop your long-form content or paste a YouTube link. Our system handles any format.',
                icon: Scissors,
                color: 'from-purple-500 to-blue-500',
                delay: '0ms'
              },
              {
                step: '02',
                title: 'AI Finds Viral Moments',
                description: 'Our advanced AI analyzes your content and identifies the most engaging, shareable moments automatically.',
                icon: Zap,
                color: 'from-blue-500 to-cyan-500',
                delay: '200ms'
              },
              {
                step: '03',
                title: 'Download or Post',
                description: 'Get perfectly formatted clips with captions, hashtags, and titles ready for each platform.',
                icon: Rocket,
                color: 'from-cyan-500 to-purple-500',
                delay: '400ms'
              }
            ].map((item, index) => (
              <div key={`how-${index}`} className="text-center relative animate-fade-in-up group" style={{ animationDelay: item.delay }}>
                <div className="relative">
                  <div className={`bg-gradient-to-r ${item.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                <div className="text-sm font-bold text-purple-400 mb-3">{item.step}</div>
                <h3 className="text-2xl font-bold mb-4 text-white">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed text-base max-w-sm mx-auto">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎬 COMPELLING DEMO SECTION - Show Results Before Features */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-800/50 to-gray-900 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <Play className="h-4 w-4 text-green-400" />
              <span>See It In Action</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                From Upload to Viral Clip in 60 Seconds
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed">
              Watch how Zuexis transforms a 30-minute video into dozens of viral clips with zero editing work
            </p>
          </div>
          
          {/* Demo Process Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: '01',
                title: 'Upload Video',
                description: 'Drag & drop any video file',
                icon: '📁',
                color: 'from-blue-500 to-cyan-500',
                time: '5 seconds'
              },
              {
                step: '02',
                title: 'AI Processing',
                description: 'Finds viral moments automatically',
                icon: '🤖',
                color: 'from-purple-500 to-pink-500',
                time: '45 seconds'
              },
              {
                step: '03',
                title: 'Download Clips',
                description: 'Ready-to-post viral content',
                icon: '🎬',
                color: 'from-green-500 to-emerald-500',
                time: '10 seconds'
              }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 animate-fade-in-up hover:shadow-2xl hover:shadow-purple-500/10" style={{ animationDelay: `${index * 200}ms` }}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">{item.icon}</div>
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-16 h-16 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <span className="text-white font-bold text-2xl">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                    <p className="text-gray-300 mb-4 leading-relaxed text-sm">{item.description}</p>
                    <div className="inline-flex items-center space-x-2 bg-gray-700/50 px-3 py-1 rounded-full">
                      <Clock className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">{item.time}</span>
                    </div>
                  </div>
                </div>
                
                {/* Connection Line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 transform -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
          
          {/* Results Showcase */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-4 bg-gray-800/80 backdrop-blur-sm px-8 py-6 rounded-2xl border border-gray-700/50">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">10x</div>
                <div className="text-gray-400 text-sm">Faster</div>
              </div>
              <div className="w-px h-12 bg-gray-600"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">3</div>
                <div className="text-gray-400 text-sm">Clips per Video</div>
              </div>
              <div className="w-px h-12 bg-gray-600"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">0</div>
                <div className="text-gray-400 text-sm">Editing Required</div>
              </div>
            </div>
          </div>
          
          {/* Mini Demo Visual - Process Flow Animation */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">See the Magic Happen</h3>
                <p className="text-gray-400">Watch how Zuexis transforms your content</p>
              </div>
              
              {/* Process Flow Visualization */}
              <div className="flex items-center justify-center space-x-8 mb-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-3 animate-pulse">
                    <span className="text-white text-2xl">📁</span>
                  </div>
                  <div className="text-sm text-gray-400">Upload</div>
                </div>
                
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3 animate-pulse" style={{ animationDelay: '0.5s' }}>
                    <span className="text-white text-2xl">🤖</span>
                  </div>
                  <div className="text-sm text-gray-400">AI Process</div>
                </div>
                
                <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-green-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-3 animate-pulse" style={{ animationDelay: '1.5s' }}>
                    <span className="text-white text-2xl">🎬</span>
                  </div>
                  <div className="text-sm text-gray-400">Viral Clips</div>
                </div>
              </div>
              
              {/* Time Indicator */}
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-full">
                  <Clock className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">Total Time: 60 Seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 🚀 COMPELLING CTA AFTER DEMO */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Save Hours of Editing Time?
            </h3>
            <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              Join 10,000+ creators who are already using Zuexis to turn their long videos into viral gold
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 rounded-xl font-bold text-lg border-2 border-gray-600 hover:border-purple-500 hover:text-purple-400 transition-all duration-300 bg-gray-800/50 hover:bg-gray-700/50"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Mobile carousel */}
       <section id="features" className="md:hidden py-20 px-4 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Cutting-Edge AI Technology</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Powerful Features</span>
          </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Everything you need to create viral content</p>
          </div>
          <div className="marquee -mx-4 px-4">
            <div className="marquee-track fast">
              {features.concat(features).map((feature, index) => (
                <div key={`feat-m-${index}`} className="w-80 shrink-0 bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 mx-3 hover:border-purple-500/50 transition-all duration-300 group">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-xl font-bold mb-3 text-white">{feature.title}</div>
                  <div className="text-gray-300 text-sm leading-relaxed">{feature.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Desktop grid */}
       <section className="hidden md:block py-24 px-4 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Cutting-Edge AI Technology</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">Everything you need to create viral content that engages and converts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={`feat-${index}`} className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl hover:bg-gray-700/80 transition-all duration-300 border border-gray-700/50 hover:border-purple-500/50 animate-fade-in-up group hover:shadow-2xl hover:shadow-purple-500/10" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
       <section className="py-24 px-4 bg-gradient-to-b from-gray-800/50 to-gray-900 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>Trusted by 10,000+ Creators</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Loved by Creators
            </span>
          </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">See what our users are saying about their success with Zuexis</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 animate-fade-in-up group hover:shadow-2xl hover:shadow-purple-500/10" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed text-lg italic">"{testimonial.content}"</p>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
       <section id="pricing" className="py-24 px-4 reveal-on-scroll">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-full text-sm font-medium text-gray-300 mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span>Choose Your Plan</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Simple Pricing
            </span>
          </h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">Start free and scale as you grow. No hidden fees, no surprises.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: '/month',
                features: [
                  '3 videos per month',

                  'Basic captions',
                  'Standard formats'
                ],
                cta: 'Start Free',
                popular: false,
                color: 'from-gray-500 to-gray-600'
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                features: [
                  'Unlimited videos',
                  'Unlimited clips',
                  'Custom brand captions',
                  'All platform formats',
                  'Priority processing',
                  'Advanced AI prompts'
                ],
                cta: 'Start Pro',
                popular: true,
                color: 'from-purple-500 to-blue-500'
              },
              {
                name: 'Agency',
                price: '$99',
                period: '/month',
                features: [
                  'Everything in Pro',
                  'Team collaboration',
                  'White-label exports',
                  'API access',
                  'Priority support',
                  'Custom integrations'
                ],
                cta: 'Contact Sales',
                popular: false,
                color: 'from-blue-500 to-cyan-500'
              }
            ].map((plan, index) => (
              <div key={index} className={`bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl border relative animate-fade-in-up group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 ${
                plan.popular ? 'border-purple-500 transform scale-105' : 'border-gray-700/50 hover:border-purple-500/50'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-2 rounded-full text-sm font-bold text-white shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold mb-4 text-white">{plan.name}</h3>
                <div className="mb-6">
                    <span className="text-5xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{plan.price}</span>
                    <span className="text-gray-400 text-xl">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-base">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/dashboard"
                  className={`block w-full text-center py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg transform hover:scale-105 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-gray-800 to-gray-900 border-t border-gray-700/50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl shadow-lg">
                  <Scissors className="h-8 w-8 text-white" />
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Zuexis
                </span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md">Stop wasting hours editing. Zuexis finds your best moments, captions them, and formats for every platform in minutes.</p>
              <div className="flex space-x-4 mt-6">
                <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center hover:bg-purple-500/20 transition-colors duration-300">
                  <span className="text-gray-400 hover:text-purple-400 transition-colors duration-300">𝕏</span>
                </div>
                <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center hover:bg-purple-500/20 transition-colors duration-300">
                  <span className="text-gray-400 hover:text-purple-400 transition-colors duration-300">📘</span>
                </div>
                <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center hover:bg-purple-500/20 transition-colors duration-300">
                  <span className="text-gray-400 hover:text-purple-400 transition-colors duration-300">📷</span>
                </div>
            </div>
            </div>
            <div>
              <h4 className="font-bold text-white text-lg mb-6">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-purple-400 transition-colors duration-300">Features</a></li>
                <li><a href="#pricing" className="hover:text-purple-400 transition-colors duration-300">Pricing</a></li>
                <li><Link to="/dashboard" className="hover:text-purple-400 transition-colors duration-300">Try Free</Link></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors duration-300">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white text-lg mb-6">Company</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-purple-400 transition-colors duration-300">About</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors duration-300">Contact</a></li>
                <li><Link to="/privacy" className="hover:text-purple-400 transition-colors duration-300">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-purple-400 transition-colors duration-300">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700/50 mt-12 pt-8 text-center">
            <div className="flex flex-col md:flex-row items-center justify-between text-gray-400">
            <p>&copy; 2025 Zuexis. All rights reserved.</p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <span className="text-sm">Made with ❤️ for creators</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
