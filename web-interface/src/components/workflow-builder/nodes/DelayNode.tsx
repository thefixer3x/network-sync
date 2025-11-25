'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ClockIcon } from '@heroicons/react/24/outline';
import type { DelayConfig } from '@/types/workflow';

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as DelayConfig;

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-pink-500 ring-2 ring-pink-200' : 'border-pink-300'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-pink-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-pink-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        <ClockIcon className="w-5 h-5" />
        <span className="font-medium text-sm">Delay</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
            {config.duration} {config.unit}
          </span>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-pink-500 !border-2 !border-white"
      />
    </div>
  );
});

DelayNode.displayName = 'DelayNode';
