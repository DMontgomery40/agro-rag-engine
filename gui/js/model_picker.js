// Universal Model Picker System
// Automatically populates ALL <select> elements with class="model-select"
// with available models from /api/prices, filtered by available providers.

;(function() {
  'use strict';

  let cachedModels = null;
  let cachedPrices = null;
  let availableProviders = new Set();

  // API helper
  function api(path) {
    try {
      const u = new URL(window.location.href);
      const q = new URLSearchParams(u.search);
      const override = q.get('api');
      if (override) return override.replace(/\/$/, '') + path;
      if (u.protocol.startsWith('http')) return u.origin + path;
      return 'http://127.0.0.1:8012' + path;
    } catch {
      return 'http://127.0.0.1:8012' + path;
    }
  }

  /**
   * Detect which providers are configured based on API keys and URLs
   */
  async function detectProviders() {
    try {
      const response = await fetch(api('/api/config'));
      if (!response.ok) throw new Error('Failed to fetch config');

      const data = await response.json();
      const env = data.env || {};

      availableProviders.clear();

      // Check for API keys (using the same logic as server-side)
      if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 10) {
        availableProviders.add('openai');
      }
      if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 10) {
        availableProviders.add('anthropic');
      }
      if (env.GOOGLE_API_KEY && env.GOOGLE_API_KEY.length > 10) {
        availableProviders.add('google');
      }
      if (env.COHERE_API_KEY && env.COHERE_API_KEY.length > 10) {
        availableProviders.add('cohere');
      }
      if (env.VOYAGE_API_KEY && env.VOYAGE_API_KEY.length > 10) {
        availableProviders.add('voyage');
      }
      if (env.GROQ_API_KEY && env.GROQ_API_KEY.length > 10) {
        availableProviders.add('groq');
      }
      if (env.TOGETHER_API_KEY && env.TOGETHER_API_KEY.length > 10) {
        availableProviders.add('together');
      }
      if (env.MISTRAL_API_KEY && env.MISTRAL_API_KEY.length > 10) {
        availableProviders.add('mistral');
      }
      if (env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY.length > 10) {
        availableProviders.add('deepseek');
      }
      if (env.HUGGINGFACE_API_KEY && env.HUGGINGFACE_API_KEY.length > 10) {
        availableProviders.add('huggingface');
        availableProviders.add('hf');
      }

      // Check for Ollama URL (local models)
      if (env.OLLAMA_URL) {
        availableProviders.add('ollama');
        availableProviders.add('local');
      }

      console.log('[ModelPicker] Available providers:', Array.from(availableProviders));
      return availableProviders;
    } catch (e) {
      console.error('[ModelPicker] Failed to detect providers:', e);
      // Safe defaults - always show OpenAI and Anthropic
      availableProviders.add('openai');
      availableProviders.add('anthropic');
      return availableProviders;
    }
  }

  /**
   * Fetch and cache models from /api/prices
   */
  async function fetchModels() {
    if (cachedModels && cachedPrices) return { models: cachedModels, prices: cachedPrices };

    try {
      const response = await fetch(api('/api/prices'));
      if (!response.ok) throw new Error(`Failed to fetch prices: ${response.status}`);

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        console.warn('[ModelPicker] No models in prices data');
        cachedModels = [];
        cachedPrices = data;
        return { models: [], prices: data };
      }

      cachedModels = data.models;
      cachedPrices = data;
      console.log(`[ModelPicker] Cached ${cachedModels.length} models from /api/prices`);
      return { models: cachedModels, prices: cachedPrices };
    } catch (e) {
      console.error('[ModelPicker] Failed to fetch models:', e);
      cachedModels = [];
      cachedPrices = {};
      return { models: [], prices: {} };
    }
  }

  /**
   * Filter models by available providers
   * @param {Array} models - Array of model objects from prices.json
   * @param {Object} options - Filtering options
   * @returns {Array} Filtered model objects
   */
  function filterModelsByProvider(models, options = {}) {
    if (!models || !Array.isArray(models)) return [];

    return models.filter(m => {
      const provider = (m.provider || '').toLowerCase();
      const family = (m.family || '').toLowerCase();

      // If showAll is true, include everything
      if (options.showAll) return true;

      // Check if provider or family is in available providers
      return availableProviders.has(provider) || availableProviders.has(family);
    });
  }

  /**
   * Populate a single select element with models
   * @param {HTMLSelectElement} selectElement - The select to populate
   * @param {Object} options - Options for filtering and selection
   */
  function populateSelect(selectElement, options = {}) {
    if (!selectElement) {
      console.warn('[ModelPicker] populateSelect called with null element');
      return;
    }

    const currentValue = selectElement.value;
    const preferredValue = options.preferredValue || selectElement.getAttribute('data-preferred-value');
    const componentFilter = selectElement.getAttribute('data-component-filter'); // e.g., "GEN", "EMB", "RERANK"

    // Save first option if it's a placeholder
    const firstOption = selectElement.querySelector('option:first-child');
    const hasPlaceholder = firstOption && (firstOption.value === '' || firstOption.textContent.includes('Select'));

    // Clear existing options
    selectElement.innerHTML = '';

    // Restore placeholder if it existed
    if (hasPlaceholder && firstOption) {
      selectElement.appendChild(firstOption.cloneNode(true));
    } else {
      // Add default placeholder
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a model...';
      selectElement.appendChild(placeholder);
    }

    // Get filtered models
    const allModels = cachedModels || [];
    let filtered = options.showAll ? allModels : filterModelsByProvider(allModels, options);

    // Further filter by component type if specified
    if (componentFilter) {
      filtered = filtered.filter(m => {
        const components = m.components || [];
        return components.includes(componentFilter);
      });
    }

    // Extract unique model names and sort
    const modelNames = [...new Set(filtered.map(m => m.model))].filter(Boolean).sort();

    // Add options
    modelNames.forEach(modelName => {
      const option = document.createElement('option');
      option.value = modelName;
      option.textContent = modelName;

      // Find the model object to get additional info
      const modelObj = filtered.find(m => m.model === modelName);
      if (modelObj && modelObj.provider) {
        option.setAttribute('data-provider', modelObj.provider);
      }

      selectElement.appendChild(option);
    });

    // Restore selection
    const valueToSet = preferredValue || currentValue;
    if (valueToSet && modelNames.includes(valueToSet)) {
      selectElement.value = valueToSet;
    }

    const selectId = selectElement.id || selectElement.name || 'unknown';
    console.log(`[ModelPicker] Populated ${selectId} with ${modelNames.length} models (filtered from ${allModels.length} total)`);
  }

  /**
   * Populate all model select elements on the page
   * @param {Object} options - Options for filtering and selection
   */
  async function populateAll(options = {}) {
    console.log('[ModelPicker] populateAll() called');

    // Fetch data in parallel
    await Promise.all([
      detectProviders(),
      fetchModels()
    ]);

    // Find all select elements with class="model-select"
    const selects = document.querySelectorAll('select.model-select');
    console.log(`[ModelPicker] Found ${selects.length} model select elements`);

    if (selects.length === 0) {
      console.warn('[ModelPicker] No <select class="model-select"> elements found on page');
      console.warn('[ModelPicker] Add class="model-select" to your model selection dropdowns');
    }

    // Populate each one
    selects.forEach(select => populateSelect(select, options));

    console.log(`[ModelPicker] Populated ${selects.length} model selects`);
  }

  /**
   * Refresh models after config changes (e.g., API key added)
   */
  function invalidateCache() {
    cachedModels = null;
    cachedPrices = null;
    availableProviders.clear();
    console.log('[ModelPicker] Cache invalidated - call populateAll() to refresh');
  }

  /**
   * Get models for a specific component type
   * @param {string} componentType - "GEN", "EMB", or "RERANK"
   * @returns {Array} Array of model names
   */
  function getModelsForComponent(componentType) {
    if (!cachedModels) {
      console.warn('[ModelPicker] Models not loaded yet - call fetchModels() first');
      return [];
    }

    const filtered = cachedModels.filter(m => {
      const components = m.components || [];
      return components.includes(componentType);
    });

    return [...new Set(filtered.map(m => m.model))].filter(Boolean).sort();
  }

  // Public API
  const ModelPicker = {
    populateAll,
    populateSelect,
    fetchModels,
    detectProviders,
    invalidateCache,
    getModelsForComponent,

    // For testing and debugging
    _cachedModels: () => cachedModels,
    _availableProviders: () => Array.from(availableProviders),
    _cachedPrices: () => cachedPrices,
  };

  // Export to window
  window.ModelPicker = ModelPicker;

  // Auto-populate on load (with delay to ensure DOM is ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => ModelPicker.populateAll(), 100);
    });
  } else {
    setTimeout(() => ModelPicker.populateAll(), 100);
  }

  console.log('[ModelPicker] Module loaded and ready');
})();
