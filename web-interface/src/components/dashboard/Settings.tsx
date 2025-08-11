'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure your automation preferences
        </p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Coming Soon
        </h3>
        <p className="text-gray-600">
          Settings panel is being built. Check back soon for configuration options.
        </p>
      </Card>
    </div>
  );
}