import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import ServiceWorkerRegistrar from '@/components/ui/ServiceWorkerRegistrar'
import OfflineBanner from '@/components/ui/OfflineBanner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'LifeOS',
  description: 'Your personal discipline OS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LifeOS',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#030712',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:font-medium">
          Skip to content
        </a>
        <ServiceWorkerRegistrar />
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
