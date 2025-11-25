'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import type { ConditionConfig } from '@/types/workflow';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as ConditionConfig;

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-300'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-amber-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="bg-amber-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        <CodeBracketIcon className="w-5 h-5" />
        <span className="font-medium text-sm">Condition</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            {config.logicalOperator}
          </span>
          {config.conditions && config.conditions.length > 0 && (
            <span className="text-xs text-gray-500">
              {config.conditions.length} condition{config.conditions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Output handles - true/false branches */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 !bg-green-500 !border-2 !border-white !top-[40%]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-3 h-3 !bg-red-500 !border-2 !border-white !top-[60%]"
      />

      {/* Labels for branches */}
      <div className="absolute -right-12 top-[40%] -translate-y-1/2 text-xs text-green-600 font-medium">
        True
      </div>
      <div className="absolute -right-12 top-[60%] -translate-y-1/2 text-xs text-red-600 font-medium">
        False
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
