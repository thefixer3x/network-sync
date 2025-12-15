'use client';

import { useState } from 'react';
import { Node } from 'reactflow';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import type {
  TriggerConfig,
  ActionConfig,
  ConditionConfig,
  TransformConfig,
  DelayConfig,
  ApiConfig,
  Condition,
  ConditionOperator,
} from '@/types/workflow';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState(node.data.config);
  const [label, setLabel] = useState(node.data.label);
  const [description, setDescription] = useState(node.data.description || '');

  const handleSave = () => {
    onUpdate(node.id, {
      label,
      description,
      config,
    });
  };

  const renderConfigForm = () => {
    switch (node.type) {
      case 'trigger':
        return <TriggerConfigForm config={config as TriggerConfig} onChange={setConfig} />;
      case 'action':
        return <ActionConfigForm config={config as ActionConfig} onChange={setConfig} />;
      case 'condition':
        return <ConditionConfigForm config={config as ConditionConfig} onChange={setConfig} />;
      case 'transform':
        return <TransformConfigForm config={config as TransformConfig} onChange={setConfig} />;
      case 'delay':
        return <DelayConfigForm config={config as DelayConfig} onChange={setConfig} />;
      case 'api':
        return <ApiConfigForm config={config as ApiConfig} onChange={setConfig} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h3 className="text-lg font-semibold text-gray-900">Configure Node</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete node"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Basic info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Node label"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional description"
          />
        </div>

        {/* Node-specific config */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration</h4>
          {renderConfigForm()}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Config forms for each node type
function TriggerConfigForm({ config, onChange }: { config: TriggerConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
        <select
          value={config.triggerType}
          onChange={(e) => onChange({ ...config, triggerType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="manual">Manual</option>
          <option value="schedule">Schedule</option>
          <option value="webhook">Webhook</option>
          <option value="event">Event</option>
        </select>
      </div>

      {config.triggerType === 'schedule' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Schedule (Cron)
          </label>
          <input
            type="text"
            value={config.schedule || ''}
            onChange={(e) => onChange({ ...config, schedule: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0 9 * * *"
          />
          <p className="mt-1 text-xs text-gray-500">Example: 0 9 * * * (Daily at 9 AM)</p>
        </div>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-700">Enabled</label>
      </div>
    </div>
  );
}

function ActionConfigForm({ config, onChange }: { config: ActionConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
        <select
          value={config.actionType}
          onChange={(e) => onChange({ ...config, actionType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="post_content">Post Content</option>
          <option value="analyze_sentiment">Analyze Sentiment</option>
          <option value="moderate_content">Moderate Content</option>
          <option value="generate_content">Generate Content</option>
          <option value="fetch_metrics">Fetch Metrics</option>
          <option value="send_email">Send Email</option>
          <option value="http_request">HTTP Request</option>
          <option value="database_query">Database Query</option>
          <option value="file_operation">File Operation</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="0"
        />
      </div>
    </div>
  );
}

function ConditionConfigForm({ config, onChange }: { config: ConditionConfig; onChange: (c: any) => void }) {
  const addCondition = () => {
    const newCondition: Condition = {
      variable: '',
      operator: 'equals',
      value: '',
    };
    onChange({
      ...config,
      conditions: [...config.conditions, newCondition],
    });
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...config, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...config,
      conditions: config.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logical Operator</label>
        <select
          value={config.logicalOperator}
          onChange={(e) => onChange({ ...config, logicalOperator: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Conditions</label>
          <button
            onClick={addCondition}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add
          </button>
        </div>

        <div className="space-y-2">
          {config.conditions.map((condition, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Condition {index + 1}</span>
                <button
                  onClick={() => removeCondition(index)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <input
                type="text"
                value={condition.variable}
                onChange={(e) => updateCondition(index, { variable: e.target.value })}
                placeholder="Variable name"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />

              <select
                value={condition.operator}
                onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="contains">Contains</option>
                <option value="regex">Regex</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>

              <input
                type="text"
                value={condition.value}
                onChange={(e) => updateCondition(index, { value: e.target.value })}
                placeholder="Value"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          ))}

          {config.conditions.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              No conditions defined. Click &quot;Add&quot; to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransformConfigForm({ config, onChange }: { config: TransformConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Transform Type</label>
        <select
          value={config.transformType}
          onChange={(e) => onChange({ ...config, transformType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="map">Map</option>
          <option value="filter">Filter</option>
          <option value="reduce">Reduce</option>
          <option value="merge">Merge</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Expression</label>
        <textarea
          value={config.expression}
          onChange={(e) => onChange({ ...config, expression: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="data.map(item => item.value)"
        />
        <p className="mt-1 text-xs text-gray-500">JavaScript expression</p>
      </div>
    </div>
  );
}

function DelayConfigForm({ config, onChange }: { config: DelayConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
        <input
          type="number"
          value={config.duration}
          onChange={(e) => onChange({ ...config, duration: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
        <select
          value={config.unit}
          onChange={(e) => onChange({ ...config, unit: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="seconds">Seconds</option>
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
    </div>
  );
}

function ApiConfigForm({ config, onChange }: { config: ApiConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
        <select
          value={config.method}
          onChange={(e) => onChange({ ...config, method: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
        <input
          type="url"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://api.example.com/endpoint"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="0"
        />
      </div>
    </div>
  );
}
