import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor, act} from '@testing-library/react';
import {resizeViewport, setViewport} from './viewport';

// Просьба владельца (lw-hr52): в режиме правки видеть, ЧТО можно править.
//
// Подсвечивается только правимое. Серого слоя «сюда нельзя» нет намеренно: на
// витрине правится шесть областей из двенадцати экранов, и заливка остального
// читалась бы как запрет, хотя правда — «мы пока не сделали».
//
// ДВЕ ПРОВЕРКИ, И ОНИ СМОТРЯТ В РАЗНЫЕ СТОРОНЫ:
//   вне режима подсветки нет вовсе — покупатель получает ту же страницу;
//   в режиме подсвечено РОВНО то, что правится, ни одной областью больше.
// Вторая важнее первой: лишняя подсветка приведёт владельца нажать на то, что
// не откроется, а это обман хуже отсутствия подсветки.

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({refresh: vi.fn()}),
}));

vi.mock('../../../lib/api', () => ({
  getToken: () => null,
  apiFetch: () => Promise.resolve({role: 'admin'}),
  setToken: () => {},
  clearToken: () => {},
  API_BASE: '',
}));

let EditableBlock: typeof import('../EditableBlock').default;
let EditorProvider: typeof import('../EditorProvider').EditorProvider;

beforeEach(async () => {
  // Правка работает только на компьютере (useIsDesktop.ts) — эти кейсы про неё.
  setViewport(1280);
  vi.resetModules();
  ({default: EditableBlock} = await import('../EditableBlock'));
  ({EditorProvider} = await import('../EditorProvider'));
});

afterEach(cleanup);

function цель(id: string, label: string) {
  return {
    kind: 'section' as const,
    id,
    label,
    section: {
      id,
      slug: id,
      layout: 'hero' as const,
      status: 'active' as const,
      nameRu: label,
      nameEn: label,
      sortOrder: 0,
    },
  };
}

function Страница({editing, точек}: {editing: boolean; точек: number}) {
  return (
    <EditorProvider editing={editing}>
      <p>подвал, меню и прочее, что правкой не открывается</p>
      {Array.from({length: точек}, (_, i) => (
        <EditableBlock key={i} target={цель(`sec-${i}`, `Блок ${i + 1}`)} owner={{kind: 'section', id: `sec-${i}`}}>
          <p>содержимое блока {i + 1}</p>
        </EditableBlock>
      ))}
    </EditorProvider>
  );
}

