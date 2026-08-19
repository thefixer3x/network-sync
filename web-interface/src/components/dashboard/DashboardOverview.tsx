'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Users, Workflow, TrendingUp, Calendar } from 'lucide-react';

export function DashboardOverview() {
  const stats = [
    {
      name: 'Connected Accounts',
      value: '4',
      change: '+2 this week',
      changeType: 'positive',
      icon: Users,
    },
    {
      name: 'Active Workflows',
      value: '12',
      change: '+3 this week',
      changeType: 'positive',
      icon: Workflow,
    },
    {
      name: 'Total Engagement',
      value: '2.4K',
      change: '+12% from last week',
      changeType: 'positive',
      icon: TrendingUp,
    },
    {
      name: 'Posts Scheduled',
      value: '48',
      change: 'Next 7 days',
      changeType: 'neutral',
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ln-text">Dashboard Overview</h1>
        <p className="mt-2 text-[color:var(--fg-2)]">
          Monitor your social media automation performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="p-6">
              <div className="flex items-center">
                <div className="rounded-ln bg-[color:var(--ln-green-50)] p-2">
                  <Icon className="h-6 w-6 text-ln-green" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[color:var(--fg-2)]">{stat.name}</p>
                  <p className="font-display text-2xl font-bold text-ln-text">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className={`text-sm ${
                  stat.changeType === 'positive' ? 'text-[color:var(--status-success)]' :
                  stat.changeType === 'negative' ? 'text-[color:var(--status-danger)]' : 'text-[color:var(--fg-2)]'
                }`}>
                  {stat.change}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-semibold text-ln-text">Recent Posts</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-ln bg-[color:var(--ln-navy-50)]">
                  <span className="font-medium text-ln-navy">T</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ln-text">
                    Twitter post published
                  </p>
                  <p className="text-xs text-[color:var(--fg-3)]">2 hours ago</p>
                </div>
                <div className="text-xs text-[color:var(--fg-4)]">
                  12 likes
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-semibold text-ln-text">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--fg-2)]">API Status</span>
              <span className="rounded-full bg-[color:var(--ln-green-50)] px-2 py-1 text-xs text-[color:var(--ln-green-800)]">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--fg-2)]">Database</span>
              <span className="rounded-full bg-[color:var(--ln-green-50)] px-2 py-1 text-xs text-[color:var(--ln-green-800)]">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[color:var(--fg-2)]">Queue</span>
              <span className="rounded-full bg-[color:var(--ln-gold-50)] px-2 py-1 text-xs text-[color:var(--ln-gold-800)]">
                Processing
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
