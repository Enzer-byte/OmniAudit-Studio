import './globals.css';
import React from 'react';

export const metadata = {
  title: 'OmniAudit Studio | Local AI UI/UX & Conversion Auditing Platform',
  description: 'Self-hosted Playwright + Vision AI website auditing and design token spy workbench.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#1E1E1E] text-[#F5F5F7] antialiased">{children}</body>
    </html>
  );
}
