'use client';

/**
 * Template Browser Component
 *
 * Browse and select workflow templates
 */

import { useState } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { workflowTemplates } from '@/lib/workflow-templates';
import type { WorkflowTemplate } from '@/types/workflow';

interface TemplateBrowserProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onClose: () => void;
}

export function TemplateBrowser({ onSelectTemplate, onClose }: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...new Set(workflowTemplates.map((t) => t.category))];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  // Filter templates
  const filteredTemplates = workflowTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Workflow Templates</h2>
            <p className="mt-1 text-sm text-gray-500">
              Start with a pre-built template and customize it to your needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty filter */}
            <div>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === 'all' ? 'All Levels' : difficulty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => onSelectTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredTemplates.length} of {workflowTemplates.length} templates
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template card component
function TemplateCard({
  template,
  onSelect,
}: {
  template: WorkflowTemplate;
  onSelect: () => void;
}) {
  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail placeholder */}
      <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-2">🔄</div>
          <div className="text-sm font-medium">{template.workflow.nodes.length} nodes</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
          {template.rating && (
            <div className="flex items-center gap-1 text-yellow-500">
              <StarIcon className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{template.rating}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              difficultyColors[template.difficulty]
            }`}
          >
            {template.difficulty}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {template.category}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={onSelect}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Use Template
        </button>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{template.workflow.nodes.length} nodes</span>
          <span>{template.workflow.edges.length} connections</span>
          <span>{template.downloads || 0} uses</span>
        </div>
      </div>
    </div>
  );
}
