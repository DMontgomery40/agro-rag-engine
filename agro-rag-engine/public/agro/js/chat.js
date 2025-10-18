// Chat interface for RAG system
// Handles sending questions to /answer endpoint and displaying responses

// Default chat settings
const DEFAULT_CHAT_SETTINGS = {
    model: '',  // Empty = use GEN_MODEL
    temperature: 0.0,
    maxTokens: 1000,
    multiQuery: 3,
    finalK: 20,
    confidence: 0.55,
    showCitations: true,
    showConfidence: false,
    autoScroll: true,
    syntaxHighlight: false,
    systemPrompt: '',
    // History settings
    historyEnabled: true,
    historyLimit: 100,  // Maximum number of messages to store
    showHistoryOnLoad: true  // Auto-load history when page loads
};

let chatMessages = [];
let chatSettings = loadChatSettings();

// Load settings from localStorage
function loadChatSettings() {
    try {
        const saved = localStorage.getItem('agro_chat_settings');
        if (saved) {
            return { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load chat settings:', e);
    }
    return { ...DEFAULT_CHAT_SETTINGS };
}

// Save settings to localStorage
function saveChatSettings() {
    try {
        const settings = {
            model: document.getElementById('chat-model').value,
            temperature: parseFloat(document.getElementById('chat-temperature').value),
            maxTokens: parseInt(document.getElementById('chat-max-tokens').value),
            multiQuery: parseInt(document.getElementById('chat-multi-query').value),
            finalK: parseInt(document.getElementById('chat-final-k').value),
            confidence: parseFloat(document.getElementById('chat-confidence').value),
            showCitations: document.getElementById('chat-show-citations').value === '1',
            showConfidence: document.getElementById('chat-show-confidence').value === '1',
            autoScroll: document.getElementById('chat-auto-scroll').value === '1',
            syntaxHighlight: document.getElementById('chat-syntax-highlight').value === '1',
            systemPrompt: document.getElementById('chat-system-prompt').value,
            // History settings
            historyEnabled: document.getElementById('chat-history-enabled').value === '1',
            historyLimit: Math.min(1000, Math.max(1, parseInt(document.getElementById('chat-history-limit').value) || 100)),
            showHistoryOnLoad: document.getElementById('chat-show-history-on-load').value === '1'
        };

        localStorage.setItem('agro_chat_settings', JSON.stringify(settings));
        chatSettings = settings;

        updateStorageDisplay();
        showToast('Chat settings saved', 'success');
    } catch (e) {
        console.error('Failed to save chat settings:', e);
        showToast('Failed to save settings: ' + e.message, 'error');
    }
}

// Reset settings to defaults
function resetChatSettings() {
    if (!confirm('Reset all chat settings to defaults?')) return;

    chatSettings = { ...DEFAULT_CHAT_SETTINGS };
    localStorage.removeItem('agro_chat_settings');
    applyChatSettings();
    showToast('Chat settings reset to defaults', 'success');
}

// Apply settings to UI inputs
function applyChatSettings() {
    try {
        const elements = {
            'chat-model': chatSettings.model,
            'chat-temperature': chatSettings.temperature,
            'chat-max-tokens': chatSettings.maxTokens,
            'chat-multi-query': chatSettings.multiQuery,
            'chat-final-k': chatSettings.finalK,
            'chat-confidence': chatSettings.confidence,
            'chat-show-citations': chatSettings.showCitations ? '1' : '0',
            'chat-show-confidence': chatSettings.showConfidence ? '1' : '0',
            'chat-auto-scroll': chatSettings.autoScroll ? '1' : '0',
            'chat-syntax-highlight': chatSettings.syntaxHighlight ? '1' : '0',
            'chat-system-prompt': chatSettings.systemPrompt,
            // History settings
            'chat-history-enabled': chatSettings.historyEnabled ? '1' : '0',
            'chat-history-limit': chatSettings.historyLimit,
            'chat-show-history-on-load': chatSettings.showHistoryOnLoad ? '1' : '0'
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                el.value = value;
            }
        }

        // Update storage display
        updateStorageDisplay();
    } catch (e) {
        console.warn('Failed to apply chat settings:', e);
    }
}

// Send a question to the RAG
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const repoSelect = document.getElementById('chat-repo-select');

    const question = input.value.trim();
    if (!question) return;

    const repo = repoSelect.value || null;

    // Add user message to chat
    addMessage('user', question);
    input.value = '';
    input.style.height = 'auto';

    // Disable input while loading
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Thinking...';

    // Add loading message
    const loadingId = addMessage('assistant', '...', true);

    try {
        // Use /api/chat endpoint with full settings support
        const url = new URL('/api/chat', window.location.origin);

        const payload = {
            question: question,
            repo: repo || null,
            model: chatSettings.model || null,
            temperature: chatSettings.temperature,
            max_tokens: chatSettings.maxTokens,
            multi_query: chatSettings.multiQuery,
            final_k: chatSettings.finalK,
            confidence: chatSettings.confidence,
            system_prompt: chatSettings.systemPrompt || null
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to get answer');
        }

        // Remove loading message and add real answer
        removeMessage(loadingId);

        // Add confidence score if enabled
        let answerText = data.answer;
        if (chatSettings.showConfidence && data.confidence) {
            answerText = `[Confidence: ${(data.confidence * 100).toFixed(1)}%]\n\n${answerText}`;
        }

        addMessage('assistant', answerText);

    } catch (error) {
        console.error('Chat error:', error);
        removeMessage(loadingId);
        addMessage('assistant', `Error: ${error.message}`, false, true);
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        input.focus();
    }
}

