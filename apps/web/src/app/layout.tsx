import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { cn } from '@/lib/utils';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'Qua Thomas', template: '%s · Qua Thomas' },
  description: 'Monthly projects and write-ups.',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <html lang="en" className={cn('font-sans', geist.variable)}>
    <body className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</div>
      <SiteFooter />
    </body>
  </html>
);

export default RootLayout;
