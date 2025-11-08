import { useMemo, useCallback } from 'react';

/**
 * Hook for application-wide event bus
 * Provides pub/sub mechanism for cross-component communication
 */
export function useEventBus() {
  // Use window as the event target for global events
  const eventBus = useMemo(() => window, []);

  const emit = useCallback((event: string, data?: any) => {
    const customEvent = new CustomEvent(event, { detail: data });
    eventBus.dispatchEvent(customEvent);
  }, [eventBus]);

  const on = useCallback((event: string, handler: (e: CustomEvent) => void) => {
    const listener = handler as EventListener;
    eventBus.addEventListener(event, listener);
    return () => eventBus.removeEventListener(event, listener);
  }, [eventBus]);

  const once = useCallback((event: string, handler: (e: CustomEvent) => void) => {
    const listener = (e: Event) => {
      handler(e as CustomEvent);
      eventBus.removeEventListener(event, listener);
    };
    eventBus.addEventListener(event, listener);
    return () => eventBus.removeEventListener(event, listener);
  }, [eventBus]);

  return { emit, on, once };
}
