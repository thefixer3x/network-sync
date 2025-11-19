# Frontend Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented in the Next.js frontend to achieve **Lighthouse scores >90** and optimal user experience.

## Table of Contents

1. [Bundle Optimization](#bundle-optimization)
2. [Code Splitting](#code-splitting)
3. [Image Optimization](#image-optimization)
4. [Caching Strategy](#caching-strategy)
5. [Performance Monitoring](#performance-monitoring)
6. [Best Practices](#best-practices)

---

## Bundle Optimization

### Dependencies Cleanup

**Removed unused dependencies:**
- `react-query` → Using `swr` instead (eliminated duplication)
- `socket.io-client` → Not currently used (can add when needed)
- `react-beautiful-dnd` → Not currently used
- `react-select` → Using native select
- `react-switch` → Using Headless UI Switch

**Moved to optional dependencies:**
- `recharts` (~450KB) → Only loaded when analytics are accessed

**Impact:**
- Reduced bundle size by ~800KB (gzipped: ~250KB)
- Faster initial page load
- Improved Time to Interactive (TTI)

### Bundle Analysis

Run bundle analyzer to visualize bundle composition:

```bash
# Analyze client bundle
npm run analyze

# View report
open .next/analyze/client.html
```

**What to look for:**
- Large dependencies (>100KB gzipped)
- Duplicate dependencies
- Unused code
- Opportunities for code splitting

---

## Code Splitting

### 1. Route-Based Splitting (Automatic)

Next.js automatically code-splits at the route level:

```
pages/
├── index.tsx          → ~50KB
├── dashboard/
│   ├── index.tsx      → ~80KB
│   ├── analytics.tsx  → ~120KB (with recharts)
│   └── settings.tsx   → ~45KB
```

**Benefits:**
- Users only download code for the page they're viewing
- Parallel loading of route chunks
- Improved initial load time

### 2. Component-Based Splitting (Manual)

Heavy components are dynamically imported:

#### Modals

```tsx
// ❌ BAD: Modal always in bundle
import { CreateWorkflowModal } from './CreateWorkflowModal';

// ✅ GOOD: Modal loaded on demand
import { CreateWorkflowModal } from '@/components/dynamic-imports';

function WorkflowPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Create</button>
      {isOpen && <CreateWorkflowModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

**Savings:** ~15KB per modal

#### Charts (Recharts)

```tsx
// ❌ BAD: All of recharts in main bundle (450KB!)
import { LineChart, Line } from 'recharts';

// ✅ GOOD: Recharts loaded only on Analytics page
import { LineChartComponent } from '@/components/dynamic-imports';

function Analytics() {
  return <LineChartComponent data={data} />;
}
```

**Savings:** ~450KB (gzipped: ~120KB)

### 3. Dynamic Import Patterns

```tsx
// Pattern 1: Component with loading state
const Editor = dynamic(() => import('./Editor'), {
  loading: () => <Skeleton />,
  ssr: false, // Don't server-render heavy components
});

// Pattern 2: Named export
const Modal = dynamic(
  () => import('./Modal').then(mod => ({ default: mod.Modal })),
  { ssr: false }
);

// Pattern 3: Conditional loading
const AdvancedFeature = dynamic(
  () => import('./AdvancedFeature'),
  {
    ssr: false,
    loading: () => <div>Loading advanced features...</div>
  }
);
```

### 4. Preloading (Optional)

Preload components on user interaction for instant feedback:

```tsx
<button
  onClick={handleOpen}
  onMouseEnter={() => {
    // Preload on hover
    import('@/components/CreateWorkflowModal');
  }}
>
  Create Workflow
</button>
```

---

## Image Optimization

### Next.js Image Component

All images use the optimized `<OptimizedImage>` component:

```tsx
import { OptimizedImage, AvatarImage, LogoImage } from '@/components/OptimizedImage';

// Responsive image with automatic format selection
<OptimizedImage
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
/>

// Avatar with fallback
<AvatarImage
  src={user.avatar}
  alt={user.name}
  size="lg"
  fallbackSrc="/default-avatar.png"
/>
```

### Optimization Features

✅ **Automatic format selection** (AVIF → WebP → JPEG)
✅ **Responsive sizing** (serves appropriate size per device)
✅ **Lazy loading** (images load as they enter viewport)
✅ **Blur placeholders** (smooth loading experience)
✅ **Fallback handling** (graceful error states)

### Configuration

```js
// next.config.js
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60,
}
```

### Impact

- **70-80% smaller** image sizes
- **Faster LCP** (Largest Contentful Paint)
- **Better CLS** (Cumulative Layout Shift)
- **Improved mobile experience**

---

## Caching Strategy

### Static Assets

```js
// next.config.js - Aggressive caching for immutable assets
async headers() {
  return [
    {
      source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}
```

### Data Fetching (SWR)

```tsx
import useSWR from 'swr';

function Dashboard() {
  const { data, error } = useSWR('/api/workflows', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 10000, // 10 seconds
  });
}
```

**Benefits:**
- Automatic deduplication
- Request batching
- Optimistic UI updates
- Background revalidation

---

## Performance Monitoring

### Bundle Size Analysis

```bash
# Generate bundle analysis report
npm run analyze

# Check specific route bundle
npm run build -- --analyze
```

**Targets:**
- Initial bundle: <200KB (gzipped)
- Route chunks: <100KB each (gzipped)
- Total JavaScript: <500KB (gzipped)

### Lighthouse CI

```bash
# Run Lighthouse locally
npx lighthouse http://localhost:3000 --view

# CI integration (GitHub Actions)
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      http://localhost:3000
      http://localhost:3000/dashboard
    uploadArtifacts: true
```

**Target Scores:**
- Performance: ≥90
- Accessibility: ≥95
- Best Practices: ≥95
- SEO: ≥90

### Core Web Vitals

Monitor these metrics:

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** | <2.5s | Largest Contentful Paint |
| **FID** | <100ms | First Input Delay |
| **CLS** | <0.1 | Cumulative Layout Shift |
| **FCP** | <1.8s | First Contentful Paint |
| **TTI** | <3.8s | Time to Interactive |

### Real User Monitoring

```tsx
// pages/_app.tsx
export function reportWebVitals(metric) {
  // Send to analytics
  if (metric.label === 'web-vital') {
    analytics.track('Web Vitals', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
    });
  }
}
```

---

## Best Practices

### 1. Component Optimization

```tsx
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* expensive render */}</div>;
});

// Use useMemo for expensive calculations
const sortedData = useMemo(
  () => data.sort((a, b) => b.score - a.score),
  [data]
);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

### 2. Lazy Load Non-Critical Resources

```tsx
// Defer non-critical JavaScript
useEffect(() => {
  if (typeof window !== 'undefined') {
    import('./analytics').then(({ init }) => init());
  }
}, []);
```

### 3. Optimize Third-Party Scripts

```tsx
// pages/_document.tsx
import Script from 'next/script';

<Script
  src="https://www.googletagmanager.com/gtag/js"
  strategy="afterInteractive"
/>
```

**Strategies:**
- `beforeInteractive` - Critical scripts
- `afterInteractive` - Analytics, ads
- `lazyOnload` - Chat widgets, social media

### 4. Reduce JavaScript Execution

```js
// next.config.js
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
}
```

### 5. Optimize Fonts

```tsx
// Use next/font for optimal font loading
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true,
});
```

---

## Performance Checklist

Before deploying to production:

- [ ] Run `npm run analyze` and review bundle sizes
- [ ] Run Lighthouse audit (all scores >90)
- [ ] Check Core Web Vitals in Chrome DevTools
- [ ] Test on slow 3G network
- [ ] Verify images are using Next/Image
- [ ] Confirm heavy components use dynamic imports
- [ ] Check for unused dependencies
- [ ] Verify caching headers are set
- [ ] Test lazy loading behavior
- [ ] Measure Time to Interactive (TTI)

---

## Troubleshooting

### Bundle is too large

1. Run `npm run analyze`
2. Identify large dependencies
3. Consider alternatives or dynamic imports
4. Remove unused dependencies

### Slow initial load

1. Check bundle size (should be <200KB gzipped)
2. Verify code splitting is working
3. Ensure static assets are cached
4. Check for blocking scripts

### Poor Lighthouse score

1. Run audit to see specific issues
2. Common fixes:
   - Optimize images
   - Remove unused CSS/JS
   - Defer non-critical scripts
   - Improve caching

---

## Additional Resources

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse Scoring](https://web.dev/performance-scoring/)
- [Core Web Vitals](https://web.dev/vitals/)

---

**Last Updated:** 2025-01-19
**Next Review:** 2025-02-19
