// SEO configuration for different pages

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  image: string;
  url: string;
  type: string;
  structuredData?: any;
}

export const seoConfigs: Record<string, SEOConfig> = {
  home: {
    title: "Zuexis — AI Video Clipper | Turn Long Videos Into Viral Shorts Instantly",
    description: "Transform hours of content into viral shorts in minutes. AI finds your best moments, adds captions, and formats for TikTok, YouTube Shorts, Instagram Reels. Save 10+ hours per video. Start free!",
    keywords: "AI video clipper, viral video maker, TikTok video editor, YouTube Shorts creator, Instagram Reels, video repurposing, AI content creation, video editing automation, social media content, viral clips",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com",
    type: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Zuexis AI Video Clipper",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Web Browser",
      "description": "AI-powered video clipper that automatically finds viral moments in your videos, adds captions, and formats them for social media platforms",
      "url": "https://zuexis.com",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "10000"
      }
    }
  },
  
  pricing: {
    title: "Pricing - Zuexis AI Video Clipper | Affordable Plans for Content Creators",
    description: "Choose the perfect plan for your content creation needs. Free tier available. Pro plans start at $29/month. Unlimited videos, AI captions, and viral clip generation.",
    keywords: "AI video clipper pricing, video editing software cost, content creator tools pricing, viral video maker subscription, TikTok video editor plans",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/pricing",
    type: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Zuexis AI Video Clipper",
      "description": "AI-powered video clipper for creating viral shorts",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Plan",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "29",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        }
      ]
    }
  },
  
  features: {
    title: "Features - Zuexis AI Video Clipper | Advanced Video Editing Tools",
    description: "Discover powerful AI features: automatic viral moment detection, smart captions, platform-specific formatting, hashtag optimization, and more. Create engaging content effortlessly.",
    keywords: "AI video clipper features, viral video detection, automatic captions, TikTok formatting, YouTube Shorts creator, Instagram Reels maker, video editing automation",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/features",
    type: "website"
  },
  
  login: {
    title: "Login - Zuexis AI Video Clipper | Access Your Account",
    description: "Sign in to your Zuexis account and start creating viral videos. Access your projects, clips, and AI-powered video editing tools.",
    keywords: "Zuexis login, AI video clipper account, video editing login, content creator dashboard",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/login",
    type: "website"
  },
  
  signup: {
    title: "Sign Up - Zuexis AI Video Clipper | Start Creating Viral Videos Free",
    description: "Join thousands of creators using Zuexis to turn long videos into viral shorts. Free trial available. No credit card required.",
    keywords: "Zuexis signup, AI video clipper free trial, viral video maker registration, content creator signup",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/signup",
    type: "website"
  },
  
  dashboard: {
    title: "Dashboard - Zuexis AI Video Clipper | Manage Your Video Projects",
    description: "Access your video projects, view generated clips, and manage your content creation workflow. Create new viral videos with our AI-powered tools.",
    keywords: "Zuexis dashboard, video project management, AI video clipper projects, content creator dashboard",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/dashboard",
    type: "website"
  },
  
  privacy: {
    title: "Privacy Policy - Zuexis AI Video Clipper | Your Data Protection",
    description: "Learn how Zuexis protects your privacy and handles your data. We're committed to keeping your video content and personal information secure.",
    keywords: "Zuexis privacy policy, AI video clipper privacy, data protection, video content security",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/privacy",
    type: "website"
  },
  
  terms: {
    title: "Terms of Service - Zuexis AI Video Clipper | Usage Terms",
    description: "Read our terms of service for using Zuexis AI video clipper. Understand your rights and responsibilities when creating viral content.",
    keywords: "Zuexis terms of service, AI video clipper terms, usage agreement, content creation terms",
    image: "https://zuexis.com/logo.png",
    url: "https://zuexis.com/terms",
    type: "website"
  }
};

export const getSEOConfig = (pathname: string): SEOConfig => {
  const path = pathname.replace('/', '') || 'home';
  return seoConfigs[path] || seoConfigs.home;
};

export const generateStructuredData = (config: SEOConfig) => {
  if (!config.structuredData) return null;
  
  return {
    "@context": "https://schema.org",
    ...config.structuredData
  };
};
