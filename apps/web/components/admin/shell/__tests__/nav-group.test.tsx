import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {render, screen, cleanup, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {SidebarProvider} from '@/components/ui/sidebar';
import {MENU} from '@/lib/nav/menu';
import {NavFooter, NavGroup} from '../nav-group';
import {setViewport} from '../../../editor/__tests__/viewport';

// Меню от 28.09 (leo_analytics #214): разделы складываются (fold) и раскрыт
// только тот, где текущая страница; «Главное · Свод» выделено (emphasis);
// «На сайт» — кнопка внизу панели (footer), а не пункт «Служебного».

vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));
vi.mock('@/components/editor/useEditMode', () => ({useEditMode: () => ({isAdmin: true, on: false, toggle: vi.fn()})}));

beforeEach(() => setViewport(1280));
afterEach(cleanup);

const section = (id: string) => {
  const s = MENU.find((x) => x.id === id);
  if (!s) throw new Error(`в меню нет раздела ${id}`);
  return s;
};

function renderGroup(id: string, pathname: string) {
  return render(
    <SidebarProvider>
      <NavGroup section={section(id)} pathname={pathname} locale="ru" />
    </SidebarProvider>,
  );
}

const linkTo = (href: string) => document.querySelector(`a[href="${href}"]`);

describe('складывающиеся разделы', () => {
  it('раздел без текущей страницы свёрнут: пунктов WB в разметке нет', () => {
    renderGroup('wb', '/ru/admin');
    expect(screen.getByText('WB')).toBeInTheDocument();
    expect(linkTo('/analytics/wb')).toBeNull();
  });

  it('раздел с текущей страницей раскрыт', () => {
    renderGroup('site', '/ru/admin/products');
    expect(linkTo('/ru/admin/products')).not.toBeNull();
  });

  it('раскрытие следует за переходом, а не только за первой загрузкой', () => {
    const {rerender} = renderGroup('site', '/ru/admin/products');
    expect(linkTo('/ru/admin/products')).not.toBeNull();
    rerender(
      <SidebarProvider>
        <NavGroup section={section('site')} pathname="/ru/account" locale="ru" />
      </SidebarProvider>,
    );
    expect(linkTo('/ru/admin/products')).toBeNull();
  });

  it('свёрнутый раздел раскрывается руками', async () => {
    const user = userEvent.setup();
    renderGroup('wb', '/ru/admin');
    await user.click(screen.getByRole('button', {name: 'WB'}));
    expect(linkTo('/analytics/wb')).not.toBeNull();
  });
});

describe('выделенный раздел', () => {
  it('«Главное» не складывается, выделено и сразу показывает «Свод»', () => {
    renderGroup('summary', '/ru/admin');
    const group = document.querySelector('[data-section="summary"]');
    expect(group).toHaveAttribute('data-emphasis');
    expect(within(group as HTMLElement).getByText('Главное')).toHaveClass('font-semibold');
    expect(linkTo('/analytics')).not.toBeNull();
  });
});

describe('кнопки внизу панели', () => {
  it('«На сайт» ведёт на витрину своей локали', () => {
    render(
      <SidebarProvider>
        <NavFooter locale="ru" />
      </SidebarProvider>,
    );
    const toSite = screen.getByRole('link', {name: 'На сайт'});
    expect(toSite).toHaveAttribute('href', '/ru');
  });
});
