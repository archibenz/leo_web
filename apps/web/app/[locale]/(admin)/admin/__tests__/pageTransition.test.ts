import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, it, expect} from 'vitest';

// Переход между страницами. Владелец: «еще жду что бы ты сделал анимации
// открытия переходов итд, что бы все красиво было».
//
// Проверяется не красота, а два свойства, которые легко потерять молча.

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('переход между страницами', () => {
  it('шаблоны стоят В ОБЕИХ ветках, а не уровнем выше', () => {
    // Выше — значит внутрь шаблона попадут обёртки веток. Шаблон
    // пересоздаётся на каждой навигации ВМЕСТЕ СО ВСЕМ ПОДДЕРЕВОМ, и тогда
    // AuthProvider админки спрашивал бы `/api/auth/me` на каждый переход
    // против лимита в десять в минуту.
    expect(existsSync(resolve(process.cwd(), 'app/[locale]/(shop)/template.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'app/[locale]/(admin)/template.tsx'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'app/[locale]/template.tsx'))).toBe(false);
  });

  it('анимация выключается при запросе «поменьше движения»', () => {
    // Условие, поставленное отдельно: всё новое обязано слушать эту настройку,
    // как её слушают остальные места в этом файле. Сегодня уже был график,
    // который её не слышал, потому что рисовался скриптом, а не стилями.
    const блоки = css.split('@media (prefers-reduced-motion: reduce)');
    const естьОтключение = блоки
      .slice(1)
      .some((блок) => /\.page-enter\s*\{[^}]*animation:\s*none/.test(блок));

    expect(
      естьОтключение,
      'Класс .page-enter должен выключаться внутри @media (prefers-reduced-motion: reduce)',
    ).toBe(true);
  });

  it('проверка выше умеет краснеть', () => {
    // Без этого кейса предыдущий был бы зелёным и на пустом файле: любой
    // разбор, ничего не нашедший, вернул бы false — но и правило, написанное
    // иначе, тоже вернуло бы false, и отличить было бы нельзя.
    const пусто = ''.split('@media (prefers-reduced-motion: reduce)');
    expect(пусто.slice(1).some((б) => /\.page-enter/.test(б))).toBe(false);
    // А на настоящем файле само правило существует.
    expect(css).toContain('.page-enter');
  });
});
