import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({
    className: 'font-dashboard'
  })
}));

vi.mock('./providers', () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}));

import RootLayout from './layout';

describe('RootLayout', () => {
  it('renders the required html and body structure for the app router', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Dashboard shell</main>
      </RootLayout>
    );

    expect(markup).toContain('<html class="font-dashboard" lang="en">');
    expect(markup).toContain('min-h-screen overflow-x-hidden');
    expect(markup).toContain('<main>Dashboard shell</main>');
  });
});
