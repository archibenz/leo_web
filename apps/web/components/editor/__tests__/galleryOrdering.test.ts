import {describe, it, expect} from 'vitest';
import {appendItems, fromItems, markCover, removeItem, reorderTo, toItems} from '../galleryOrdering';

// Чистые функции над списком кадров варианта — без рендера. Обложка это флаг
// на кадре, не позиция: «первый в списке = обложка» ломается при любой
// перестановке (см. task-admin-media-brief.md), поэтому каждый тест ниже,
// где кадры двигаются, отдельно проверяет, что флаг остался на СВОЁМ кадре.

describe('toItems / fromItems', () => {
  it('собирает главный снимок и галерею в один список, снимок — обложка и идёт первым', () => {
    const items = toItems('/uploads/products/a.jpg', ['/uploads/products/b.jpg', '/uploads/products/c.jpg']);
    expect(items).toEqual([
      {url: '/uploads/products/a.jpg', cover: true},
      {url: '/uploads/products/b.jpg', cover: false},
      {url: '/uploads/products/c.jpg', cover: false},
    ]);
  });

  it('разбирает список обратно на image (обложка) и gallery (остальные по порядку)', () => {
    const items = [
      {url: '/uploads/products/b.jpg', cover: false},
      {url: '/uploads/products/a.jpg', cover: true},
      {url: '/uploads/products/c.jpg', cover: false},
    ];
    expect(fromItems(items)).toEqual({
      image: '/uploads/products/a.jpg',
      gallery: ['/uploads/products/b.jpg', '/uploads/products/c.jpg'],
    });
  });

  it('без явной обложки в списке подстраховывается первым элементом — не роняет данные', () => {
    const items = [
      {url: '/uploads/products/a.jpg', cover: false},
      {url: '/uploads/products/b.jpg', cover: false},
    ];
    expect(fromItems(items)).toEqual({image: '/uploads/products/a.jpg', gallery: ['/uploads/products/b.jpg']});
  });
});

describe('reorderTo', () => {
  it('переставляет кадр с одной позиции на другую, остальные сдвигаются', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg', '/d.jpg']);
    const next = reorderTo(items, 0, 2);
    expect(next.map((i) => i.url)).toEqual(['/b.jpg', '/c.jpg', '/a.jpg', '/d.jpg']);
  });

  it('обложка остаётся обложкой, даже переехав на другое место в списке', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg']);
    const next = reorderTo(items, 0, 2); // обложка /a.jpg уезжает в конец
    expect(next.find((i) => i.url === '/a.jpg')?.cover).toBe(true);
    expect(next.filter((i) => i.cover)).toHaveLength(1);
  });

  it('индекс вне диапазона — список не меняется', () => {
    const items = toItems('/a.jpg', ['/b.jpg']);
    expect(reorderTo(items, 0, 5)).toEqual(items);
    expect(reorderTo(items, -1, 0)).toEqual(items);
  });

  it('не мутирует исходный массив', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg']);
    const before = items.map((i) => ({...i}));
    reorderTo(items, 0, 2);
    expect(items).toEqual(before);
  });
});

describe('markCover', () => {
  it('снимает флаг со старой обложки и ставит на новую — обложка всегда ровно одна', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg']);
    const next = markCover(items, '/c.jpg');
    expect(next.filter((i) => i.cover)).toEqual([{url: '/c.jpg', cover: true}]);
  });

  it('порядок кадров не трогает — обложка это флаг, не позиция', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg']);
    const next = markCover(items, '/c.jpg');
    expect(next.map((i) => i.url)).toEqual(['/a.jpg', '/b.jpg', '/c.jpg']);
  });
});

describe('removeItem', () => {
  it('убирает кадр из списка', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg']);
    expect(removeItem(items, '/b.jpg').map((i) => i.url)).toEqual(['/a.jpg', '/c.jpg']);
  });

  it('убрав обложку, назначает новую сама — а не молчит с нулём обложек', () => {
    const items = toItems('/a.jpg', ['/b.jpg', '/c.jpg']);
    const next = removeItem(items, '/a.jpg');
    expect(next.filter((i) => i.cover)).toHaveLength(1);
    expect(next[0]!.cover).toBe(true);
  });

  it('последний оставшийся кадр не убрать — карточка не может остаться совсем без снимка', () => {
    const items = toItems('/a.jpg', []);
    expect(removeItem(items, '/a.jpg')).toEqual(items);
  });
});

describe('appendItems', () => {
  it('дописывает новые кадры в конец, обложку не трогает', () => {
    const items = toItems('/a.jpg', ['/b.jpg']);
    const next = appendItems(items, ['/c.jpg', '/d.jpg']);
    expect(next.map((i) => i.url)).toEqual(['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg']);
    expect(next.filter((i) => i.cover)).toEqual([{url: '/a.jpg', cover: true}]);
  });
});
