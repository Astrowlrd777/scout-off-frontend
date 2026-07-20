'use client';
import { Suspense } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ScoutDashboardContent from '@/components/scout/ScoutDashboardContent';

export default function ScoutDashboard() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <ScoutDashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}
