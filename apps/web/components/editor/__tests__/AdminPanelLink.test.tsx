import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {act, render, screen, cleanup, waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../messages/ru.json';

// Владелец не нашёл вход в админку: ссылки на /admin не было нигде на
// витрине, попасть можно было только вписав адрес руками (isAdmin у него
// уже работал — он в тот же день правил бегущую строку через выключатель в
// аккаунте). Тот же приём мокинга, что EditModeSwitch.test.tsx — та же
// сессия (useEditorSession), тот же владелец.

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  // setToken обязан ДЕЙСТВИТЕЛЬНО класть токен: вход зовёт его, а следом
  // resolveUser() спрашивает getToken(). С пустышкой «вход» не доезжал бы до
  // сети, и кейс про появление ссылки без перезагрузки был бы зелёным только
  // потому, что ничего не происходило.
  setToken: (t: string) => {
    token.value = t;
  },
  clearToken: () => {
    token.value = null;
  },
  API_BASE: '',
}));

// Роль теперь приходит из useWhiteAuth — а он держит пользователя и признак
// «уже спрашивали» в переменных на уровне модуля, одним хранилищем на все
// компоненты страницы. Тот же module-scope переживает и переход между
// тестами: гостевой кейс выставляет «спросили, никого нет», и без сброса
// каждый ПОСЛЕДУЮЩИЙ тест видел бы гостя, чей бы токен ни подставили.
// vi.resetModules() плюс динамический импорт делают порядок неважным.
let AdminPanelLink: typeof import('../AdminPanelLink').default;
// Вход и выход берём из ТОГО ЖЕ экземпляра модуля, что видит компонент:
// после vi.resetModules() импорт по имени дал бы другой, со своим хранилищем,
// и «вход» не доехал бы до дерева — тест бы врал в обе стороны.
let whiteLogin: typeof import('../../../hooks/useWhiteAuth').whiteLogin;
let whiteLogout: typeof import('../../../hooks/useWhiteAuth').whiteLogout;

function renderLink(locale = 'ru') {
  return render(
    <NextIntlClientProvider locale={locale} messages={ruMessages as never}>
      <AdminPanelLink locale={locale} />
    </NextIntlClientProvider>,
  );
}

beforeEach(async () => {
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  vi.resetModules();
  ({default: AdminPanelLink} = await import('../AdminPanelLink'));
  ({whiteLogin, whiteLogout} = await import('../../../hooks/useWhiteAuth'));
});

afterEach(cleanup);

describe('видимость — ссылка только владельцу, не в разметке вовсе (не display:none)', () => {
  it('посторонний (гость) — ссылки нет', async () => {
    renderLink();

    // ANONYMOUS резолвится синхронно (useEditorSession: нет токена — нет
    // запроса), но эффект всё равно асинхронный — ждём устойчивого состояния.
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });

  it('залогиненный покупатель (не admin) — тоже ничего', async () => {
    token.value = 'shopper-token';
    me.mockResolvedValue({role: 'user'});

    renderLink();

    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('владелец — ссылка есть, ведёт на /<locale>/admin, подписана из messages/ru.json', async () => {
    token.value = 'admin-token';

    renderLink('ru');

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/ru/admin');
    expect(link).toHaveAccessibleName(ruMessages.white.editModeSwitch.adminLink);
  });

  it('локаль в адресе — та, что передана пропом, не захардкожена', async () => {
    token.value = 'admin-token';

    renderLink('en');

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/en/admin');
  });
});

describe('телефон владельца — зона нажатия и кегль', () => {
  it('min-h-12 (48px) и кегль не мельче 13', async () => {
    token.value = 'admin-token';

    renderLink();

    const link = await screen.findByRole('link');
    // 48px, а не прежние 44: ровно как строки меню аккаунта выше, чтобы блок
    // читался одним столбцом. Наш порог — 44, так что вверх двигать можно.
    expect(link.className).toMatch(/min-h-12/);
    expect(link.className).toMatch(/text-\[13px\]/);
  });

  // Дословная жалоба владельца: «сделай нормальное расположение кнопок и
  // размерности». На снимке вход в админку стоял голым подчёркнутым текстом —
  // по виду подпись, а не то, на что нажимают, хотя это главный вход в
  // инструмент. Проверяем причину: у ссылки есть рамка и она занимает всю
  // ширину, то есть палец попадает в любом месте строки, а не в три слова.
  it('выглядит как то, на что нажимают: рамка и вся ширина', async () => {
    token.value = 'admin-token';

    renderLink();

    const link = await screen.findByRole('link');
    expect(link.style.border).toMatch(/1px solid/);
    expect(link.className).toMatch(/w-full/);
    // wv-link рисует подчёркивание — признак текстовой ссылки, а не кнопки.
    expect(link.className).not.toMatch(/\bwv-link\b/);
  });
});

// Жалоба владельца дословно: «чтобы если ты админ и заходишь в свой аккаунт,
// не надо было обновлять страницу чтобы появилась админ-панелька».
//
// Так и было: роль решалась один раз при монтировании, а вход случается ПОСЛЕ
// него, на той же странице. Никакого повторного монтирования не происходит,
// поэтому ссылка и не появлялась до перезагрузки.
//
// Ключевое здесь — что ниже НЕТ ни повторного render(), ни cleanup(). Дерево
// то же самое, что было до входа: если тест зелёный только потому, что мы
// перерисовали его руками, он не проверяет ничего.
describe('вход на той же странице — без перезагрузки', () => {
  it('гость входит владельцем: ссылка появляется в уже смонтированном дереве', async () => {
    renderLink();
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());

    me.mockReset()
      .mockResolvedValueOnce({token: 'admin-token'}) // /api/auth/login
      .mockResolvedValue({id: 1, email: 'a@b.c', name: 'А', role: 'admin'}); // /api/auth/me

    await act(async () => {
      await whiteLogin('a@b.c', 'secret123');
    });

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/ru/admin');
  });

  it('владелец вышел, в той же вкладке вошёл покупатель — ссылка пропадает', async () => {
    token.value = 'admin-token';
    me.mockResolvedValue({id: 1, email: 'a@b.c', name: 'А', role: 'admin'});

    renderLink();
    await screen.findByRole('link');

    await act(async () => {
      whiteLogout();
    });
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());

    me.mockReset()
      .mockResolvedValueOnce({token: 'shopper-token'})
      .mockResolvedValue({id: 2, email: 'b@b.c', name: 'Б', role: 'user'});

    const ok = await act(async () => whiteLogin('b@b.c', 'secret123'));

    // Двух проверок мало одной: «ссылки нет» одинаково верно и когда покупатель
    // вошёл без прав, и когда не вошёл никто. Второе не доказывает ничего —
    // у пустой страницы ссылки тоже нет. Поэтому сначала убеждаемся, что вход
    // ДЕЙСТВИТЕЛЬНО состоялся и роль перерешалась (ушёл запрос к /me), и только
    // потом — что органов управления покупателю не досталось.
    expect(ok).toEqual({ok: true});
    expect(me).toHaveBeenCalledWith('/api/auth/me');

    // Прежде роль лежала в sessionStorage под ключом на всю вкладку, и чистить
    // её было некому: во всём apps/web не было ни одного removeItem. Покупатель
    // унаследовал бы от владельца органы управления сайтом.
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });
});
