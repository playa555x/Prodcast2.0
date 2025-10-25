import type { Metadata } from 'next'
import './globals.css'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { TTSProviderProvider } from '@/contexts/TTSProviderContext'

export const metadata: Metadata = {
  title: 'GedächtnisBoost Premium',
  description: 'Premium TTS Platform',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: '#667EEA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GedächtnisBoost',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>
        <ProjectProvider>
          <TTSProviderProvider>
            {children}
          </TTSProviderProvider>
        </ProjectProvider>
      </body>
    </html>
  )
}
