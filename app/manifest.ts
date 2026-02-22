import { MetadataRoute } from 'next'

export default function manifest(): any {
    return {
        name: 'Walkie-Lazy',
        short_name: 'Walkie Lazy',
        description: 'Real-time Walkie Talkie',
        start_url: '/',
        display: 'standalone',
        background_color: "#ffffff",
        theme_color: "#ffffff",
        gcm_sender_id: "1039538000707",
        icons: [
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: "maskable"
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: "maskable"
            },
        ],
    }
}
