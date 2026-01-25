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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Hero Section */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
<<<<<<< HEAD

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-3"
            >
              Social Intelligence OS
            </motion.p>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight"
            >
              Your brand. Your voice.{' '}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Amplified.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-400 text-lg max-w-md mx-auto mb-6"
            >
              AI-researched. Contextually crafted. Brand consistent. Human approved.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-slate-500 text-sm italic"
            >
              It's not AI content. It's YOUR content, accelerated.
            </motion.p>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
          >
            <LoginForm />
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-8 flex justify-center gap-6 text-slate-500 text-xs"
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Real-time
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Human-in-the-loop
            </span>
          </motion.div>
=======
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
>>>>>>> 7140a1eb3553f076071ab3e8cd7141dc1bf5b1ad
        </motion.div>
      </div>
    );
  }

  // Show landing page by default
  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
}