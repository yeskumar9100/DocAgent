'use client';

import { SettingsPage } from '@/components/settings/SettingsPage';

export function SettingsPageClient() {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <SettingsPage />
    </div>
  );
}
