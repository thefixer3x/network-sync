'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      const { error } = isLogin 
        ? await signIn(formData.email, formData.password)
        : await signUp(formData.email, formData.password);

      if (error) {
        toast.error(error.message || 'Authentication failed');
      } else {
        if (!isLogin) {
          toast.success('Account created! Please check your email for verification.');
        } else {
          toast.success('Welcome back!');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-600 mt-2">
          {isLogin 
            ? 'Sign in to access your automation dashboard' 
            : 'Get started with social media automation'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange('email')}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange('password')}
              className="pl-10 pr-10"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className="pl-10"
                required={!isLogin}
                minLength={6}
              />
            </motion.div>
          )}
        </div>

        {isLogin && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-600">Remember me</span>
            </label>
            <button
              type="button"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot password?
            </button>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <div className="spinner" />
          ) : (
            <>
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      {/* Social Login Options */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex items-center justify-center space-x-2"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex items-center justify-center space-x-2"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.48.204 4.955.388a5.42 5.42 0 0 0-1.96 1.276A5.42 5.42 0 0 0 1.67 3.624c-.184.524-.306 1.138-.34 2.085C1.295 6.657 1.282 7.064 1.282 10.685s.013 4.028.048 4.976c.034.947.156 1.561.34 2.085a5.42 5.42 0 0 0 1.325 1.96 5.42 5.42 0 0 0 1.96 1.325c.524.184 1.138.306 2.085.34.948.035 1.355.048 4.976.048s4.028-.013 4.976-.048c.947-.034 1.561-.156 2.085-.34a5.42 5.42 0 0 0 1.96-1.325 5.42 5.42 0 0 0 1.325-1.96c.184-.524.306-1.138.34-2.085.035-.948.048-1.355.048-4.976s-.013-4.028-.048-4.976c-.034-.947-.156-1.561-.34-2.085a5.42 5.42 0 0 0-1.325-1.96A5.42 5.42 0 0 0 16.239.388c-.524-.184-1.138-.306-2.085-.34C13.206.013 12.799 0 9.178 0h2.839z"/>
              <path d="M12.017 15.33a5.33 5.33 0 1 1 0-10.66 5.33 5.33 0 0 1 0 10.66zm0-8.534a3.204 3.204 0 1 0 0 6.408 3.204 3.204 0 0 0 0-6.408z"/>
            </svg>
            <span>GitHub</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}