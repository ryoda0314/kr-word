import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ko-word-book',
    short_name: 'ko-word-book',
    description:
      'TOPIK と日常会話の語彙を、分類して、例文で、定着させる韓国語単語帳。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'ja',
    background_color: '#FAFAF7',
    theme_color: '#BE4BDB', // Mantine grape 6
    categories: ['education'],
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
