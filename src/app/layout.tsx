import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Family Finance Hub', description: 'Self-hosted household finance dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
