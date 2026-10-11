import type { AppProps } from 'next/app';
import '@lanonasis/brand-kit/css';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
