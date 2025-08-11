'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { SocialAccounts } from './SocialAccounts';
import { WorkflowManager } from './WorkflowManager';
import { Analytics } from './Analytics';
import { ContentCalendar } from './ContentCalendar';
import { Settings } from './Settings';

export type DashboardView = 
  | 'overview' 
  | 'accounts' 
  | 'workflows' 
  | 'analytics' 
  | 'calendar' 
  | 'settings';

export function Dashboard() {
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  const renderView = () => {
    const viewProps = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
      transition: { duration: 0.3 }
    };

    switch (activeView) {
      case 'overview':
        return (
          <motion.div {...viewProps}>
            <DashboardOverview />
          </motion.div>
        );
      case 'accounts':
        return (
          <motion.div {...viewProps}>
            <SocialAccounts />
          </motion.div>
        );
      case 'workflows':
        return (
          <motion.div {...viewProps}>
            <WorkflowManager />
          </motion.div>
        );
      case 'analytics':
        return (
          <motion.div {...viewProps}>
            <Analytics />
          </motion.div>
        );
      case 'calendar':
        return (
          <motion.div {...viewProps}>
            <ContentCalendar />
          </motion.div>
        );
      case 'settings':
        return (
          <motion.div {...viewProps}>
            <Settings />
          </motion.div>
        );
      default:
        return (
          <motion.div {...viewProps}>
            <DashboardOverview />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 ml-64">
        <div className="p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}