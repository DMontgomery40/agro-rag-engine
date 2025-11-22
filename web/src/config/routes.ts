// AGRO - React Router Configuration
// Converted from legacy navigation.js TAB_REGISTRY and NEW_TABS

import { ReactNode, ComponentType } from 'react';
import { Dashboard } from '../pages/Dashboard';
import Docker from '../pages/Docker';
// Prefer legacy JSX tabs to preserve exact GUI IDs/styles
import ChatTab from '../components/tabs/ChatTab.tsx';
import VSCodeTab from '../components/tabs/VSCodeTab.tsx';
import GrafanaTab from '../components/tabs/GrafanaTab.jsx';
import RAGTab from '../components/tabs/RAGTab.tsx';
import ProfilesTab from '../components/tabs/ProfilesTab';
import InfrastructureTab from '../components/tabs/InfrastructureTab';
import AdminTab from '../components/tabs/AdminTab';
import StartTab from '../components/tabs/StartTab.tsx';

export interface Subtab {
  id: string;
  title: string;
}

export interface RouteConfig {
  path: string;
  element: ComponentType<any> | ReactNode;
  label: string;
  icon: string;
  order: number;
  subtabs?: Subtab[];
}

// Main route configuration - converted from NEW_TABS in navigation.js
export const routes: RouteConfig[] = [
  {
    path: '/start',
    element: StartTab,
    label: 'Get Started',
    icon: '🚀',
    order: 1,
    subtabs: []
  },
  {
    path: '/dashboard',
    element: Dashboard,
    label: 'Dashboard',
    icon: '📊',
    order: 2,
    subtabs: [
      { id: 'system', title: 'System Status' },
      { id: 'monitoring', title: 'Monitoring' },
      { id: 'storage', title: 'Storage' },
      { id: 'help', title: 'Help' },
      { id: 'glossary', title: 'Glossary' }
    ]
  },
  {
    path: '/chat',
    element: ChatTab,
    label: 'Chat',
    icon: '💬',
    order: 3,
    subtabs: []
  },
  {
    path: '/vscode',
    element: VSCodeTab,
    label: 'VS Code',
    icon: '📝',
    order: 4,
    subtabs: []
  },
  {
    path: '/grafana',
    element: GrafanaTab,
    label: 'Grafana',
    icon: '📈',
    order: 5,
    subtabs: []
  },
  {
    path: '/rag',
    element: RAGTab,
    label: 'RAG',
    icon: '🧠',
    order: 6,
    subtabs: [
      { id: 'data-quality', title: 'Data Quality' },
      { id: 'retrieval', title: 'Retrieval' },
      { id: 'external-rerankers', title: 'Reranker Selection' },
      { id: 'learning-ranker', title: 'Learning Ranker' },
      { id: 'indexing', title: 'Indexing' },
      { id: 'evaluate', title: 'Evaluate RAG Pipeline' }
    ]
  },
  {
    path: '/profiles',
    element: ProfilesTab,
    label: 'Profiles',
    icon: '💾',
    order: 7,
    subtabs: [
      { id: 'budget', title: 'Budget Calculator' },
      { id: 'management', title: 'Profile Management' },
      { id: 'overrides', title: 'Channel Overrides' }
    ]
  },
  {
    path: '/infrastructure',
    element: InfrastructureTab,
    label: 'Infrastructure',
    icon: '🔧',
    order: 8,
    subtabs: [
      { id: 'services', title: 'Services' },
      { id: 'mcp', title: 'MCP Servers' },
      { id: 'paths', title: 'Paths & Stores' },
      { id: 'monitoring', title: 'Monitoring' }
    ]
  },
  {
    path: '/admin',
    element: AdminTab,
    label: 'Admin',
    icon: '⚙️',
    order: 9,
    subtabs: [
      { id: 'general', title: 'General' },
      { id: 'git', title: 'Git Integration' },
      { id: 'secrets', title: 'Secrets' },
      { id: 'integrations', title: 'Integrations' }
    ]
  },
  {
    path: '/docker',
    element: Docker,
    label: 'Docker',
    icon: '🐳',
    order: 10,
    subtabs: []
  }
];

// Get route by path
export function getRouteByPath(path: string): RouteConfig | undefined {
  return routes.find(r => r.path === path);
}

// Get default route
export function getDefaultRoute(): RouteConfig {
  return routes.find(r => r.path === '/dashboard') || routes[0];
}
