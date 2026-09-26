import {describe, it, expect} from 'vitest';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../../tailwind.config';
import desktopOnly from '../desktop-only.json';

// Заглушка «только ПК» (lib/nav/desktop-only.json — копия источника в
// leo_analytics). Порог живёт в двух местах: число в JSON и брейкпоинт lg в
// CSS (DesktopOnlyStub: lg:hidden, панель: hidden lg:contents). Разойдутся —
// аналитика покажет заглушку при одной ширине, а админка при другой.
describe('заглушка «только ПК»', () => {
  it('порог в JSON — ровно брейкпоинт lg, по которому переключает CSS', () => {
    const screens = resolveConfig(tailwindConfig).theme.screens as Record<string, string>;
    expect(screens.lg).toBe(`${desktopOnly.min_width}px`);
  });

  it('две двери: на витрину своего домена и в бота владельца', () => {
    expect(desktopOnly.actions.map((a) => a.href)).toEqual(['/ru', 'https://t.me/leo_analytics_bot']);
    expect(desktopOnly.title).toBe('Панель работает на компьютере');
  });
});
