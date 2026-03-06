import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DashboardPage from './page.js';

describe('DashboardPage', () => {
  it('renders the dashboard shell headline and current mode messaging', () => {
    const markup = renderToStaticMarkup(<DashboardPage />);

    expect(markup).toContain(
      'Operator shell for an autonomous engineering system.'
    );
    expect(markup).toContain('Capability overview');
    expect(markup).toContain('This screen is intentionally non-authoritative.');
    expect(markup).not.toContain('style=');
  });

  it('renders every planned system signal card in the overview grid', () => {
    const markup = renderToStaticMarkup(<DashboardPage />);
    const renderedCards = markup.match(/data-signal-tone=/g) ?? [];

    expect(renderedCards).toHaveLength(6);
    expect(markup).toContain('Dashboard shell');
    expect(markup).toContain('Local database stack');
    expect(markup).toContain('Runtime health endpoint');
    expect(markup).toContain('Supervisor health endpoint');
  });
});
