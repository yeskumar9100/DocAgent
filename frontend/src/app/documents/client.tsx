'use client';

import { useRouter } from 'next/navigation';
import { DocumentLibrary } from '@/components/documents/DocumentLibrary';

export function DocumentLibraryClient() {
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <DocumentLibrary />
    </div>
  );
}
