/**
 * Dynamic Imports for Code Splitting
 *
 * This file contains dynamically imported components to reduce initial bundle size.
 * Components are only loaded when they're actually needed.
 */

import dynamic from 'next/dynamic';
import { LoadingSpinner } from './ui/LoadingSpinner';

// =============================================================================
// MODALS - Lazy loaded when opened
// =============================================================================

/**
 * CreateWorkflowModal - Dynamically imported
 * Only loads when user clicks "Create Workflow" button
 * Reduces initial bundle by ~15KB
 */
export const CreateWorkflowModal = dynamic(
  () => import('./dashboard/CreateWorkflowModal').then(mod => ({ default: mod.CreateWorkflowModal })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    ),
    ssr: false, // Modals don't need SSR
  }
);

/**
 * ConnectAccountModal - Dynamically imported
 * Only loads when user clicks "Connect Account" button
 * Reduces initial bundle by ~10KB
 */
export const ConnectAccountModal = dynamic(
  () => import('./dashboard/ConnectAccountModal').then(mod => ({ default: mod.ConnectAccountModal })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner />
      </div>
    ),
    ssr: false,
  }
);

// =============================================================================
// CHARTS & ANALYTICS - Heavy libraries loaded on demand
// =============================================================================

/**
 * Recharts Components - Dynamically imported
 * Only loads when Analytics page is visited
 * Reduces initial bundle by ~450KB (recharts is heavy!)
 */
export const LineChartComponent = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  {
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
    ssr: false,
  }
);

export const BarChartComponent = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  {
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
    ssr: false,
  }
);

export const AreaChartComponent = dynamic(
  () => import('recharts').then(mod => mod.AreaChart),
  {
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
    ssr: false,
  }
);

// =============================================================================
// HEAVY UI COMPONENTS - Lazy loaded
// =============================================================================

/**
 * Rich Text Editor - Dynamically imported
 * Only loads when creating/editing content
 * Reduces initial bundle significantly
 */
export const RichTextEditor = dynamic(
  () => import('./ui/RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => (
      <div className="h-64 bg-gray-100 animate-pulse rounded" />
    ),
    ssr: false,
  }
);

/**
 * CodeEditor - Dynamically imported
 * Only loads when editing workflow configurations
 * Reduces initial bundle by ~200KB
 */
export const CodeEditor = dynamic(
  () => import('./ui/CodeEditor').then(mod => ({ default: mod.CodeEditor })),
  {
    loading: () => (
      <div className="h-96 bg-gray-900 animate-pulse rounded" />
    ),
    ssr: false,
  }
);

// =============================================================================
// CALENDAR & DATE PICKERS - Lazy loaded
// =============================================================================

/**
 * ContentCalendar - Dynamically imported
 * Only loads when Calendar tab is active
 * Reduces initial bundle by ~30KB
 */
export const ContentCalendar = dynamic(
  () => import('./dashboard/ContentCalendar').then(mod => ({ default: mod.ContentCalendar })),
  {
    loading: () => (
      <div className="h-full bg-gray-100 animate-pulse rounded" />
    ),
    ssr: false,
  }
);

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/**
 * Example: Using Dynamic Imports in a Component
 *
 * ```tsx
 * import { CreateWorkflowModal } from '@/components/dynamic-imports';
 *
 * function WorkflowPage() {
 *   const [isModalOpen, setIsModalOpen] = useState(false);
 *
 *   return (
 *     <div>
 *       <button onClick={() => setIsModalOpen(true)}>
 *         Create Workflow
 *       </button>
 *
 *       {isModalOpen && (
 *         <CreateWorkflowModal
 *           isOpen={isModalOpen}
 *           onClose={() => setIsModalOpen(false)}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * Benefits:
 * - Modal code only loads when button is clicked
 * - Initial page load is faster
 * - Better Core Web Vitals (LCP, FCP)
 * - Improved Lighthouse score
 */

// =============================================================================
// PRELOADING (Optional)
// =============================================================================

/**
 * Preload critical components on hover/focus
 * This gives users instant feedback while maintaining lazy loading benefits
 *
 * Usage:
 * ```tsx
 * <button
 *   onClick={handleCreateWorkflow}
 *   onMouseEnter={() => {
 *     // Preload modal on hover
 *     import('./dashboard/CreateWorkflowModal');
 *   }}
 * >
 *   Create Workflow
 * </button>
 * ```
 */
