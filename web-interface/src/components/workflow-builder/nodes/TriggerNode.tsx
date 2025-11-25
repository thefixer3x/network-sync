'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PlayIcon, CalendarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import type { TriggerConfig } from '@/types/workflow';

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as TriggerConfig;

  const getTriggerIcon = () => {
    switch (config.triggerType) {
      case 'schedule':
        return <CalendarIcon className="w-5 h-5" />;
      case 'webhook':
        return <GlobeAltIcon className="w-5 h-5" />;
      default:
        return <PlayIcon className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-md min-w-[200px] ${
        selected ? 'border-green-500 ring-2 ring-green-200' : 'border-green-300'
      }`}
    >
      {/* Header */}
      <div className="bg-green-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
        {getTriggerIcon()}
        <span className="font-medium text-sm">Trigger</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-medium text-gray-900 text-sm mb-1">{data.label}</div>
        {data.description && (
          <div className="text-xs text-gray-500">{data.description}</div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            {config.triggerType}
          </span>
          {config.enabled !== undefined && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                config.enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
