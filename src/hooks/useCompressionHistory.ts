import { useState, useEffect, useCallback } from 'react';
import { safeStorage } from '../utils/safeStorage';
import { createId } from '../utils/format';

export interface HistorySession {
  id: string;
  timestamp: number;
  images: {
    fileName: string;
    originalSize: number;
    compressedSize?: number;
    compressionRatio?: number;
    /** Actual MIME type the file was saved as — may differ from
     *  `settings.format` when a requested conversion was not smaller and the
     *  original format was kept instead. */
    outputType?: string;
  }[];
  settings: {
    quality: number;
    maxWidth: number;
    format: 'jpeg' | 'png' | 'webp';
  };
}

const STORAGE_KEY = 'shrinkpic_history';
const MAX_HISTORY_ITEMS = 20;

const loadHistory = (): HistorySession[] => {
  const stored = safeStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as HistorySession[]) : [];
  } catch (error) {
    console.error('Failed to parse compression history:', error);
    return [];
  }
};

export const useCompressionHistory = () => {
  // Loading in the initialiser (rather than a mount effect) means the save
  // effect can never run before the load has landed and persist an empty array
  // over the user's real history.
  const [history, setHistory] = useState<HistorySession[]>(loadHistory);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  /**
   * Takes already-resolved per-file numbers. Passing component state here is
   * what made every stored session read "100% saved" — the state had not been
   * written back yet at call time.
   */
  const addSession = useCallback(
    (
      images: HistorySession['images'],
      settings: {
        quality: number;
        maxWidth: number;
        format: 'jpeg' | 'png' | 'webp';
      }
    ) => {
      const session: HistorySession = {
        id: createId(),
        timestamp: Date.now(),
        images,
        settings,
      };

      setHistory((prev) => {
        const newHistory = [session, ...prev];
        // Keep only the most recent MAX_HISTORY_ITEMS
        return newHistory.slice(0, MAX_HISTORY_ITEMS);
      });

      return session.id;
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setHistory((prev) => prev.filter((session) => session.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addSession,
    deleteSession,
    clearHistory,
  };
};
