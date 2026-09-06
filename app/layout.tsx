import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Little Lobster · Pearl Rescue',
  description:
    'Swim, dash, and follow the pearl trail through a hand-painted underwater adventure.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
