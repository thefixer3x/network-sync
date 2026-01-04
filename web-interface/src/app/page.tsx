'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LandingPage } from '@/components/landing/LandingPage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show dashboard if logged in
  if (user) {
    return <Dashboard />;
  }

  // Show auth form if user clicked "Get Started"
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Network Sync
            </h1>
            <p className="text-gray-600">
              AI-powered social media automation platform
            </p>
          </div>
          <LoginForm />
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAuth(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              &larr; Back to home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show landing page by default
  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
}