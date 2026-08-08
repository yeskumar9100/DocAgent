import type { Metadata } from 'next';
import { SettingsPageClient } from './client';

export const metadata: Metadata = {
  title: 'Settings — DocAgent',
  description: 'Configure AI providers, API keys, and application preferences.',
};

export default function SettingsPageRoute() {
  return <SettingsPageClient />;
}
