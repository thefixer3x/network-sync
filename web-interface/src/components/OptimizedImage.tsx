/**
 * Optimized Image Component
 *
 * Wrapper around Next.js Image for consistent optimization across the app.
 * Automatically handles:
 * - Modern image formats (AVIF, WebP)
 * - Responsive sizing
 * - Lazy loading
 * - Blur placeholders
 */

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import clsx from 'clsx';

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  /**
   * Show blur placeholder while loading
   * @default true
   */
  blurPlaceholder?: boolean;

  /**
   * Fallback image if main image fails to load
   */
  fallbackSrc?: string;

  /**
   * Custom className for container
   */
  containerClassName?: string;
}

export function OptimizedImage({
  blurPlaceholder = true,
  fallbackSrc,
  containerClassName,
  className,
  alt,
  onError,
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    onError?.(e);
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    props.onLoad?.(e);
  };

  // Use fallback if main image failed
  const src = hasError && fallbackSrc ? fallbackSrc : props.src;

  return (
    <div className={clsx('relative overflow-hidden', containerClassName)}>
      <Image
        {...props}
        src={src}
        alt={alt}
        className={clsx(
          className,
          'transition-opacity duration-300',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100'
        )}
        placeholder={blurPlaceholder ? 'blur' : 'empty'}
        blurDataURL={
          blurPlaceholder
            ? 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4='
            : undefined
        }
        onError={handleError}
        onLoad={handleLoad}
        quality={90}
        loading="lazy"
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar Image - Optimized for profile pictures
 */
interface AvatarImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarImage({ size = 'md', ...props }: AvatarImageProps) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const pixels = sizeMap[size];

  return (
    <OptimizedImage
      {...props}
      width={pixels}
      height={pixels}
      className={clsx('rounded-full object-cover', props.className)}
      containerClassName={clsx('rounded-full', props.containerClassName)}
      fallbackSrc="/default-avatar.png"
    />
  );
}

/**
 * Logo Image - Optimized for brand logos
 */
interface LogoImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  size?: 'sm' | 'md' | 'lg';
}

export function LogoImage({ size = 'md', ...props }: LogoImageProps) {
  const sizeMap = {
    sm: { width: 80, height: 32 },
    md: { width: 120, height: 48 },
    lg: { width: 160, height: 64 },
  };

  const { width, height } = sizeMap[size];

  return (
    <OptimizedImage
      {...props}
      width={width}
      height={height}
      className={clsx('object-contain', props.className)}
      blurPlaceholder={false}
    />
  );
}

/**
 * Usage Examples:
 *
 * Basic usage:
 * ```tsx
 * <OptimizedImage
 *   src="/hero.jpg"
 *   alt="Hero image"
 *   width={1200}
 *   height={600}
 * />
 * ```
 *
 * With fallback:
 * ```tsx
 * <OptimizedImage
 *   src={user.profileImage}
 *   alt={user.name}
 *   width={200}
 *   height={200}
 *   fallbackSrc="/default-profile.png"
 * />
 * ```
 *
 * Avatar:
 * ```tsx
 * <AvatarImage
 *   src={user.avatar}
 *   alt={user.name}
 *   size="lg"
 * />
 * ```
 *
 * Logo:
 * ```tsx
 * <LogoImage
 *   src="/logo.png"
 *   alt="Company Logo"
 *   size="md"
 * />
 * ```
 */
