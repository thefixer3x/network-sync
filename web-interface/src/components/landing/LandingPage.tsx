'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  BarChart3,
  Users,
  Calendar,
  Sparkles,
  Shield,
  TrendingUp,
  MessageSquare,
  Hash,
  Bot,
  ArrowRight,
  CheckCircle,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Bot,
    title: 'Multi-Agent AI',
    description: 'Claude, Perplexity, and OpenAI working together to create, research, and optimize your content.',
  },
  {
    icon: Zap,
    title: 'Visual Workflow Builder',
    description: 'Drag-and-drop automation builder. Create powerful workflows without writing code.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track engagement, growth, and performance across all your social platforms in one dashboard.',
  },
  {
    icon: Users,
    title: 'Competitor Intelligence',
    description: 'Monitor competitors, get alerts on viral posts, and discover content opportunities.',
  },
  {
    icon: TrendingUp,
    title: 'Trend Analyzer',
    description: 'Real-time trend detection with AI-powered relevance scoring and content suggestions.',
  },
  {
    icon: Hash,
    title: 'Hashtag Research',
    description: 'Discover high-performing hashtags with volume, engagement, and difficulty metrics.',
  },
  {
    icon: MessageSquare,
    title: 'Engagement Automation',
    description: 'Auto-respond, auto-like, and grow your presence with intelligent automation rules.',
  },
  {
    icon: Calendar,
    title: 'Content Calendar',
    description: 'Plan, schedule, and visualize your content strategy across all platforms.',
  },
];

const platforms = [
  { name: 'Twitter/X', color: 'bg-black' },
  { name: 'LinkedIn', color: 'bg-blue-600' },
  { name: 'Facebook', color: 'bg-blue-500' },
  { name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
];

const benefits = [
  'Save 10+ hours per week on social media management',
  'Increase engagement by up to 3x with AI-optimized content',
  'Never miss a trending topic in your industry',
  'Automate repetitive tasks while maintaining authenticity',
  'Get enterprise-grade security and compliance',
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Network Sync
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
              AI-Powered Social Media Automation Platform
            </p>

            <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
              Automate, analyze, and optimize your social media presence across all major platforms
              with multi-agent AI orchestration and visual workflow building.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onGetStarted}
                className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                className="text-lg px-8 py-4"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 w-5 h-5" />
                See How It Works
              </Button>
            </div>

            {/* Platform badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {platforms.map((platform) => (
                <span
                  key={platform.name}
                  className={`${platform.color} text-white px-4 py-2 rounded-full text-sm font-medium`}
                >
                  {platform.name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why Choose Network Sync?
              </h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl transform rotate-3" />
              <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">AI Agent Working</div>
                      <div className="text-sm text-gray-500">Generating optimized content...</div>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: '0%' }}
                      whileInView={{ width: '75%' }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      viewport={{ once: true }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">3x</div>
                      <div className="text-xs text-gray-500">Engagement</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">10h</div>
                      <div className="text-xs text-gray-500">Saved/Week</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">4</div>
                      <div className="text-xs text-gray-500">Platforms</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Dominate Social Media
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to automate your workflow and amplify your voice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Enterprise-Grade Security & Compliance
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              GDPR compliant, SOC 2 ready, with role-based access control and complete audit trails.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {['JWT Authentication', 'API Key Management', 'RBAC', 'Audit Logging', 'Data Encryption'].map((item) => (
                <span key={item} className="bg-white/20 px-4 py-2 rounded-full">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Social Media?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of creators and marketers using Network Sync to automate their success.
          </p>
          <Button
            onClick={onGetStarted}
            className="text-lg px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required. Free forever for basic usage.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Network Sync</span>
            </div>
            <div className="text-gray-400 text-sm">
              Automate Your Social Media. Amplify Your Voice.
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Network Sync. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
