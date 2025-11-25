'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BoltIcon } from '@heroicons/react/24/outline';
import type { ActionConfig } from '@/types/workflow';

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as ActionConfig;

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-300'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-blue-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        <BoltIcon className="w-5 h-5" />
        <span className="font-medium text-sm">Action</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {config.actionType}
          </span>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
