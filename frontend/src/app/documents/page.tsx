import type { Metadata } from 'next';
import { DocumentLibraryClient } from './client';

export const metadata: Metadata = {
  title: 'Document Library — DocAgent',
  description: 'Browse, manage, and select your uploaded documents for AI chat.',
};

export default function DocumentsPage() {
  return <DocumentLibraryClient />;
}
