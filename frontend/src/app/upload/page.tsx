import type { Metadata } from 'next';
import { UploadPageClient } from './client';

export const metadata: Metadata = {
  title: 'Upload Documents — DocAgent',
  description: 'Upload PDF, TXT, or DOCX files to create your AI-powered document library.',
};

export default function UploadPage() {
  return <UploadPageClient />;
}
