// Performance optimization utilities for Core Web Vitals

export const optimizeImages = () => {
  // Lazy load images
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
};

export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
  fontLink.as = 'style';
  document.head.appendChild(fontLink);

  // Preload critical images
  const logoLink = document.createElement('link');
  logoLink.rel = 'preload';
  logoLink.href = '/logo.png';
  logoLink.as = 'image';
  document.head.appendChild(logoLink);
};

export const optimizeAnimations = () => {
  // Reduce animations for users who prefer reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    document.documentElement.style.setProperty('--animation-iteration-count', '1');
  }
};

export const measureCoreWebVitals = () => {
  // Measure Largest Contentful Paint (LCP)
  const measureLCP = () => {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  };

  // Measure First Input Delay (FID)
  const measureFID = () => {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
  };

  // Measure Cumulative Layout Shift (CLS)
  const measureCLS = () => {
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  };

  // Initialize measurements
  if ('PerformanceObserver' in window) {
    measureLCP();
    measureFID();
    measureCLS();
  }
};

export const optimizeBundleSize = () => {
  // Code splitting for better performance
  const loadComponent = async (componentName: string) => {
    try {
      const module = await import(`../components/${componentName}`);
      return module.default;
    } catch (error) {
      console.error(`Failed to load component: ${componentName}`, error);
      return null;
    }
  };

  return { loadComponent };
};

export const initializePerformanceOptimizations = () => {
  // Run all optimizations
  preloadCriticalResources();
  optimizeImages();
  optimizeAnimations();
  measureCoreWebVitals();
  
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeImages();
    });
  } else {
    optimizeImages();
  }
};
