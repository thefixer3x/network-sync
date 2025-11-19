'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { CreateWorkflowModal } from '@/components/dynamic-imports';
import { useWorkflows } from '@/hooks/useWorkflows';
import { toast } from 'react-hot-toast';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  type: 'content_generation' | 'engagement' | 'research' | 'analytics' | 'competitor_monitoring';
  schedule: {
    frequency: 'daily' | 'weekly' | 'hourly' | 'custom';
    time: string;
    timezone: string;
  };
  platforms: string[];
  lastRun: Date | null;
  nextRun: Date | null;
  totalRuns: number;
  successRate: number;
  createdAt: Date;
  config: Record<string, any>;
}

const WORKFLOW_TYPES = {
  content_generation: {
    name: 'Content Generation',
    icon: <Edit className="w-5 h-5" />,
    color: 'bg-blue-500',
    description: 'Automated AI-powered content creation and posting',
  },
  engagement: {
    name: 'Engagement Automation',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-green-500',
    description: 'Automated likes, comments, and follower interactions',
  },
  research: {
    name: 'Trend Research',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-purple-500',
    description: 'Automated research and trend monitoring',
  },
  analytics: {
    name: 'Analytics Collection',
    icon: <Clock className="w-5 h-5" />,
    color: 'bg-orange-500',
    description: 'Automated performance tracking and reporting',
  },
  competitor_monitoring: {
    name: 'Competitor Monitoring',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-red-500',
    description: 'Monitor competitor activity and insights',
  },
};

export function WorkflowManager() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const { workflows, isLoading, toggleWorkflow, deleteWorkflow } = useWorkflows();

  const handleToggleWorkflow = async (workflow: Workflow) => {
    try {
      await toggleWorkflow(workflow.id);
      toast.success(
        `Workflow ${workflow.status === 'active' ? 'paused' : 'activated'} successfully`
      );
    } catch (error) {
      toast.error('Failed to toggle workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      await deleteWorkflow(workflowId);
      toast.success('Workflow deleted successfully');
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const getStatusIcon = (status: Workflow['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatNextRun = (nextRun: Date | null) => {
    if (!nextRun) return 'Not scheduled';
    
    const now = new Date();
    const diff = nextRun.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return nextRun.toLocaleDateString();
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `in ${minutes}m`;
    } else {
      return 'Running soon';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Manager</h1>
          <p className="text-gray-600 mt-2">
            Create and manage your automation workflows
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Workflows</p>
              <p className="text-2xl font-bold text-gray-900">
                {workflows?.length || 0}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {workflows?.filter((w: Workflow) => w.status === 'active').length || 0}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paused</p>
              <p className="text-2xl font-bold text-yellow-600">
                {workflows?.filter((w: Workflow) => w.status === 'paused').length || 0}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Pause className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">
                {workflows?.filter((w: Workflow) => w.status === 'error').length || 0}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        <AnimatePresence>
          {workflows?.map((workflow: Workflow) => {
            const workflowType = WORKFLOW_TYPES[workflow.type];
            
            return (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-3 rounded-lg text-white ${workflowType.color}`}>
                        {workflowType.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {workflow.name}
                          </h3>
                          <Badge
                            variant={
                              workflow.status === 'active' ? 'success' :
                              workflow.status === 'error' ? 'danger' : 'warning'
                            }
                          >
                            {workflow.status}
                          </Badge>
                          {getStatusIcon(workflow.status)}
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {workflow.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <p className="font-medium">{workflowType.name}</p>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Schedule:</span>
                            <p className="font-medium">
                              {workflow.schedule.frequency} at {workflow.schedule.time}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Next Run:</span>
                            <p className="font-medium">
                              {formatNextRun(workflow.nextRun)}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Success Rate:</span>
                            <p className="font-medium">
                              {(workflow.successRate * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-3">
                          <span className="text-sm text-gray-500">Platforms:</span>
                          {workflow.platforms.map((platform) => (
                            <Badge key={platform} variant="secondary" size="sm">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Switch
                        checked={workflow.status === 'active'}
                        onChange={() => handleToggleWorkflow(workflow)}
                        size="sm"
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {(!workflows || workflows.length === 0) && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No workflows created
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first automation workflow to start automating your social media.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Your First Workflow
              </Button>
            </Card>
          </motion.div>
        )}
      </div>

      <CreateWorkflowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}