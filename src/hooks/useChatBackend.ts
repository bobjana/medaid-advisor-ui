import { useSyncExternalStore } from 'react';
import type { AgentBackend } from '@/lib/api/backend';

const STORAGE_KEY = 'medaid:chat-backend';
// Same-tab writes do not fire the `storage` event, so subscribers also listen
// for this explicit signal.
const CHANGE_EVENT = 'medaid:chat-backend-change';

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// Stored raw ('adk' | 'python'); anything else falls back to the default.
function getSnapshot(): AgentBackend {
  return window.localStorage.getItem(STORAGE_KEY) === 'python' ? 'python' : 'adk';
}

function getServerSnapshot(): AgentBackend {
  return 'adk';
}

/** useSyncExternalStore keeps the SSR render and the stored value consistent without an effect. */
export function useChatBackend(): [AgentBackend, (next: AgentBackend) => void] {
  const backend = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setBackend = (next: AgentBackend) => {
    if (next === getSnapshot()) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [backend, setBackend];
}
