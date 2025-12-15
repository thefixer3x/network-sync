'use client';

import React from 'react';
import { 
  Home, 
  Users, 
  Settings, 
  BarChart3, 
  Calendar, 
  Workflow,
  LogOut 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardView } from './Dashboard';

interface SidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const menuItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'accounts', label: 'Social Accounts', icon: Users },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SA</span>
          </div>
          <span className="ml-3 text-lg font-semibold text-gray-900">
            Social Auto
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id as DashboardView)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}