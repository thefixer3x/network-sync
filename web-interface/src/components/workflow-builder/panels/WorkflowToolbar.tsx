'use client';

import {
  PlayIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface WorkflowToolbarProps {
  workflowName: string;
  onNameChange: (name: string) => void;
  onSave?: () => void;
  onExecute?: () => void;
  validation: { valid: boolean; message: string };
  readOnly?: boolean;
}

export function WorkflowToolbar({
  workflowName,
  onNameChange,
  onSave,
  onExecute,
  validation,
  readOnly = false,
}: WorkflowToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Workflow name */}
        <div className="flex items-center gap-4 flex-1">
          {readOnly ? (
            <h1 className="text-xl font-semibold text-gray-900">{workflowName}</h1>
          ) : (
            <input
              type="text"
              value={workflowName}
              onChange={(e) => onNameChange(e.target.value)}
              className="text-xl font-semibold text-gray-900 border-none focus:ring-0 focus:outline-none bg-transparent"
              placeholder="Untitled Workflow"
            />
          )}

          {/* Validation status */}
          <div className="flex items-center gap-2">
            {validation.valid ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Valid</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>{validation.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            {/* Save button */}
            {onSave && (
              <button
                onClick={onSave}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                Save
              </button>
            )}

            {/* Execute button */}
            {onExecute && (
              <button
                onClick={onExecute}
                disabled={!validation.valid}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                  validation.valid
                    ? 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <PlayIcon className="w-4 h-4" />
                Execute
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
