import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({
    variable: 'font-dashboard'
  })
}));

import RootLayout from './layout.js';

describe('RootLayout', () => {
  it('renders the required html and body structure for the app router', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Dashboard shell</main>
      </RootLayout>
    );

    expect(markup).toContain('<html class="font-dashboard" lang="en">');
    expect(markup).toContain('<body><main>Dashboard shell</main></body>');
  });
});
