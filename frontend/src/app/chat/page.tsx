import type { Metadata } from 'next';
import { ChatPageClient } from './client';

export const metadata: Metadata = {
  title: 'Chat — DocAgent',
  description: 'Ask questions about your documents and get AI-powered answers with citations.',
};

export default function ChatPage() {
  return <ChatPageClient />;
}
