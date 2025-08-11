'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const workflowTypes = [
  {
    id: 'content_generation',
    name: 'Content Generation',
    description: 'Automated AI-powered content creation and posting',
  },
  {
    id: 'engagement',
    name: 'Engagement Automation',
    description: 'Automated likes, comments, and follower interactions',
  },
  {
    id: 'research',
    name: 'Trend Research',
    description: 'Automated research and trend monitoring',
  },
];

export function CreateWorkflowModal({ isOpen, onClose }: CreateWorkflowModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    schedule: {
      frequency: 'daily',
      time: '09:00',
    },
    platforms: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Creating workflow:', formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Create New Workflow
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Workflow Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter workflow name"
              required
            />
            
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Workflow Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {workflowTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`p-4 cursor-pointer border-2 transition-colors ${
                    formData.type === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                >
                  <h3 className="font-medium text-gray-900 mb-1">{type.name}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Workflow
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}