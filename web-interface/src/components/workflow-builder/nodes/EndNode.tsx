'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StopIcon } from '@heroicons/react/24/outline';

export const EndNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-red-500 ring-2 ring-red-200' : 'border-red-300'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        <StopIcon className="w-5 h-5" />
        <span className="font-medium text-sm">End</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            Workflow End
          </span>
        </div>
      </div>
    </div>
  );
});

EndNode.displayName = 'EndNode';
