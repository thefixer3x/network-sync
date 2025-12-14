'use client';

/**
 * Visual Workflow Canvas Component
 *
 * Main canvas for drag-and-drop workflow building using React Flow
 */

import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom nodes
import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { TransformNode } from './nodes/TransformNode';
import { DelayNode } from './nodes/DelayNode';
import { ApiNode } from './nodes/ApiNode';
import { EndNode } from './nodes/EndNode';

// Custom edge
import { CustomEdge } from './edges/CustomEdge';

// Panels
import { NodePalette } from './panels/NodePalette';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { WorkflowToolbar } from './panels/WorkflowToolbar';

// Types
import type { VisualWorkflow } from '@/types/workflow';

// Node type mapping
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  transform: TransformNode,
  delay: DelayNode,
  api: ApiNode,
  end: EndNode,
};

// Edge type mapping
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

interface WorkflowCanvasProps {
  workflow?: VisualWorkflow;
  onSave?: (workflow: Partial<VisualWorkflow>) => void;
  onExecute?: (workflow: VisualWorkflow) => void;
  readOnly?: boolean;
}

function WorkflowCanvasInner({ workflow, onSave, onExecute, readOnly = false }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  // State
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow?.name || 'Untitled Workflow');
  const [workflowDescription] = useState(workflow?.description || '');

  // Connection handler
  const onConnect = useCallback(
    (connection: Connection) => {
      // Ensure source and target are valid
      if (!connection.source || !connection.target) return;

      const edge: Edge = {
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'custom',
        animated: true,
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  // Node selection handler
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Node drag handler
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Node drop handler
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          config: getDefaultConfig(type),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes]
  );

  // Node update handler
  const onNodeUpdate = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      setSelectedNode(null);
    },
    [setNodes]
  );

  // Node delete handler
  const onNodeDelete = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // Save handler
  const handleSave = useCallback(() => {
    if (!onSave) return;

    const workflowData: Partial<VisualWorkflow> = {
      name: workflowName,
      description: workflowDescription,
      nodes: nodes as any,
      edges: edges as any,
    };

    onSave(workflowData);
  }, [workflowName, workflowDescription, nodes, edges, onSave]);

  // Execute handler
  const handleExecute = useCallback(() => {
    if (!onExecute) return;

    const workflowData: VisualWorkflow = {
      id: workflow?.id || '',
      name: workflowName,
      description: workflowDescription,
      version: workflow?.version || 1,
      nodes: nodes as any,
      edges: edges as any,
      variables: workflow?.variables || [],
      settings: workflow?.settings || {
        timeout: 300000,
        maxConcurrency: 5,
        errorHandling: 'stop',
        logging: {
          enabled: true,
          level: 'info',
          retentionDays: 7,
        },
        notifications: {
          onSuccess: false,
          onFailure: true,
          onWarning: false,
        },
      },
      metadata: workflow?.metadata || {
        author: 'user',
        tags: [],
        isTemplate: false,
        isPublic: false,
        usage: {
          totalExecutions: 0,
          successRate: 0,
        },
      },
      createdAt: workflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onExecute(workflowData);
  }, [workflow, workflowName, workflowDescription, nodes, edges, onExecute]);

  // Validate workflow
  const validateWorkflow = useCallback(() => {
    const triggerNodes = nodes.filter((n) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      return { valid: false, message: 'Workflow must have at least one trigger node' };
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const disconnectedNodes = nodes.filter(
      (node) => node.type !== 'trigger' && !connectedNodes.has(node.id)
    );

    if (disconnectedNodes.length > 0) {
      return {
        valid: false,
        message: `${disconnectedNodes.length} node(s) are not connected to the workflow`,
      };
    }

    return { valid: true, message: 'Workflow is valid' };
  }, [nodes, edges]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <WorkflowToolbar
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        onSave={handleSave}
        onExecute={handleExecute}
        validation={validateWorkflow()}
        readOnly={readOnly}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        {!readOnly && (
          <NodePalette />
        )}

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onNodeClick={onNodeClick}
            onDrop={readOnly ? undefined : onDrop}
            onDragOver={readOnly ? undefined : onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'custom',
              animated: true,
            }}
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => getNodeColor(node.type || 'default')}
              className="bg-white border border-gray-200"
            />
            <Background variant={BackgroundVariant.Dots} gap={15} size={1} />

            {/* Info panel */}
            <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
              <div className="text-sm space-y-2">
                <div className="font-medium text-gray-900">{workflowName}</div>
                {workflowDescription && (
                  <div className="text-gray-600 text-xs">{workflowDescription}</div>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{nodes.length} nodes</span>
                  <span>{edges.length} connections</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Configuration Panel */}
        {selectedNode && !readOnly && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={onNodeUpdate}
            onDelete={onNodeDelete}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// Helper functions
function getDefaultConfig(type: string): any {
  switch (type) {
    case 'trigger':
      return {
        type: 'trigger',
        triggerType: 'manual',
        enabled: true,
      };
    case 'action':
      return {
        type: 'action',
        actionType: 'post_content',
        parameters: {},
      };
    case 'condition':
      return {
        type: 'condition',
        conditions: [],
        logicalOperator: 'AND',
      };
    case 'transform':
      return {
        type: 'transform',
        transformType: 'map',
        expression: 'data',
      };
    case 'delay':
      return {
        type: 'delay',
        duration: 1,
        unit: 'seconds',
      };
    case 'api':
      return {
        type: 'api',
        method: 'GET',
        url: '',
      };
    case 'end':
      return {
        type: 'end',
      };
    default:
      return {};
  }
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    trigger: '#10b981',    // green
    action: '#3b82f6',     // blue
    condition: '#f59e0b',  // amber
    transform: '#8b5cf6',  // purple
    delay: '#ec4899',      // pink
    api: '#06b6d4',        // cyan
    end: '#ef4444',        // red
  };
  return colors[type] || '#6b7280';
}
