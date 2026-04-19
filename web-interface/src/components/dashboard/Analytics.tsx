'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d';

type MetricCardProps = {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
};

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const isPositive = change >= 0;
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </Card>
  );
}

type PlatformMetric = {
  platform: string;
  color: string;
  followers: string;
  engagement: string;
  posts: number;
  growth: number;
};

function PlatformRow({ platform, color, followers, engagement, posts, growth }: PlatformMetric) {
  const isPositive = growth >= 0;
  return (
    <div className="flex items-center py-3 border-b border-gray-100 last:border-0">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="ml-3 flex-1 font-medium text-gray-900">{platform}</span>
      <span className="w-24 text-right text-gray-600">{followers}</span>
      <span className="w-24 text-right text-gray-600">{engagement}</span>
      <span className="w-20 text-right text-gray-600">{posts}</span>
      <span className={`w-20 text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{growth}%
      </span>
    </div>
  );
}

export function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const metrics = [
    { title: 'Total Followers', value: '24.5K', change: 12.5, icon: Users, color: 'bg-blue-500' },
    { title: 'Total Impressions', value: '156.2K', change: 8.3, icon: Eye, color: 'bg-purple-500' },
    { title: 'Engagement Rate', value: '4.8%', change: -2.1, icon: Heart, color: 'bg-pink-500' },
    { title: 'Total Interactions', value: '8.4K', change: 15.7, icon: MessageCircle, color: 'bg-green-500' },
  ];

  const platformMetrics: PlatformMetric[] = [
    { platform: 'Twitter', color: 'bg-blue-400', followers: '12.3K', engagement: '5.2%', posts: 45, growth: 8.5 },
    { platform: 'LinkedIn', color: 'bg-blue-700', followers: '8.1K', engagement: '3.8%', posts: 28, growth: 12.3 },
    { platform: 'Facebook', color: 'bg-blue-600', followers: '3.2K', engagement: '2.4%', posts: 32, growth: -1.2 },
    { platform: 'Instagram', color: 'bg-pink-500', followers: '890', engagement: '6.1%', posts: 18, growth: 24.5 },
  ];

  const topPosts = [
    { platform: 'Twitter', content: 'Excited to announce our new AI-powered workflow...', likes: 342, shares: 89, date: '2 days ago' },
    { platform: 'LinkedIn', content: 'The future of automation is here. Here are 5 key trends...', likes: 256, shares: 45, date: '4 days ago' },
    { platform: 'Instagram', content: 'Behind the scenes of building something amazing...', likes: 189, shares: 23, date: '1 week ago' },
  ];

  const engagementData = [
    { day: 'Mon', value: 65 },
    { day: 'Tue', value: 78 },
    { day: 'Wed', value: 82 },
    { day: 'Thu', value: 71 },
    { day: 'Fri', value: 89 },
    { day: 'Sat', value: 45 },
    { day: 'Sun', value: 38 },
  ];

  const maxValue = Math.max(...engagementData.map(d => d.value));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Track your social media performance across all platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Engagement</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-end justify-between h-48 gap-2">
            {engagementData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-gray-500 mb-1">{data.value}%</span>
                  <div
                    className="w-full bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${(data.value / maxValue) * 140}px` }}
                  />
                </div>
                <span className="text-xs text-gray-600 mt-2">{data.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Growth Trend */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Follower Growth</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">+2,847</div>
              <p className="text-gray-600 mt-2">New followers this month</p>
              <div className="flex items-center justify-center mt-4 text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="font-medium">18.2% growth rate</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Breakdown</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-center py-2 border-b border-gray-200 text-sm font-medium text-gray-500">
              <span className="ml-6 flex-1">Platform</span>
              <span className="w-24 text-right">Followers</span>
              <span className="w-24 text-right">Engagement</span>
              <span className="w-20 text-right">Posts</span>
              <span className="w-20 text-right">Growth</span>
            </div>
            {platformMetrics.map((platform) => (
              <PlatformRow key={platform.platform} {...platform} />
            ))}
          </div>
        </div>
      </Card>

      {/* Top Performing Posts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Posts</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {topPosts.map((post, index) => (
            <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {post.platform}
                  </span>
                  <span className="text-xs text-gray-500">{post.date}</span>
                </div>
                <p className="text-gray-900 line-clamp-2">{post.content}</p>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="flex items-center text-gray-600">
                  <Heart className="w-4 h-4 mr-1" />
                  <span className="text-sm">{post.likes}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Share2 className="w-4 h-4 mr-1" />
                  <span className="text-sm">{post.shares}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
