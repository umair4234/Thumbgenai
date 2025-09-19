// This service manages API keys in the browser's localStorage.

const KEYS_STORAGE_KEY = 'gemini-api-keys';
const INDEX_STORAGE_KEY = 'gemini-api-key-index';

// In-memory store for key status. This resets on page refresh, which is acceptable
// to avoid permanently blocking a key that might have its quota reset.
const keyStatus = new Map<string, { exhaustedUntil: number }>();
const EXHAUSTION_PERIOD_MS = 60 * 1000; // 1 minute cooldown for a rate-limited key

/**
 * Retrieves all stored API keys.
 * @returns {string[]} An array of API keys.
 */
export const getKeys = (): string[] => {
  try {
    const keys = localStorage.getItem(KEYS_STORAGE_KEY);
    return keys ? JSON.parse(keys) : [];
  } catch (error) {
    console.error("Failed to parse API keys from localStorage:", error);
    return [];
  }
};

/**
 * Saves an array of API keys to localStorage.
 * @param {string[]} keys The array of keys to save.
 */
const saveKeys = (keys: string[]): void => {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
};

/**
 * Adds a new API key to the list if it's not already present.
 * @param {string} key The API key to add.
 */
export const addKey = (key: string): void => {
  if (!key.trim()) return;
  const currentKeys = getKeys();
  if (!currentKeys.includes(key)) {
    saveKeys([...currentKeys, key]);
    keyStatus.delete(key); // Ensure new key has no exhausted status
  }
};

/**
 * Deletes a specific API key from the list.
 * @param {string} keyToDelete The API key to delete.
 */
export const deleteKey = (keyToDelete: string): void => {
  const currentKeys = getKeys();
  const newKeys = currentKeys.filter(key => key !== keyToDelete);
  saveKeys(newKeys);
  keyStatus.delete(keyToDelete); // Clean up status for the deleted key

  // Reset index if it's now out of bounds
  const currentIndex = parseInt(localStorage.getItem(INDEX_STORAGE_KEY) || '0', 10);
  if (currentIndex >= newKeys.length) {
      localStorage.setItem(INDEX_STORAGE_KEY, '0');
  }
};

/**
 * Marks a key as rate-limited, putting it on a cooldown.
 * @param {string} key The API key that hit a rate limit.
 */
export const markKeyAsExhausted = (key: string): void => {
    console.warn(`API key ending in ...${key.slice(-4)} was rate-limited. Putting it on a 60s cooldown.`);
    keyStatus.set(key, { exhaustedUntil: Date.now() + EXHAUSTION_PERIOD_MS });
};

/**
 * Gets the next available (not on cooldown) API key in a round-robin fashion.
 * @returns {string} The next API key to use.
 * @throws {Error} If no API keys are set, or if all are on cooldown.
 */
export const getNextKey = (): string => {
  const keys = getKeys();
  if (keys.length === 0) {
    throw new Error("No API keys set. Please add a key in the API Key Manager.");
  }

  const startIndex = parseInt(localStorage.getItem(INDEX_STORAGE_KEY) || '0', 10);
  
  // Iterate through keys up to one full circle to find a valid one
  for (let i = 0; i < keys.length; i++) {
    const currentIndex = (startIndex + i) % keys.length;
    const key = keys[currentIndex];
    const status = keyStatus.get(key);

    if (!status || status.exhaustedUntil < Date.now()) {
        // This key is valid to use
        if (status) keyStatus.delete(key); // Clear status if cooldown has passed
        const nextIndex = (currentIndex + 1) % keys.length;
        localStorage.setItem(INDEX_STORAGE_KEY, nextIndex.toString());
        return key;
    }
  }

  // If loop completes, all keys are on cooldown
  throw new Error("All available API keys have exceeded their quota. Please add more keys or wait a minute for them to cool down before trying again.");
};
