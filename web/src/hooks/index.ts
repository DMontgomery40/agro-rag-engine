/**
 * AGRO React Hooks
 *
 * These hooks bridge the React components with the legacy module system
 * while maintaining full functionality and ADA compliance.
 */

export { useAppInit } from './useAppInit';
export { useModuleLoader } from './useModuleLoader';
export { useEventBus } from './useEventBus';
export { useGlobalState } from './useGlobalState';
export { useApplyButton } from './useApplyButton';
export { useNotification } from './useNotification';

// Core utility hooks (converted from legacy modules)
export { useAPI } from './useAPI';
export { useTheme } from './useTheme';
export { useUIHelpers } from './useUIHelpers';

// Navigation hooks (React Router integration)
export { useNavigation } from './useNavigation';
export { useTabs } from './useTabs';
export { useVSCodeEmbed } from './useVSCodeEmbed';
