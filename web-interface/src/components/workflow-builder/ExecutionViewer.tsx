'use client';

/**
 * Workflow Execution Viewer
 *
 * Real-time visualization of workflow execution status
 */

import { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { WorkflowExecution, NodeExecution, ExecutionLog, ExecutionStatus } from '@/types/workflow';

interface ExecutionViewerProps {
  execution: WorkflowExecution;
  logs?: ExecutionLog[];
  onClose: () => void;
}

export function ExecutionViewer({ execution, logs = [], onClose }: ExecutionViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'logs'>('overview');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Execution Details</h2>
            <ExecutionStatusBadge status={execution.status} />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton
            active={activeTab === 'nodes'}
            onClick={() => setActiveTab('nodes')}
          >
            Nodes ({execution.nodeExecutions.length})
          </TabButton>
          <TabButton
            active={activeTab === 'logs'}
            onClick={() => setActiveTab('logs')}
          >
            Logs ({logs.length})
          </TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab execution={execution} />}
          {activeTab === 'nodes' && <NodesTab nodeExecutions={execution.nodeExecutions} />}
          {activeTab === 'logs' && <LogsTab logs={logs} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Tab button component
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// Overview tab
function OverviewTab({ execution }: { execution: WorkflowExecution }) {
  const successfulNodes = execution.nodeExecutions.filter(
    (n) => n.status === 'completed'
  ).length;
  const failedNodes = execution.nodeExecutions.filter(
    (n) => n.status === 'failed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Status"
          value={execution.status}
          icon={<ExecutionStatusIcon status={execution.status} />}
        />
        <StatCard
          label="Duration"
          value={execution.duration ? `${execution.duration}ms` : '-'}
          icon={<ClockIcon className="w-5 h-5" />}
        />
        <StatCard
          label="Nodes Executed"
          value={`${successfulNodes}/${execution.nodeExecutions.length}`}
          icon={<CheckCircleIcon className="w-5 h-5" />}
        />
      </div>

      {/* Execution metadata */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <InfoRow label="Execution ID" value={execution.id} />
        <InfoRow label="Workflow ID" value={execution.workflowId} />
        <InfoRow label="Triggered By" value={execution.triggeredBy} />
        <InfoRow
          label="Start Time"
          value={new Date(execution.startTime).toLocaleString()}
        />
        {execution.endTime && (
          <InfoRow
            label="End Time"
            value={new Date(execution.endTime).toLocaleString()}
          />
        )}
      </div>

      {/* Error details */}
      {execution.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700">{execution.error.message}</p>
              {execution.error.stack && (
                <pre className="mt-2 text-xs text-red-600 overflow-x-auto bg-white p-2 rounded">
                  {execution.error.stack}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Nodes tab
function NodesTab({ nodeExecutions }: { nodeExecutions: NodeExecution[] }) {
  return (
    <div className="space-y-3">
      {nodeExecutions.map((node, index) => (
        <div
          key={index}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Node {index + 1}</span>
              <ExecutionStatusBadge status={node.status} size="sm" />
            </div>
            {node.duration && (
              <span className="text-sm text-gray-500">{node.duration}ms</span>
            )}
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <div>Node ID: {node.nodeId}</div>
            {node.error && (
              <div className="text-red-600 mt-2">
                Error: {node.error.message}
              </div>
            )}
          </div>

          {/* Input/Output */}
          {(node.input || node.output) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {node.input && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    Input
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(node.input, null, 2)}
                  </pre>
                </div>
              )}
              {node.output && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    Output
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(node.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Logs tab
function LogsTab({ logs }: { logs: ExecutionLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No logs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, index) => (
        <div
          key={index}
          className={`p-3 rounded border ${getLogStyles(log.level)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xs font-mono text-gray-500 flex-shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`text-xs font-medium flex-shrink-0 uppercase ${getLogLevelColor(log.level)}`}>
              {log.level}
            </span>
            <span className="text-sm text-gray-900 flex-1">{log.message}</span>
          </div>
          {log.data && (
            <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper components
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-2 text-gray-600">{icon}</div>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function ExecutionStatusBadge({
  status,
  size = 'md',
}: {
  status: ExecutionStatus;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const statusStyles: Record<ExecutionStatus, string> = {
    pending: 'bg-gray-100 text-gray-800',
    running: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    timeout: 'bg-orange-100 text-orange-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function ExecutionStatusIcon({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    case 'failed':
      return <XCircleIcon className="w-5 h-5 text-red-600" />;
    case 'running':
      return <ClockIcon className="w-5 h-5 text-blue-600" />;
    default:
      return <ClockIcon className="w-5 h-5 text-gray-600" />;
  }
}

function getLogStyles(level: string): string {
  const styles: Record<string, string> = {
    debug: 'bg-gray-50 border-gray-200',
    info: 'bg-blue-50 border-blue-200',
    warn: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  };
  return styles[level] || styles.info;
}

function getLogLevelColor(level: string): string {
  const colors: Record<string, string> = {
    debug: 'text-gray-600',
    info: 'text-blue-600',
    warn: 'text-yellow-600',
    error: 'text-red-600',
  };
  return colors[level] || colors.info;
}
