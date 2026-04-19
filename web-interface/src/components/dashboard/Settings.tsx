'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  Bell,
  Shield,
  Key,
  Palette,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';

type SettingsSection = 'profile' | 'notifications' | 'security' | 'api' | 'appearance' | 'billing';

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
};

function SectionButton({
  icon: Icon,
  label,
  isActive,
  onClick
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isActive ? 'rotate-90' : ''}`} />
    </button>
  );
}

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc',
    timezone: 'America/New_York',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    postPublished: true,
    workflowErrors: true,
    weeklyReport: true,
    newFeatures: false,
    marketingEmails: false,
  });

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
  });

  // API Keys
  const [apiKeys] = useState<ApiKey[]>([
    { id: '1', name: 'Production API', key: 'sk_live_abc123...xyz789', createdAt: '2024-01-15', lastUsed: '2 hours ago' },
    { id: '2', name: 'Development', key: 'sk_test_def456...uvw012', createdAt: '2024-02-20', lastUsed: '1 day ago' },
  ]);

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: 'light' as 'light' | 'dark' | 'system',
    compactMode: false,
    showAvatars: true,
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
                <Input
                  label="Company"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">JD</span>
                </div>
                <div>
                  <Button variant="outline" size="sm">Upload Photo</Button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Daily Email Digest</p>
                  <p className="text-sm text-gray-600">Receive a summary of your activity</p>
                </div>
                <Switch
                  checked={notifications.emailDigest}
                  onChange={(checked) => setNotifications({ ...notifications, emailDigest: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Post Published</p>
                  <p className="text-sm text-gray-600">Get notified when posts go live</p>
                </div>
                <Switch
                  checked={notifications.postPublished}
                  onChange={(checked) => setNotifications({ ...notifications, postPublished: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Workflow Errors</p>
                  <p className="text-sm text-gray-600">Alert when workflows fail</p>
                </div>
                <Switch
                  checked={notifications.workflowErrors}
                  onChange={(checked) => setNotifications({ ...notifications, workflowErrors: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Weekly Report</p>
                  <p className="text-sm text-gray-600">Performance summary every Monday</p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">New Features</p>
                  <p className="text-sm text-gray-600">Learn about new capabilities</p>
                </div>
                <Switch
                  checked={notifications.newFeatures}
                  onChange={(checked) => setNotifications({ ...notifications, newFeatures: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Marketing Emails</p>
                  <p className="text-sm text-gray-600">Tips and promotional content</p>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onChange={(checked) => setNotifications({ ...notifications, marketingEmails: checked })}
                />
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">Add an extra layer of security</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {security.twoFactorEnabled ? (
                    <Badge variant="success">Enabled</Badge>
                  ) : (
                    <Badge variant="warning">Disabled</Badge>
                  )}
                  <Button
                    variant={security.twoFactorEnabled ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => setSecurity({ ...security, twoFactorEnabled: !security.twoFactorEnabled })}
                  >
                    {security.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">Password</h4>
              <div className="space-y-4">
                <Input label="Current Password" type="password" />
                <Input label="New Password" type="password" />
                <Input label="Confirm New Password" type="password" />
                <Button variant="outline">Update Password</Button>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">Session Settings</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Timeout (minutes)
                </label>
                <select
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>
            </Card>

            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Danger Zone</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 border-red-300 text-red-700 hover:bg-red-100">
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Key
              </Button>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{apiKey.name}</p>
                        <Badge variant="secondary" size="sm">Active</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {showApiKey === apiKey.id ? apiKey.key : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {showApiKey === apiKey.id ? (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Created {apiKey.createdAt} • Last used {apiKey.lastUsed}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">API Documentation</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Learn how to integrate with our API and automate your workflows programmatically.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    View Documentation
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setAppearance({ ...appearance, theme })}
                    className={`flex-1 p-4 border rounded-lg transition-colors ${
                      appearance.theme === theme
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Palette className="w-5 h-5 text-gray-600" />
                      {appearance.theme === theme && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{theme}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Compact Mode</p>
                  <p className="text-sm text-gray-600">Reduce spacing and padding</p>
                </div>
                <Switch
                  checked={appearance.compactMode}
                  onChange={(checked) => setAppearance({ ...appearance, compactMode: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Show Avatars</p>
                  <p className="text-sm text-gray-600">Display profile pictures in lists</p>
                </div>
                <Switch
                  checked={appearance.showAvatars}
                  onChange={(checked) => setAppearance({ ...appearance, showAvatars: checked })}
                />
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Subscription</h3>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="text-2xl font-bold text-gray-900">Pro Plan</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-600">Billing Cycle</p>
                  <p className="font-medium text-gray-900">Monthly</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Payment</p>
                  <p className="font-medium text-gray-900">Feb 1, 2026</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-gray-900">$49/month</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline">Change Plan</Button>
                <Button variant="ghost" className="text-red-600">Cancel Subscription</Button>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">Payment Method</h4>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CreditCard className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                  <p className="text-sm text-gray-600">Expires 12/26</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">Update</Button>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">Billing History</h4>
              <div className="space-y-3">
                {[
                  { date: 'Jan 1, 2026', amount: '$49.00', status: 'Paid' },
                  { date: 'Dec 1, 2025', amount: '$49.00', status: 'Paid' },
                  { date: 'Nov 1, 2025', amount: '$49.00', status: 'Paid' },
                ].map((invoice, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.date}</p>
                      <p className="text-sm text-gray-600">{invoice.amount}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="success" size="sm">{invoice.status}</Badge>
                      <Button variant="ghost" size="sm">Download</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="p-4 h-fit">
          <nav className="space-y-1">
            <SectionButton
              icon={User}
              label="Profile"
              isActive={activeSection === 'profile'}
              onClick={() => setActiveSection('profile')}
            />
            <SectionButton
              icon={Bell}
              label="Notifications"
              isActive={activeSection === 'notifications'}
              onClick={() => setActiveSection('notifications')}
            />
            <SectionButton
              icon={Shield}
              label="Security"
              isActive={activeSection === 'security'}
              onClick={() => setActiveSection('security')}
            />
            <SectionButton
              icon={Key}
              label="API Keys"
              isActive={activeSection === 'api'}
              onClick={() => setActiveSection('api')}
            />
            <SectionButton
              icon={Palette}
              label="Appearance"
              isActive={activeSection === 'appearance'}
              onClick={() => setActiveSection('appearance')}
            />
            <SectionButton
              icon={CreditCard}
              label="Billing"
              isActive={activeSection === 'billing'}
              onClick={() => setActiveSection('billing')}
            />
          </nav>
        </Card>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {renderContent()}
          </Card>
        </div>
      </div>
    </div>
  );
}
