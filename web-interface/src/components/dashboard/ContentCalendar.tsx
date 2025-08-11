'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

export function ContentCalendar() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Calendar</h1>
        <p className="text-gray-600 mt-2">
          Schedule and manage your content
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Coming Soon
        </h3>
        <p className="text-gray-600">
          Content calendar is being built. Check back soon for scheduling and content management.
        </p>
      </Card>
    </div>
  );
}