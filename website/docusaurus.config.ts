import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'AGRO Documentation',
  tagline: 'Local-first RAG engine for codebases',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://dmontgomery40.github.io',
  baseUrl: '/agro-rag-engine/',

  organizationName: 'DMontgomery40',
  projectName: 'agro-rag-engine',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/DMontgomery40/agro-rag-engine/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/agro-social.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'AGRO',
      logo: {
        alt: 'AGRO Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/DMontgomery40/agro-rag-engine',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Quick Start',
              to: '/getting-started/quickstart',
            },
            {
              label: 'API Reference',
              to: '/api/reference',
            },
            {
              label: 'Configuration',
              to: '/configuration/models',
            },
          ],
        },
        {
          title: 'Features',
          items: [
            {
              label: 'RAG System',
              to: '/features/rag',
            },
            {
              label: 'Learning Reranker',
              to: '/features/learning-reranker',
            },
            {
              label: 'MCP Integration',
              to: '/features/mcp',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/DMontgomery40/agro-rag-engine',
            },
            {
              label: 'Contributing',
              to: '/development/contributing',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} AGRO Project. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['bash', 'python', 'typescript', 'json', 'yaml'],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'agro',
      contextualSearch: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
