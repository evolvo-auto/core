'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@evolvo/query/getQueryClient';

type DashboardProvidersProps = {
  children: React.ReactNode;
};

export default function DashboardProviders({
  children
}: DashboardProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
