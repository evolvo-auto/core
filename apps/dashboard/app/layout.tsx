import * as React from 'react';
import { Geist } from 'next/font/google';

import './globals.css';

const dashboardFont = Geist({
  subsets: ['latin'],
  variable: '--font-dashboard'
});

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className={dashboardFont.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
