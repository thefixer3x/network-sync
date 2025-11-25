'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CloudIcon } from '@heroicons/react/24/outline';
import type { ApiConfig } from '@/types/workflow';

export const ApiNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as ApiConfig;

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-amber-100 text-amber-800',
      PATCH: 'bg-purple-100 text-purple-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-cyan-300'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-cyan-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        <CloudIcon className="w-5 h-5" />
        <span className="font-medium text-sm">API Call</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(config.method)}`}>
            {config.method}
          </span>
        </div>
        {config.url && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 truncate">
            {config.url}
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-cyan-500 !border-2 !border-white"
      />
    </div>
  );
});

ApiNode.displayName = 'ApiNode';
