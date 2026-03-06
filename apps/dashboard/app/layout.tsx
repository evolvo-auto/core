import * as React from 'react';
import { Geist } from 'next/font/google';

import './globals.css';

const dashboardFont = Geist({
  subsets: ['latin']
});

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className={dashboardFont.className} lang="en">
      <body className="relative min-h-screen overflow-x-hidden bg-[#020406] text-evolvo-ink antialiased selection:bg-evolvo-accent/25 selection:text-[#05120b]">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(71,217,140,0.2),transparent_34%),radial-gradient(circle_at_top_right,rgba(135,249,182,0.18),transparent_22%),linear-gradient(180deg,#08111a_0%,#05090f_56%,#020406_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(135,249,182,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(71,217,140,0.16),transparent_28%)]" />
        </div>
        {children}
      </body>
    </html>
  );
}
