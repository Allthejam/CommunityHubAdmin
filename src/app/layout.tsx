import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { FirebaseClientProvider } from '@/firebase'
import { GoogleAnalytics } from '@/components/google-analytics'
import { CartProvider } from '@/contexts/cart-context'

export const metadata: Metadata = {
  title: 'Community Hub Admin',
  description: 'The central administration and leadership platform for Community Hub.',
  icons: {
    icon: [
      { url: 'https://i.postimg.cc/63VmdRcZ/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
      { url: 'https://i.postimg.cc/NF9qkbK1/HubLogoIOS180x180.png', sizes: '180x180' }
    ],
    other: [
      {
        rel: 'icon',
        url: 'https://i.postimg.cc/63VmdRcZ/favicon-32x32.png',
        sizes: '32x32'
      },
      {
        rel: 'icon',
        url: 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
        sizes: '192x192'
      },
      {
        rel: 'icon',
        url: 'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png',
        sizes: '512x512'
      }
    ],
  },
  openGraph: {
    title: 'Community Hub Admin',
    description: 'The central administration and leadership platform for Community Hub.',
    url: '/',
    siteName: 'Community Hub Admin',
    images: [
      {
        url: 'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png',
        width: 512,
        height: 512,
        alt: 'Community Hub Logo',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
          <CartProvider>
            <GoogleAnalytics />
            {children}
            <Toaster />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  )
}
