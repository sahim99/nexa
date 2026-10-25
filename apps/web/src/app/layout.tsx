import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nexa V3 Command Center',
  description: 'AI Autonomous Agent Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  )
}
