export function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function readJsonFromStorage<T>(key: string, fallback: T): T {
  if (!canUseBrowserStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readFirstJsonFromStorage<T>(keys: string[], fallback: T): T {
  if (!canUseBrowserStorage()) {
    return fallback;
  }

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      return JSON.parse(raw) as T;
    } catch {
      continue;
    }
  }

  return fallback;
}

export function writeJsonToStorage(key: string, value: unknown) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeFromStorage(key: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
}
