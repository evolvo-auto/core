import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DashboardProviders from './providers';

describe('DashboardProviders', () => {
  it('renders its children inside the query client provider tree', () => {
    const markup = renderToStaticMarkup(
      <DashboardProviders>
        <main>Live board</main>
      </DashboardProviders>
    );

    expect(markup).toContain('<main>Live board</main>');
  });
});