describe('режим правки показывает, что правится', () => {
  it('вне режима — ни одной подсветки: покупатель получает ту же страницу', () => {
    const {container} = render(<Страница editing={false} точек={3} />);

    expect(container.querySelectorAll('[data-editable]')).toHaveLength(0);
    expect(screen.getByText('содержимое блока 1')).toBeInTheDocument();
  });

  it('в режиме подсвечено РОВНО столько областей, сколько правится', async () => {
    const {container} = render(<Страница editing точек={3} />);

    // Ровно три, хотя абзацев на странице четыре: непраимое не подсвечивается.
    expect(container.querySelectorAll('[data-editable]')).toHaveLength(3);
    await waitFor(() => expect(screen.getByText(/правится 3 области/)).toBeInTheDocument());
  });

  it('число в полосе живое: уберёшь точку — уменьшится', async () => {
    const {rerender} = render(<Страница editing точек={3} />);
    await waitFor(() => expect(screen.getByText(/правится 3 области/)).toBeInTheDocument());

    rerender(<Страница editing точек={1} />);

    // Окончание тоже меняется: «1 область», а не «1 области». Владелец читает
    // эту строку на каждой странице, и неверное окончание — мелочь ровно до
    // второго раза.
    await waitFor(() => expect(screen.getByText(/правится 1 область$/)).toBeInTheDocument());
  });

  it('пять областей — «областей», а не «области»', async () => {
    render(<Страница editing точек={5} />);
    await waitFor(() => expect(screen.getByText(/правится 5 областей/)).toBeInTheDocument());
  });

  it('на странице без точек полоса говорит это прямо, а не молчит', async () => {
    render(<Страница editing точек={0} />);

    // Режим, который включается и ничего не делает, читается как поломка.
    await waitFor(() =>
      expect(screen.getByText(/на этой странице пока нечего править/)).toBeInTheDocument(),
    );
  });

  it('до подсчёта ноль НЕ называется «нечего править» — это была бы неправда', () => {
    // Точки отмечаются в эффектах, то есть после первой отрисовки. На этом
    // кадре ноль означает «ещё не считали», и сказать «нечего править» было бы
    // неправдой.
    //
    // ПОЧЕМУ ЗДЕСЬ ПОДДЕЛЬНЫЕ ТАЙМЕРЫ. Первая версия этого кейса просто
    // рендерила страницу и смотрела, нет ли слова «нечего». Она проходила
    // ВСЕГДА — и с выдержкой, и без неё: render у RTL завёрнут в act(), тот
    // синхронно прогоняет эффекты, и кадр «ещё не считали» до проверки не
    // доживает. Кейс был зелёным по недосягаемости, а не по свойству.
    // Поддельные таймеры этот кадр удерживают: выдержка не сработает, пока её
    // не прокрутят руками.
    vi.useFakeTimers();
    try {
      render(<Страница editing точек={0} />);

      expect(screen.queryByText(/нечего править/)).toBeNull();
      expect(screen.getByText(/страница показывает черновик/)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.getByText(/нечего править/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// Правка — только на компьютере (решение владельца 24.09, useIsDesktop.ts).
// Сервер ширины не знает и по куке отдаёт черновик (editing=true) и телефону.
// Тогда инструментов нет, а полоса говорит, что это черновик, — иначе
// неопубликованное прочтётся как сайт.
describe('на телефоне правки нет, черновик назван', () => {
  it('390 px, сервер отдал черновик — ни одной точки правки, полоса «черновик», выход есть', async () => {
    setViewport(390);
    const {container} = render(<Страница editing точек={3} />);

    expect(container.querySelectorAll('[data-editable]')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Черновик · править можно с компьютера')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Закончить правку'})).toBeInTheDocument();
    expect(screen.queryByText(/Режим правки/)).toBeNull();
    expect(screen.queryByText(/Сервер не признал сессию/)).toBeNull();
  });

  it('1280 px — всё как было: точки правки и полоса с числом', async () => {
    setViewport(1280);
    const {container} = render(<Страница editing точек={3} />);

    expect(container.querySelectorAll('[data-editable]')).toHaveLength(3);
    await waitFor(() => expect(screen.getByText(/правится 3 области/)).toBeInTheDocument());
    expect(screen.queryByText(/править можно с компьютера/)).toBeNull();
  });

  it('телефон повернули или окно сузили — правка выключается сразу', async () => {
    setViewport(1280);
    const {container} = render(<Страница editing точек={3} />);
    expect(container.querySelectorAll('[data-editable]')).toHaveLength(3);

    resizeViewport(390);

    await waitFor(() => expect(container.querySelectorAll('[data-editable]')).toHaveLength(0));
    expect(screen.getByText('Черновик · править можно с компьютера')).toBeInTheDocument();
  });

  it('390 px вне режима — никакой полосы: покупатель получает обычную страницу', () => {
    setViewport(390);
    render(<Страница editing={false} точек={3} />);

    expect(screen.queryByText(/Черновик|Режим правки/)).toBeNull();
  });
});

// ДО ГИДРАТАЦИИ ширина неизвестна (useIsDesktop.ts): сервер её не знает.
// Полоса тогда обязана говорить то, что верно на ЛЮБОМ экране, — иначе на
// компьютере на кадр мелькнуло бы «править можно с компьютера», — и
// инструментов в разметке быть не должно, иначе на телефоне они встали бы на
// кадр. Проверка — серверной отрисовкой, а не клиентской: только она видит
// это состояние.
describe('до гидратации — ширина неизвестна', () => {
  it('разметка сервера: нейтральная полоса, ни одной точки правки', async () => {
    const {renderToString} = await import('react-dom/server');
    const html = renderToString(<Страница editing точек={3} />);

    expect(html).toContain('Режим правки · страница показывает черновик');
    expect(html).not.toContain('править можно с компьютера');
    expect(html).not.toContain('data-editable');
  });
});
