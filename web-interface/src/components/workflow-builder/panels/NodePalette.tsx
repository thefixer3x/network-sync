'use client';

import { DragEvent } from 'react';
import {
  PlayIcon,
  BoltIcon,
  CodeBracketIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  CloudIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface NodeTypeItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const nodeTypes: NodeTypeItem[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: <PlayIcon className="w-5 h-5" />,
    color: 'bg-green-500',
    description: 'Start workflow execution',
  },
  {
    type: 'action',
    label: 'Action',
    icon: <BoltIcon className="w-5 h-5" />,
    color: 'bg-blue-500',
    description: 'Perform an operation',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: <CodeBracketIcon className="w-5 h-5" />,
    color: 'bg-amber-500',
    description: 'Branch based on logic',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
    color: 'bg-purple-500',
    description: 'Transform data',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: <ClockIcon className="w-5 h-5" />,
    color: 'bg-pink-500',
    description: 'Add time delay',
  },
  {
    type: 'api',
    label: 'API Call',
    icon: <CloudIcon className="w-5 h-5" />,
    color: 'bg-cyan-500',
    description: 'Make HTTP request',
  },
  {
    type: 'end',
    label: 'End',
    icon: <StopIcon className="w-5 h-5" />,
    color: 'bg-red-500',
    description: 'End workflow',
  },
];

export function NodePalette() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Node Palette</h3>
        <div className="space-y-2">
          {nodeTypes.map((node) => (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-move transition-colors border border-gray-200 hover:border-gray-300"
            >
              <div className={`${node.color} text-white p-2 rounded`}>
                {node.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{node.label}</div>
                <div className="text-xs text-gray-500">{node.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-xs font-semibold text-blue-900 mb-2">How to use</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Drag nodes onto the canvas</li>
            <li>• Connect nodes by dragging between ports</li>
            <li>• Click a node to configure</li>
            <li>• Delete with backspace/delete key</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
