import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Monthly projects and write-ups.',
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <html lang="en">
    <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
  </html>
);

export default RootLayout;
