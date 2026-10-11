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
  const handleSignOut = async () => {
    console.log('Sign out clicked');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-64 border-r border-[color:var(--border-default)] bg-ln-navy-deep text-white shadow-ln">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-ln bg-ln-green text-ln-navy-deep shadow-ln">
            <span className="font-display text-base font-extrabold">N</span>
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-white">Network Sync</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ln-green">LAN Onasis</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id as DashboardView)}
                    className={`w-full flex items-center px-3 py-2 rounded-ln text-left transition-colors duration-200 ${
                      isActive
                        ? 'bg-ln-green text-ln-navy-deep shadow-ln'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <span className="text-sm font-medium text-white">
                D
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="truncate text-sm font-medium text-white">
                Dev User
              </p>
              <p className="text-xs text-white/60">Administrator</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md p-1 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ln-green"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
