import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Zalus IDE - Cloud Native Development Environment',
  description: 'IDE simplificado con agente de codificación IA integrado. Desarrolla aplicaciones web directamente en la nube.',
  keywords: ['IDE', 'Cloud', 'AI', 'Development', 'Coding Agent', 'Next.js', 'Vercel'],
  authors: [{ name: 'Zalus' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}