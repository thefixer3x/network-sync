'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConnectAccountModal } from './ConnectAccountModal';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { toast } from 'react-hot-toast';

export interface SocialAccount {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  username: string;
  displayName: string;
  profileImage: string;
  status: 'connected' | 'error' | 'pending';
  followers: number;
  lastSync: Date;
  isActive: boolean;
}

const PLATFORM_COLORS = {
  twitter: 'bg-blue-500',
  linkedin: 'bg-blue-700',
  facebook: 'bg-blue-600',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
};

const PLATFORM_ICONS = {
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.48.204 4.955.388a5.42 5.42 0 0 0-1.96 1.276A5.42 5.42 0 0 0 1.67 3.624c-.184.524-.306 1.138-.34 2.085C1.295 6.657 1.282 7.064 1.282 10.685s.013 4.028.048 4.976c.034.947.156 1.561.34 2.085a5.42 5.42 0 0 0 1.325 1.96 5.42 5.42 0 0 0 1.96 1.325c.524.184 1.138.306 2.085.34.948.035 1.355.048 4.976.048s4.028-.013 4.976-.048c.947-.034 1.561-.156 2.085-.34a5.42 5.42 0 0 0 1.96-1.325 5.42 5.42 0 0 0 1.325-1.96c.184-.524.306-1.138.34-2.085.035-.948.048-1.355.048-4.976s-.013-4.028-.048-4.976c-.034-.947-.156-1.561-.34-2.085a5.42 5.42 0 0 0-1.325-1.96A5.42 5.42 0 0 0 16.239.388c-.524-.184-1.138-.306-2.085-.34C13.206.013 12.799 0 9.178 0h2.839zm-.099 1.626c3.573 0 3.998.013 5.408.048.848.034 1.308.156 1.614.26.405.157.694.345.998.648.303.304.491.593.648.998.104.306.226.766.26 1.614.035 1.41.048 1.835.048 5.408s-.013 3.998-.048 5.408c-.034.848-.156 1.308-.26 1.614-.157.405-.345.694-.648.998-.304.303-.593.491-.998.648-.306.104-.766.226-1.614.26-1.41.035-1.835.048-5.408.048s-3.998-.013-5.408-.048c-.848-.034-1.308-.156-1.614-.26a2.678 2.678 0 0 1-.998-.648 2.678 2.678 0 0 1-.648-.998c-.104-.306-.226-.766-.26-1.614-.035-1.41-.048-1.835-.048-5.408s.013-3.998.048-5.408c.034-.848.156-1.308.26-1.614.157-.405.345-.694.648-.998.304-.303.593-.491.998-.648.306-.104.766-.226 1.614-.26 1.41-.035 1.835-.048 5.408-.048z"/>
      <path d="M12.017 15.33a5.33 5.33 0 1 1 0-10.66 5.33 5.33 0 0 1 0 10.66zm0-8.534a3.204 3.204 0 1 0 0 6.408 3.204 3.204 0 0 0 0-6.408z"/>
      <path d="M19.846 6.024a1.244 1.244 0 1 1-2.488 0 1.244 1.244 0 0 1 2.488 0z"/>
    </svg>
  ),
};

export function SocialAccounts() {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const { accounts, isLoading, refetch } = useSocialAccounts();

  const handleRefresh = async () => {
    toast.promise(refetch(), {
      loading: 'Refreshing accounts...',
      success: 'Accounts refreshed successfully!',
      error: 'Failed to refresh accounts',
    });
  };

  const getStatusIcon = (status: SocialAccount['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Accounts</h1>
          <p className="text-gray-600 mt-2">
            Connect and manage your social media accounts
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Account</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {accounts?.map((account: SocialAccount) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg text-white ${PLATFORM_COLORS[account.platform]}`}>
                      {PLATFORM_ICONS[account.platform]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {account.displayName}
                      </h3>
                      <p className="text-sm text-gray-500">@{account.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(account.status)}
                    <button className="p-1 rounded-md hover:bg-gray-100">
                      <Settings className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge
                      variant={
                        account.status === 'connected'
                          ? 'success'
                          : account.status === 'error'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {account.status === 'connected' ? 'Active' : 
                       account.status === 'error' ? 'Error' : 'Pending'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Followers</span>
                    <span className="font-semibold text-gray-900">
                      {formatNumber(account.followers)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Sync</span>
                    <span className="text-sm text-gray-500">
                      {new Date(account.lastSync).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Auto-posting</span>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={account.isActive}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {(!accounts || accounts.length === 0) && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full"
          >
            <Card className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No accounts connected
              </h3>
              <p className="text-gray-600 mb-6">
                Connect your first social media account to start automating your content.
              </p>
              <Button onClick={() => setShowConnectModal(true)}>
                Connect Your First Account
              </Button>
            </Card>
          </motion.div>
        )}
      </div>

      <ConnectAccountModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
}