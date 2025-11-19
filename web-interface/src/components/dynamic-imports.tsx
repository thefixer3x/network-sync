/**
 * Dynamic Imports for Code Splitting
 *
 * This file contains dynamically imported components to reduce initial bundle size.
 * Components are only loaded when they're actually needed.
 *
 * Note: Some imports are commented out until the components are created.
 */

import dynamic from 'next/dynamic';

// =============================================================================
// WORKFLOW BUILDER - Lazy loaded
// =============================================================================

/**
 * WorkflowCanvas - Dynamically imported
 * Only loads when workflow builder page is visited
 * Reduces initial bundle significantly (React Flow is ~200KB)
 */
export const WorkflowCanvas = dynamic(
  () => import('./workflow-builder/WorkflowCanvas').then(mod => ({ default: mod.WorkflowCanvas })),
  {
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading workflow builder...</p>
        </div>
      </div>
    ),
    ssr: false, // Workflow canvas is client-only
  }
);

/**
 * ExecutionViewer - Dynamically imported
 * Only loads when viewing workflow execution results
 */
export const ExecutionViewer = dynamic(
  () => import('./workflow-builder/ExecutionViewer').then(mod => ({ default: mod.ExecutionViewer })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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
