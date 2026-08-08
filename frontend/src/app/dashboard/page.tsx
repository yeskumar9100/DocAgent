import { Metadata } from 'next';
import { DashboardPageClient } from './client';

export const metadata: Metadata = {
  title: 'Dashboard — DocAgent',
  description: 'Your AI document assistant overview — stats, recent documents, and provider health at a glance.',
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
