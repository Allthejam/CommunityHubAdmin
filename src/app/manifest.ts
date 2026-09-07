import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Community Hub',
    short_name: 'Community Hub',
    description: 'Your community at your fingertips.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
        {
            src: 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
            sizes: '192x192',
            type: 'image/png'
        },
        {
            src: 'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png',
            sizes: '512x512',
            type: 'image/png'
        }
    ],
    shortcuts: [
      {
        name: 'Community Feed',
        short_name: 'Feed',
        description: 'View the latest posts in your community',
        url: '/feed',
        icons: [{ src: 'https://i.postimg.cc/J0bQ9c5H/feed.png', sizes: '96x96' }]
      },
      {
        name: 'The Highstreet',
        short_name: 'Shop',
        description: 'Browse local shops on the virtual highstreet',
        url: '/shopping/highstreet',
        icons: [{ src: 'https://i.postimg.cc/k4Gz3v4b/shopping.png', sizes: '96x96' }]
      },
      {
        name: 'Community Chat',
        short_name: 'Chat',
        description: 'Jump directly into your conversations',
        url: '/chat',
        icons: [{ src: 'https://i.postimg.cc/wMPR5kXn/chat.png', sizes: '96x96' }]
      }
    ]
  }
}