// Add a message to the chat
function addMessage(role, content, isLoading = false, isError = false, saveToHistory = true) {
    const messagesContainer = document.getElementById('chat-messages');

    // Remove empty state if present
    const emptyState = messagesContainer.querySelector('[style*="text-align: center"]');
    if (emptyState) {
        emptyState.remove();
    }

    const messageId = `msg-${Date.now()}-${Math.random()}`;
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.style.cssText = 'margin-bottom: 16px; animation: fadeIn 0.2s;';

    const roleColor = role === 'user' ? '#5b9dff' : '#00ff88';
    const roleBg = role === 'user' ? '#0f1f2f' : '#0f1f0f';
    const roleLabel = role === 'user' ? 'You' : 'Assistant';

    // Process content for file links and formatting
    let processedContent = content;
    if (role === 'assistant' && !isLoading) {
        processedContent = formatAssistantMessage(content);
    } else {
        processedContent = escapeHtml(content);
    }

    messageDiv.innerHTML = `
        <div style="display: flex; gap: 12px;">
            <div style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 6px; background: ${roleBg}; border: 1px solid ${roleColor}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: ${roleColor};">
                ${roleLabel[0]}
            </div>
            <div style="flex: 1;">
                <div style="font-size: 12px; color: #888; margin-bottom: 4px;">${roleLabel}</div>
                <div style="color: ${isError ? '#ff6b6b' : '#ddd'}; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">
                    ${processedContent}
                </div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom if auto-scroll is enabled
    if (chatSettings.autoScroll) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    chatMessages.push({ id: messageId, role, content, isLoading, isError });

    // Save to history if enabled and not a loading message
    if (saveToHistory && !isLoading && !isError && chatSettings.historyEnabled) {
        saveMessageToHistory(role, content, messageId);
    }

    return messageId;
}

// Remove a message by ID
function removeMessage(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
        messageDiv.remove();
    }
    chatMessages = chatMessages.filter(m => m.id !== messageId);
}

// Format assistant message with file links and code blocks
function formatAssistantMessage(content) {
    let formatted = escapeHtml(content);

    // Extract and link file paths (e.g., server/app.py:123-145 or just server/app.py)
    formatted = formatted.replace(
        /([a-zA-Z0-9_\-\/\.]+\.(py|js|ts|tsx|jsx|rb|go|rs|java|cs|yml|yaml|json|md|txt))(?::(\d+)(?:-(\d+))?)?/g,
        (match, filePath, ext, startLine, endLine) => {
            const lineRange = startLine ? `:${startLine}${endLine ? `-${endLine}` : ''}` : '';
            const displayText = `${filePath}${lineRange}`;
            // Use vscode:// URL scheme if available, otherwise just show as styled text
            return `<a href="vscode://file/${filePath}${startLine ? ':' + startLine : ''}" style="color: #5b9dff; text-decoration: none; border-bottom: 1px solid #5b9dff; font-family: 'SF Mono', monospace; font-size: 13px;" title="Open in editor">${displayText}</a>`;
        }
    );

    // Extract repo header (e.g., [repo: agro])
    formatted = formatted.replace(
        /\[repo:\s*([^\]]+)\]/g,
        '<span style="background: #1a1a1a; color: #888; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: \'SF Mono\', monospace;">repo: $1</span>'
    );

    // Simple code block formatting (backticks)
    formatted = formatted.replace(
        /`([^`]+)`/g,
        '<code style="background: #1a1a1a; color: #00ff88; padding: 2px 6px; border-radius: 3px; font-family: \'SF Mono\', monospace; font-size: 13px;">$1</code>'
    );

    // Multi-line code blocks
    formatted = formatted.replace(
        /```([^\n]*)\n([\s\S]*?)```/g,
        (match, lang, code) => {
            const escapedCode = code.trim();
            return `<pre style="background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px; overflow-x: auto; margin: 8px 0;"><code style="color: #ddd; font-family: 'SF Mono', monospace; font-size: 13px;">${escapedCode}</code></pre>`;
        }
    );

    return formatted;
}

// Clear all messages
function clearChat() {
    if (!confirm('Clear all messages?')) return;

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div style="text-align: center; color: #666; padding: 40px 20px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 12px;">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <div>Start a conversation with your codebase</div>
            <div style="font-size: 11px; margin-top: 8px;">Try: "Where is OAuth token validated?" or "How do we handle API errors?"</div>
        </div>
    `;
    chatMessages = [];
}

// Helper: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== HISTORY MANAGEMENT FUNCTIONS ==========

// Save message to history
function saveMessageToHistory(role, content, messageId) {
    if (!chatSettings.historyEnabled) return;

    try {
        let history = JSON.parse(localStorage.getItem('agro_chat_history') || '[]');

        // Add new message with metadata
        history.push({
            id: messageId,
            role: role,
            content: content,
            timestamp: new Date().toISOString(),
            repo: document.getElementById('chat-repo-select').value || 'auto'
        });

        // Enforce history limit
        if (history.length > chatSettings.historyLimit) {
            history = history.slice(-chatSettings.historyLimit);
        }

        localStorage.setItem('agro_chat_history', JSON.stringify(history));
        updateStorageDisplay();
    } catch (e) {
        console.warn('Failed to save message to history:', e);
    }
}

// Load chat history from localStorage and render it into the transcript
function loadChatHistory() {
    if (!chatSettings.historyEnabled || !chatSettings.showHistoryOnLoad) return;

    try {
        const raw = localStorage.getItem('agro_chat_history') || '[]';
        let history = [];
        try { history = JSON.parse(raw); } catch { history = []; }

        // Validate structure: ensure array of {role:string, content:string}
        history = Array.isArray(history) ? history.filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant')) : [];

        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        if (history.length > 0) {
            // Clear the empty state message
            messagesContainer.innerHTML = '';

            // Add separator for historical messages
            const separator = document.createElement('div');
            separator.style.cssText = 'text-align: center; color: #666; margin: 20px 0; font-size: 11px;';
            separator.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="flex: 1; height: 1px; background: #2a2a2a;"></div>
                    <span>Previous conversation (${history.length} messages)</span>
                    <div style="flex: 1; height: 1px; background: #2a2a2a;"></div>
                </div>
            `;
            messagesContainer.appendChild(separator);

            // Load messages
            history.forEach(msg => {
                addMessage(msg.role, msg.content, false, false, false); // Don't save again
            });

            // Add separator for new session
            const newSessionSeparator = document.createElement('div');
            newSessionSeparator.style.cssText = 'text-align: center; color: #666; margin: 20px 0; font-size: 11px;';
            newSessionSeparator.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="flex: 1; height: 1px; background: #2a2a2a;"></div>
                    <span>New session started</span>
                    <div style="flex: 1; height: 1px; background: #2a2a2a;"></div>
                </div>
            `;
            messagesContainer.appendChild(newSessionSeparator);
        }

        // Also render a compact history list inside the dropdown for discoverability
        renderHistoryDropdown(history);
    } catch (e) {
        console.warn('Failed to load chat history:', e);
    }
}

// Render compact history list inside the History dropdown (last 20)
function renderHistoryDropdown(history) {
    try {
        const dropdown = document.getElementById('history-dropdown');
        if (!dropdown) return;
        // Preserve the action buttons; rebuild the list above them
        const exportBtn = document.getElementById('chat-export-history');
        const clearBtn = document.getElementById('chat-clear-history');
        dropdown.innerHTML = '';

        const listWrap = document.createElement('div');
        listWrap.style.cssText = 'max-height: 240px; overflow-y: auto; padding: 6px 0;';

        const items = (history || []).slice(-20).reverse();
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#666; font-size:12px; padding:8px 12px;';
            empty.textContent = 'No saved messages yet';
            listWrap.appendChild(empty);
        } else {
            items.forEach((m, idx) => {
                const btn = document.createElement('button');
                btn.style.cssText = 'display:block;width:100%;text-align:left;background:none;border:none;color:#ddd;padding:6px 12px;font-size:12px;cursor:pointer;';
                const label = `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.content.replace(/\s+/g,' ').slice(0, 60)}${m.content.length>60?'…':''}`;
                btn.textContent = label;
                btn.title = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
                btn.addEventListener('click', () => {
                    // Append to transcript for quick reference (do not re-save)
                    addMessage(m.role, m.content, false, false, false);
                    dropdown.style.display = 'none';
                });
                btn.addEventListener('mouseover', () => btn.style.background = '#131313');
                btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
                listWrap.appendChild(btn);
            });
        }

        dropdown.appendChild(listWrap);
        // Divider
        const div = document.createElement('div'); div.style.cssText = 'height:1px;background:#333;'; dropdown.appendChild(div);
        // Action buttons
        const exp = document.createElement('button');
        exp.id = 'chat-export-history';
        exp.style.cssText = 'display:block;width:100%;text-align:left;background:none;border:none;color:#ddd;padding:8px 12px;font-size:12px;cursor:pointer;';
        exp.textContent = '📥 Export History';
        exp.addEventListener('click', exportChatHistory);
        const clr = document.createElement('button');
        clr.id = 'chat-clear-history';
        clr.style.cssText = 'display:block;width:100%;text-align:left;background:none;border:none;color:#ff6b6b;padding:8px 12px;font-size:12px;cursor:pointer;';
        clr.textContent = '🗑️ Clear History';
        clr.addEventListener('click', clearChatHistory);
        dropdown.appendChild(exp);
        dropdown.appendChild(document.createElement('div')).style.cssText = 'height:1px;background:#333;';
        dropdown.appendChild(clr);
    } catch (e) {
        console.warn('Failed to render history dropdown:', e);
    }
}

// Clear chat history
function clearChatHistory() {
    if (!confirm('Clear all saved chat history? This cannot be undone.')) return;

    try {
        localStorage.removeItem('agro_chat_history');
        updateStorageDisplay();
        showToast('Chat history cleared', 'success');
    } catch (e) {
        console.error('Failed to clear chat history:', e);
        showToast('Failed to clear history: ' + e.message, 'error');
    }
}

// Export chat history as JSON
function exportChatHistory() {
    try {
        const history = localStorage.getItem('agro_chat_history') || '[]';
        const blob = new Blob([history], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Chat history exported', 'success');
    } catch (e) {
        console.error('Failed to export chat history:', e);
        showToast('Failed to export history: ' + e.message, 'error');
    }
}

// Calculate and display storage usage
function updateStorageDisplay() {
    try {
        const historyStr = localStorage.getItem('agro_chat_history') || '[]';
        const sizeInBytes = new Blob([historyStr]).size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        const history = JSON.parse(historyStr);

        const displayElement = document.getElementById('chat-storage-display');
        if (displayElement) {
            displayElement.textContent = `${history.length} messages using ${sizeInKB}KB`;
        }
    } catch (e) {
        console.warn('Failed to update storage display:', e);
    }
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = newHeight + 'px';
}

// Initialize chat when DOM is ready
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');
        const clearBtn = document.getElementById('chat-clear');
        const historyBtn = document.getElementById('chat-history');
        const exportHistoryBtn = document.getElementById('chat-export-history');
        const clearHistoryBtn = document.getElementById('chat-clear-history');
        const saveSettingsBtn = document.getElementById('chat-save-settings');
        const resetSettingsBtn = document.getElementById('chat-reset-settings');

        if (input) {
            // Send on Ctrl+Enter
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            // Auto-resize as user types
            input.addEventListener('input', () => {
                autoResizeTextarea(input);
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', clearChat);
        }

        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                const dropdown = document.getElementById('history-dropdown');
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        }

        if (exportHistoryBtn) {
            exportHistoryBtn.addEventListener('click', exportChatHistory);
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearChatHistory);
        }

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveChatSettings);
        }

        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', resetChatSettings);
        }

        // Apply loaded settings on page load
        applyChatSettings();

        // Load chat history if enabled
        loadChatHistory();

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#chat-history') && !e.target.closest('#history-dropdown')) {
                const dropdown = document.getElementById('history-dropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });
    });
}

// Add fadeIn animation
if (typeof document !== 'undefined' && !document.querySelector('#chat-animations')) {
    const style = document.createElement('style');
    style.id = 'chat-animations';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}
