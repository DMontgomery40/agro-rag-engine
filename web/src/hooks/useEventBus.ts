import { useMemo, useCallback } from 'react';

/**
 * Hook for application-wide event bus
 * Provides pub/sub mechanism for cross-component communication
 */
/**
 * ---agentspec
 * what: |
 *   React hook that provides a global event bus for cross-component communication using the browser's CustomEvent API.
 *   Takes no parameters; returns an object with an `emit` function that accepts an event name (string) and optional data payload.
 *   The `emit` function creates and dispatches CustomEvent instances on the window object, allowing any listener to receive the event and its detail payload.
 *   Handles edge cases: undefined/null data payloads are accepted; event names are case-sensitive; listeners must be attached to window to receive events.
 *   Uses useMemo to ensure eventBus reference (window) remains stable across renders, and useCallback to memoize the emit function.
 *
 * why: |
 *   Centralizes event emission logic into a reusable hook rather than scattering window.dispatchEvent calls throughout components.
 *   Leverages the native CustomEvent API instead of a third-party library, reducing bundle size and avoiding external dependencies.
 *   Memoization prevents unnecessary function recreation on every render, improving performance in components that emit frequently.
 *   This pattern enables sibling and distant components to communicate without prop drilling or context nesting.
 *
 * guardrails:
 *   - DO NOT use this for high-frequency events (>100/sec) because CustomEvent dispatch has performance overhead; consider state management libraries for real-time data
 *   - ALWAYS pair emit calls with corresponding window.addEventListener listeners; events without listeners are silently ignored and may indicate dead code
 *   - NOTE: Events are synchronous and fire immediately; async event handling requires manual Promise wrapping in listeners
 *   - NOTE: CustomEvent detail payload is not deeply cloned; mutations in listeners will affect the original data object
 *   - ASK USER: Before adding event filtering, validation, or namespacing logic, confirm whether a state management library (Redux, Zustand, Jotai) would be more appropriate than event bus expansion
 * ---/agentspec
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
    /**
     * ---agentspec
     * what: |
     *   Creates a one-time event listener that automatically removes itself after the first invocation.
     *   Takes an event name (string) and handler function (callback) as parameters.
     *   Returns nothing; the handler is invoked once when the event is emitted, then the listener is detached from the eventBus.
     *   The listener is registered via addEventListener and manually removed via removeEventListener after execution.
     *   Handles the cleanup by removing the listener immediately after the handler executes, preventing memory leaks from accumulated listeners.
     *
     * why: |
     *   Provides a convenience wrapper for single-use event subscriptions without requiring manual cleanup code at call sites.
     *   Reduces boilerplate compared to manually adding and removing listeners, improving code readability.
     *   The immediate removal after invocation ensures listeners don't accumulate in memory for events that should only fire once.
     *
     * guardrails:
     *   - DO NOT rely on the returned cleanup function for the once() listener; the listener is already removed after first invocation, so calling the cleanup function is redundant but harmless
     *   - ALWAYS ensure the handler function is synchronous; asynchronous handlers may not complete before the listener is removed
     *   - NOTE: If the same event is emitted multiple times before the first listener fires, only the first emission will trigger the handler; subsequent emissions will have no listener attached
     *   - ASK USER: Confirm whether the eventBus should support listener priority or ordering before adding multiple once() listeners for the same event
     * ---/agentspec
     */
    const listener = (e: Event) => {
      handler(e as CustomEvent);
      eventBus.removeEventListener(event, listener);
    };
    eventBus.addEventListener(event, listener);
    return () => eventBus.removeEventListener(event, listener);
  }, [eventBus]);

  return { emit, on, once };
}
