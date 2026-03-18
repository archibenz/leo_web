'use client';

import {useState, useEffect, useCallback} from 'react';

export interface RecentItem {
  id: string;
  title: string;
  image?: string;
}

const RECENT_KEY = 'reinasleo_recently_viewed';
const MAX_RECENT = 8;

const PLACEHOLDER_RECENT: RecentItem[] = [
  {id: 'ph-1', title: 'Silk Evening Gown'},
  {id: 'ph-2', title: 'Sculptured Wool Coat'},
  {id: 'ph-3', title: 'Tailored Wide-Leg Trousers'},
  {id: 'ph-4', title: 'Cashmere Draped Cardigan'},
];

function loadRecent(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const stored = loadRecent();
    setItems(stored.length > 0 ? stored : PLACEHOLDER_RECENT);
  }, []);

  const add = useCallback((item: RecentItem) => {
    setItems(prev => {
      const next = [item, ...prev.filter(i => i.id !== item.id)].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  return {items, add};
}
