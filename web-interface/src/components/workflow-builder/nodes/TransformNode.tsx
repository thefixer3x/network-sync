'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import type { TransformConfig } from '@/types/workflow';

export const TransformNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as TransformConfig;

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-300'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-purple-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        <ArrowsRightLeftIcon className="w-5 h-5" />
        <span className="font-medium text-sm">Transform</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            {config.transformType}
          </span>
        </div>
        {config.expression && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 truncate">
            {config.expression}
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white"
      />
    </div>
  );
});

TransformNode.displayName = 'TransformNode';
