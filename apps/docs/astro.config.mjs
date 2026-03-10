import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Warren',
      tagline: 'Your terminal is too powerful to be a black box.',
      // TODO: Add SVG logo to src/assets/warren-logo.svg and uncomment:
      // logo: { src: './src/assets/warren-logo.svg' },
      social: {
        github: 'https://github.com/warren-sh/warren',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Welcome', link: '/' },
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'First Connection', link: '/getting-started/first-connection/' },
            { label: 'Pairing', link: '/getting-started/pairing/' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Remote Access', link: '/guides/remote-access/' },
            { label: 'Mac to Mac', link: '/guides/mac-to-mac/' },
            { label: 'Themes', link: '/guides/themes/' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'CLI', link: '/reference/cli/' },
            { label: 'Config', link: '/reference/config/' },
            { label: 'Theme Format', link: '/reference/theme-format/' },
            { label: 'WebSocket Protocol', link: '/reference/ws-protocol/' },
          ],
        },
        {
          label: 'Security',
          items: [
            { label: 'Security Model', link: '/security/model/' },
            { label: 'Security Audit', link: '/security/audit/' },
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#1a1b26' },
        },
      ],
    }),
  ],
})
