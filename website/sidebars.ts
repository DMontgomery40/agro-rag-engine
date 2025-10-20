import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/quickstart',
        'getting-started/installation',
        'getting-started/first-steps',
      ],
    },
    {
      type: 'category',
      label: 'Core Features',
      items: [
        'features/rag',
        'features/learning-reranker',
        'features/mcp',
        'features/chat-interface',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/reference',
        'api/endpoints',
        'api/mcp-tools',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration/models',
        'configuration/performance',
        'configuration/filtering',
        'configuration/alerting',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/contributing',
        'development/vscode-setup',
        'development/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'operations/deployment',
        'operations/monitoring',
        'operations/troubleshooting',
      ],
    },
  ],
};

export default sidebars;
