// AGRO GUI - VS Code Integration Module (Compatibility Layer)
// Provides backward-compatible API wrapping the unified Editor module
// This module is now primarily a shim for the newer editor.js implementation
;(function() {
    'use strict';

    /**
     * Show the VS Code editor - delegates to Editor module
     */
    function showEditor() {
        console.log('[VSCode] Delegating showEditor to Editor module');
        const container = document.getElementById('editor-iframe-container');
        if (container) {
            container.style.display = 'block';
        }
        if (window.Editor && typeof window.Editor.initEditorHealthCheck === 'function') {
            window.Editor.initEditorHealthCheck();
        }
    }

    /**
     * Hide the VS Code editor
     */
    function hideEditor() {
        console.log('[VSCode] Delegating hideEditor to Editor module');
        const container = document.getElementById('editor-iframe-container');
        if (container) {
            container.style.display = 'none';
        }
        if (window.Editor && typeof window.Editor.stopEditorHealthCheck === 'function') {
            window.Editor.stopEditorHealthCheck();
        }
    }

    /**
     * Open editor in new window - delegates to Editor module
     */
    function openInNewWindow() {
        console.log('[VSCode] Delegating openInNewWindow to Editor module');
        if (window.Editor && typeof window.Editor.openEditorWindow === 'function') {
            window.Editor.openEditorWindow();
        }
    }

    /**
     * Copy editor URL to clipboard
     */
    function copyUrl() {
        console.log('[VSCode] Delegating copyUrl to Editor module');
        if (window.Editor && typeof window.Editor.copyEditorUrl === 'function') {
            window.Editor.copyEditorUrl();
        }
    }

    /**
     * Restart VS Code server
     */
    function restart() {
        console.log('[VSCode] Delegating restart to Editor module');
        if (window.Editor && typeof window.Editor.restartEditor === 'function') {
            window.Editor.restartEditor();
        }
    }

    /**
     * Initialize the module - mostly delegated to other modules
     */
    function init() {
        console.log('[VSCode] Initializing VS Code compatibility layer');
        // All real work is done by editor.js and editor-settings.js
    }

    // Public API - backward compatible interface
    window.VSCode = {
        showEditor,
        hideEditor,
        openInNewWindow,
        copyUrl,
        restart,
        init
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[VSCode] Compatibility layer loaded');
})();


