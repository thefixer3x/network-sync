'use client';

/**
 * Visual Workflow Builder Page
 *
 * Main page for creating and editing visual workflows
 */

import { useState } from 'react';
import { WorkflowCanvas } from '@/components/workflow-builder/WorkflowCanvas';
import { TemplateBrowser } from '@/components/workflow-builder/TemplateBrowser';
import { workflowApi } from '@/lib/api/workflow';
import { createWorkflowFromTemplate } from '@/lib/workflow-templates';
import type { VisualWorkflow, WorkflowTemplate } from '@/types/workflow';
import toast from 'react-hot-toast';
import { RectangleStackIcon } from '@heroicons/react/24/outline';

export default function WorkflowBuilderPage() {
  const [currentWorkflow, setCurrentWorkflow] = useState<VisualWorkflow | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);

  const handleSave = async (workflowData: Partial<VisualWorkflow>) => {
    setIsSaving(true);

    try {
      if (currentWorkflow?.id) {
        // Update existing workflow
        const result = await workflowApi.update(currentWorkflow.id, workflowData);

        setCurrentWorkflow(result.workflow);
        toast.success('Workflow updated successfully!');

        if (result.validation.warnings.length > 0) {
          toast('Validation warnings detected', {
            icon: '⚠️',
            duration: 5000,
          });
        }
      } else {
        // Create new workflow
        const result = await workflowApi.create({
          name: workflowData.name || 'Untitled Workflow',
          description: workflowData.description,
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
          variables: workflowData.variables,
          settings: workflowData.settings,
        });

        setCurrentWorkflow(result.workflow);
        toast.success('Workflow created successfully!');

        if (result.validation.warnings.length > 0) {
          toast('Validation warnings detected', {
            icon: '⚠️',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async (workflow: VisualWorkflow) => {
    setIsExecuting(true);

    try {
      // Save first if needed
      if (!currentWorkflow?.id) {
        await handleSave(workflow);
        return;
      }

      // Execute workflow
      const result = await workflowApi.execute(workflow.id);

      if (result.execution.status === 'completed') {
        toast.success(
          `Workflow executed successfully in ${result.execution.duration}ms!`
        );
      } else if (result.execution.status === 'failed') {
        toast.error(
          `Workflow execution failed: ${result.execution.error?.message}`
        );
      } else {
        toast(`Workflow status: ${result.execution.status}`, {
          icon: '⏳',
        });
      }

      // Show execution logs
      console.log('Execution logs:', result.logs);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      toast.error('Failed to execute workflow. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    const workflowData = createWorkflowFromTemplate(template);
    setCurrentWorkflow({
      id: '',
      ...workflowData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as VisualWorkflow);
    setShowTemplateBrowser(false);
    toast.success(`Template "${template.name}" loaded!`);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visual Workflow Builder</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create powerful automation workflows with a drag-and-drop interface
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}
            {isExecuting && (
              <span className="text-sm text-gray-500">Executing...</span>
            )}
            <button
              onClick={() => setShowTemplateBrowser(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RectangleStackIcon className="w-5 h-5" />
              Start from Template
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <WorkflowCanvas
          workflow={currentWorkflow}
          onSave={handleSave}
          onExecute={handleExecute}
        />
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border-t border-blue-200 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <span className="font-medium">💡 Tips:</span>
          <span>
            Drag nodes from the palette • Connect nodes by dragging between ports • Click
            a node to configure • Press Delete to remove selected nodes
          </span>
        </div>
      </div>

      {/* Template Browser Modal */}
      {showTemplateBrowser && (
        <TemplateBrowser
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateBrowser(false)}
        />
      )}
    </div>
  );
}
