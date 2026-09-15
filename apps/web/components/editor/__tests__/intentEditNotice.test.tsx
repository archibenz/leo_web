import {describe, it, expect, afterEach, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Полоса для десяти экранов, где править нечего.
//
// ТРИ СЛУЧАЯ, И ОНИ ОБЯЗАНЫ РАЗЛИЧАТЬСЯ. Проверка на хорошем входе («обе куки
// на месте — полоса есть») зелёная и при сломанном условии: достаточно вернуть
// true всегда. Поэтому ниже сначала два плохих входа, и только потом хороший.

const jar = {edit: null as string | null, session: false};

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'rl_edit' && jar.edit !== null ? {value: jar.edit} : undefined),
    has: (name: string) => (name === 'rl_session' ? jar.session : false),
  }),
}));

afterEach(cleanup);

async function показать(): Promise<void> {
  const {default: IntentEditNotice} = await import('../IntentEditNotice');
  render(await IntentEditNotice());
}

describe('полоса «режим включён, править нечего»', () => {
  it('намерение есть, сессии нет — полосы нет: постороннему она ничего не говорит', async () => {
    jar.edit = '1';
    jar.session = false;

    await показать();

    expect(screen.queryByText(/правка включена/i)).toBeNull();
  });

  it('сессия есть, намерения нет — полосы нет: обычный посетитель сайта', async () => {
    jar.edit = null;
    jar.session = true;

    await показать();

    expect(screen.queryByText(/правка включена/i)).toBeNull();
  });

  it('и намерение, и сессия — полоса говорит о НАМЕРЕНИИ, а не о праве', async () => {
    jar.edit = '1';
    jar.session = true;

    await показать();

    expect(screen.getByText(/Правка включена · на этой странице нечего править/)).toBeInTheDocument();
    // И НИ РАЗУ не словами подробной полосы: обе строки лежат в разметке
    // одновременно, и одинаковый текст сделал бы любой поиск по нему
    // неоднозначным — в CI это и покраснело.
    expect(screen.queryByText(/Режим правки/)).toBeNull();
    // Ни слова про признанную сессию, про роль и про черновик: на этих
    // страницах черновика не бывает вовсе, и утверждать про право нечего.
    expect(screen.queryByText(/сессия|редактор|черновик/i)).toBeNull();
  });

  it('в полосе нет ни одного действия — она только извещает', async () => {
    jar.edit = '1';
    jar.session = true;

    await показать();

    // Кнопка, которая ничего не делает, хуже отсутствующей.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('«похожее» значение куки режим не открывает', async () => {
    jar.edit = 'true';
    jar.session = true;

    await показать();

    expect(screen.queryByText(/правка включена/i)).toBeNull();
  });
});

// Гашение второй полосы держится на ПАРЕ «метка в разметке» + «правило в CSS».
// Разъедутся — на главной окажутся две полосы, противоречащие друг другу:
// общая скажет «нечего править», подробная — «правится три области». Пара
// живёт в разных файлах, поэтому её и проверяем отдельно: переименуют одну
// сторону — покраснеет здесь, а не на экране у владельца.
describe('подробная полоса гасит общую', () => {
  const корень = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

  it('метки стоят на обеих полосах, и правило в CSS называет ровно их', () => {
    const подробная = readFileSync(join(корень, 'components/editor/EditorNotice.tsx'), 'utf8');
    const общая = readFileSync(join(корень, 'components/editor/IntentEditNotice.tsx'), 'utf8');
    const css = readFileSync(join(корень, 'app/globals.css'), 'utf8');

    expect(подробная).toMatch(/data-edit-bar="full"/);
    expect(общая).toMatch(/data-edit-bar="intent"/);
    expect(css).toMatch(/body:has\(\[data-edit-bar='full'\]\) \[data-edit-bar='intent'\]/);
  });
});
