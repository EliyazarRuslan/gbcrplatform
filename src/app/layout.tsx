import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GBCR Platform',
  description: 'Goldbell Car Rental - Vehicle Booking & Inspection Platform',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
