'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Platform = 'twitter' | 'linkedin' | 'facebook' | 'instagram';

interface PlatformInfo {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  oauthUrl: string;
  requiresManualSetup: boolean;
}

const PLATFORMS: Record<Platform, PlatformInfo> = {
  twitter: {
    name: 'Twitter / X',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>
    ),
    color: 'bg-blue-500',
    description: 'Connect your Twitter account to automate tweets and engagement',
    oauthUrl: '/api/auth/twitter',
    requiresManualSetup: false,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: 'bg-blue-700',
    description: 'Connect your LinkedIn account to automate professional posts',
    oauthUrl: '/api/auth/linkedin',
    requiresManualSetup: false,
  },
  facebook: {
    name: 'Facebook',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: 'bg-blue-600',
    description: 'Connect your Facebook page to automate posts and engagement',
    oauthUrl: '/api/auth/facebook',
    requiresManualSetup: false,
  },
  instagram: {
    name: 'Instagram',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.48.204 4.955.388a5.42 5.42 0 0 0-1.96 1.276A5.42 5.42 0 0 0 1.67 3.624c-.184.524-.306 1.138-.34 2.085C1.295 6.657 1.282 7.064 1.282 10.685s.013 4.028.048 4.976c.034.947.156 1.561.34 2.085a5.42 5.42 0 0 0 1.325 1.96 5.42 5.42 0 0 0 1.96 1.325c.524.184 1.138.306 2.085.34.948.035 1.355.048 4.976.048s4.028-.013 4.976-.048c.947-.034 1.561-.156 2.085-.34a5.42 5.42 0 0 0 1.96-1.325 5.42 5.42 0 0 0 1.325-1.96c.184-.524.306-1.138.34-2.085.035-.948.048-1.355.048-4.976s-.013-4.028-.048-4.976c-.034-.947-.156-1.561-.34-2.085a5.42 5.42 0 0 0-1.325-1.96A5.42 5.42 0 0 0 16.239.388c-.524-.184-1.138-.306-2.085-.34C13.206.013 12.799 0 9.178 0h2.839zm-.099 1.626c3.573 0 3.998.013 5.408.048.848.034 1.308.156 1.614.26.405.157.694.345.998.648.303.304.491.593.648.998.104.306.226.766.26 1.614.035 1.41.048 1.835.048 5.408s-.013 3.998-.048 5.408c-.034.848-.156 1.308-.26 1.614-.157.405-.345.694-.648.998-.304.303-.593.491-.998.648-.306.104-.766.226-1.614.26-1.41.035-1.835.048-5.408.048s-3.998-.013-5.408-.048c-.848-.034-1.308-.156-1.614-.26a2.678 2.678 0 0 1-.998-.648 2.678 2.678 0 0 1-.648-.998c-.104-.306-.226-.766-.26-1.614-.035-1.41-.048-1.835-.048-5.408s.013-3.998.048-5.408c.034-.848.156-1.308.26-1.614.157-.405.345-.694.648-.998.304-.303.593-.491.998-.648.306-.104.766-.226 1.614-.26 1.41-.035 1.835-.048 5.408-.048z"/>
        <path d="M12.017 15.33a5.33 5.33 0 1 1 0-10.66 5.33 5.33 0 0 1 0 10.66zm0-8.534a3.204 3.204 0 1 0 0 6.408 3.204 3.204 0 0 0 0-6.408z"/>
        <path d="M19.846 6.024a1.244 1.244 0 1 1-2.488 0 1.244 1.244 0 0 1 2.488 0z"/>
      </svg>
    ),
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Connect your Instagram business account for automated posts',
    oauthUrl: '/api/auth/instagram',
    requiresManualSetup: true,
  },
};

export function ConnectAccountModal({ isOpen, onClose }: ConnectAccountModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualSetupData, setManualSetupData] = useState({
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessSecret: '',
  });
  const { session } = useAuth();

  const handleOAuthConnect = async (platform: Platform) => {
    setIsConnecting(true);
    try {
      // Redirect to OAuth flow
      window.location.href = PLATFORMS[platform].oauthUrl;
    } catch (error) {
      toast.error(`Failed to connect to ${PLATFORMS[platform].name}`);
      setIsConnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (!selectedPlatform) return;
    if (!session?.access_token) {
      toast.error('Please sign in before connecting an account.');
      return;
    }
    
    setIsConnecting(true);
    try {
      const response = await fetch('/api/social/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          credentials: manualSetupData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect account');
      }

      toast.success(`Successfully connected ${PLATFORMS[selectedPlatform].name}!`);
      onClose();
    } catch (error) {
      toast.error('Failed to connect account. Please check your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  const renderPlatformSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose a platform to connect
        </h3>
        <p className="text-gray-600">
          Select the social media platform you want to add to your automation
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(PLATFORMS).map(([key, platform]) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="p-4 cursor-pointer border-2 border-transparent hover:border-primary-200 transition-all"
              onClick={() => setSelectedPlatform(key as Platform)}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg text-white ${platform.color}`}>
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{platform.name}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {platform.description}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderConnectionMethod = () => {
    if (!selectedPlatform) return null;

    const platform = PLATFORMS[selectedPlatform];

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={() => setSelectedPlatform(null)}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
          <div className={`p-2 rounded-lg text-white ${platform.color}`}>
            {platform.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Connect {platform.name}
            </h3>
            <p className="text-gray-600">{platform.description}</p>
          </div>
        </div>

        {!platform.requiresManualSetup ? (
          <div className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Quick OAuth Setup</p>
                  <p>
                    Click the button below to securely connect your {platform.name} account.
                    You'll be redirected to {platform.name} to authorize access.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleOAuthConnect(selectedPlatform)}
              disabled={isConnecting}
              className="w-full flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>
                {isConnecting ? 'Connecting...' : `Connect with ${platform.name}`}
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Manual Setup Required</p>
                  <p>
                    {platform.name} requires manual API key setup. Please enter your
                    API credentials below.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="API Key"
                type="password"
                value={manualSetupData.apiKey}
                onChange={(e) =>
                  setManualSetupData(prev => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder="Enter your API key"
              />
              <Input
                label="API Secret"
                type="password"
                value={manualSetupData.apiSecret}
                onChange={(e) =>
                  setManualSetupData(prev => ({ ...prev, apiSecret: e.target.value }))
                }
                placeholder="Enter your API secret"
              />
              <Input
                label="Access Token"
                type="password"
                value={manualSetupData.accessToken}
                onChange={(e) =>
                  setManualSetupData(prev => ({ ...prev, accessToken: e.target.value }))
                }
                placeholder="Enter your access token"
              />
              {selectedPlatform === 'instagram' && (
                <Input
                  label="Access Token Secret"
                  type="password"
                  value={manualSetupData.accessSecret}
                  onChange={(e) =>
                    setManualSetupData(prev => ({ ...prev, accessSecret: e.target.value }))
                  }
                  placeholder="Enter your access token secret"
                />
              )}
            </div>

            <Button
              onClick={handleManualConnect}
              disabled={isConnecting || !manualSetupData.apiKey || !manualSetupData.apiSecret}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect Account'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <AnimatePresence mode="wait">
          {!selectedPlatform ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderPlatformSelection()}
            </motion.div>
          ) : (
            <motion.div
              key="connection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {renderConnectionMethod()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
