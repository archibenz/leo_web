type YandexMetrika = (id: number, action: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    ym?: YandexMetrika;
  }
}

const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID) || 0;

export function track(goal: string, params?: Record<string, unknown>): void {
  if (!YM_ID || typeof window === 'undefined' || typeof window.ym !== 'function') return;
  try {
    window.ym(YM_ID, 'reachGoal', goal, params);
  } catch {
    /* analytics must never break the UI */
  }
}
