'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
} from 'lucide-react';

type ScheduledPost = {
  id: string;
  title: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  time: string;
  status: 'scheduled' | 'draft' | 'published';
  content: string;
};

const PLATFORM_ICONS = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
};

const PLATFORM_COLORS = {
  twitter: 'bg-blue-400',
  linkedin: 'bg-blue-700',
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-500',
};

const STATUS_VARIANTS = {
  scheduled: 'success' as const,
  draft: 'warning' as const,
  published: 'secondary' as const,
};

function PostCard({ post, onEdit, onDelete, onDuplicate }: {
  post: ScheduledPost;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const PlatformIcon = PLATFORM_ICONS[post.platform];

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${PLATFORM_COLORS[post.platform]}`}>
            <PlatformIcon className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs text-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {post.time}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Edit2 className="w-3 h-3 mr-2" /> Edit
              </button>
              <button
                onClick={() => { onDuplicate(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Copy className="w-3 h-3 mr-2" /> Duplicate
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                <Trash2 className="w-3 h-3 mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-900 mt-2 line-clamp-2">{post.title}</p>
      <div className="mt-2">
        <Badge variant={STATUS_VARIANTS[post.status]} size="sm">
          {post.status}
        </Badge>
      </div>
    </div>
  );
}

export function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Sample scheduled posts
  const scheduledPosts: Record<number, ScheduledPost[]> = {
    3: [
      { id: '1', title: 'New product launch announcement', platform: 'twitter', time: '9:00 AM', status: 'scheduled', content: '' },
      { id: '2', title: 'Weekly industry insights thread', platform: 'linkedin', time: '12:00 PM', status: 'scheduled', content: '' },
    ],
    7: [
      { id: '3', title: 'Behind the scenes content', platform: 'instagram', time: '2:00 PM', status: 'draft', content: '' },
    ],
    12: [
      { id: '4', title: 'Customer success story', platform: 'facebook', time: '10:00 AM', status: 'scheduled', content: '' },
      { id: '5', title: 'Product tip of the week', platform: 'twitter', time: '3:00 PM', status: 'scheduled', content: '' },
      { id: '6', title: 'Team spotlight post', platform: 'linkedin', time: '5:00 PM', status: 'draft', content: '' },
    ],
    15: [
      { id: '7', title: 'Feature announcement', platform: 'twitter', time: '11:00 AM', status: 'scheduled', content: '' },
    ],
    20: [
      { id: '8', title: 'Weekend engagement post', platform: 'instagram', time: '6:00 PM', status: 'draft', content: '' },
      { id: '9', title: 'Industry news roundup', platform: 'linkedin', time: '9:00 AM', status: 'scheduled', content: '' },
    ],
    25: [
      { id: '10', title: 'Monthly recap', platform: 'facebook', time: '12:00 PM', status: 'scheduled', content: '' },
    ],
  };

  const upcomingPosts = Object.entries(scheduledPosts)
    .flatMap(([day, posts]) => posts.map(post => ({ ...post, day: parseInt(day) })))
    .filter(post => post.status === 'scheduled')
    .slice(0, 5);

  const handleEdit = (postId: string) => {
    console.log('Edit post:', postId);
  };

  const handleDelete = (postId: string) => {
    console.log('Delete post:', postId);
  };

  const handleDuplicate = (postId: string) => {
    console.log('Duplicate post:', postId);
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() &&
                          today.getFullYear() === currentDate.getFullYear();

    // Empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[120px] bg-gray-50 border border-gray-100" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const dayPosts = scheduledPosts[day] || [];

      days.push(
        <div
          key={day}
          className={`min-h-[120px] border border-gray-100 p-2 ${
            isToday ? 'bg-blue-50' : 'bg-white'
          } hover:bg-gray-50 transition-colors`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-sm font-medium ${
                isToday
                  ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                  : 'text-gray-900'
              }`}
            >
              {day}
            </span>
            {dayPosts.length > 0 && (
              <span className="text-xs text-gray-500">{dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="space-y-1">
            {dayPosts.slice(0, 2).map((post) => {
              const PlatformIcon = PLATFORM_ICONS[post.platform];
              return (
                <div
                  key={post.id}
                  className={`flex items-center gap-1 p-1 rounded text-xs ${
                    post.status === 'draft' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}
                >
                  <PlatformIcon className="w-3 h-3" />
                  <span className="truncate">{post.time}</span>
                </div>
              );
            })}
            {dayPosts.length > 2 && (
              <span className="text-xs text-gray-500">+{dayPosts.length - 2} more</span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-gray-600 mt-2">Schedule and manage your content across platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Post
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {renderCalendarDays()}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">This Month</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Scheduled</span>
                <span className="font-medium text-gray-900">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Drafts</span>
                <span className="font-medium text-yellow-600">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Published</span>
                <span className="font-medium text-green-600">12</span>
              </div>
            </div>
          </Card>

          {/* Upcoming Posts */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Upcoming Posts</h3>
            <div className="space-y-3">
              {upcomingPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={() => handleEdit(post.id)}
                  onDelete={() => handleDelete(post.id)}
                  onDuplicate={() => handleDuplicate(post.id)}
                />
              ))}
            </div>
          </Card>

          {/* Platform Legend */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Platforms</h3>
            <div className="space-y-2">
              {Object.entries(PLATFORM_ICONS).map(([platform, Icon]) => (
                <div key={platform} className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS]}`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-gray-700 capitalize">{platform}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
