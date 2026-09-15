import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const uploadMedia = vi.fn();
vi.mock('../editorApi', () => ({uploadMedia: (...args: unknown[]) => uploadMedia(...args)}));

import GalleryField from '../GalleryField';

// Скобки обязательны: mockReset() возвращает сам мок (для чепочки вызовов),
// и без блочного тела beforeEach вернул бы vi.fn() наружу — vitest принял бы
// функцию за cleanup-колбэк хука и позвал бы uploadMedia() без аргументов
// после теста. Поймано на этой же паре тестов ниже: третий кадр падал с
// «Cannot read properties of undefined» ровно от этого вызова.
beforeEach(() => {
  uploadMedia.mockReset();
});
afterEach(cleanup);

// «Загрузка трёх файлов разом даёт три миниатюры и три независимых
// состояния; отказ по одному не отменяет два других» — приёмка из
// task-admin-media-brief.md. Управляемые (не авто-резолвящиеся) промисы ниже
// — чтобы доказать это именно на гонке, а не только на последовательном
// «одно за другим», где независимость легко подделать общим busy-флагом.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

describe('GalleryField — кадры вместо адресов', () => {
  it('главный снимок и галерея рисуются миниатюрами, а не строками адресов', () => {
    render(<GalleryField image="/uploads/products/a.jpg" gallery={['/uploads/products/b.jpg']} onChange={() => {}} />);

    const images = screen.getAllByRole('img');
    expect(images.map((i) => i.getAttribute('src'))).toEqual([
      '/uploads/products/a.jpg',
      '/uploads/products/b.jpg',
    ]);
  });

  it('обложка отмечена явно, а не по позиции — первый кадр подписан «Обложка»', () => {
    render(<GalleryField image="/uploads/products/a.jpg" gallery={['/uploads/products/b.jpg']} onChange={() => {}} />);

    expect(screen.getByText('Обложка')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Сделать обложкой.*кадр 2/})).toBeInTheDocument();
  });
});

describe('GalleryField — порядок и обложка', () => {
  it('перестановка меняет ГАЛЕРЕЮ (не-обложечные кадры), а обложка остаётся на своём кадре, где бы он ни оказался', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <GalleryField
        image="/uploads/products/a.jpg"
        gallery={['/uploads/products/b.jpg', '/uploads/products/c.jpg', '/uploads/products/d.jpg']}
        onChange={onChange}
      />,
    );

    // c.jpg (кадр 3) становится обложкой — не первый в списке, и это нарочно:
    // «первый = обложка» здесь не должно бы уже ничего значить.
    await user.click(screen.getByRole('button', {name: /Сделать обложкой.*кадр 3/}));
    expect(onChange).toHaveBeenLastCalledWith({
      image: '/uploads/products/c.jpg',
      gallery: ['/uploads/products/a.jpg', '/uploads/products/b.jpg', '/uploads/products/d.jpg'],
    });

    // Теперь двигаем a.jpg (кадр 1, НЕ обложку) вниз — это должно изменить
    // порядок в gallery, потому что a и b — оба не обложка.
    await user.click(screen.getByRole('button', {name: /^Вниз.*кадр 1/}));

    expect(onChange).toHaveBeenLastCalledWith({
      image: '/uploads/products/c.jpg',
      gallery: ['/uploads/products/b.jpg', '/uploads/products/a.jpg', '/uploads/products/d.jpg'],
    });
  });

  it('кнопка «Вверх» первого кадра и «Вниз» последнего выключены — двигать дальше некуда', () => {
    render(
      <GalleryField
        image="/uploads/products/a.jpg"
        gallery={['/uploads/products/b.jpg']}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('button', {name: /^Вверх.*кадр 1/})).toBeDisabled();
    expect(screen.getByRole('button', {name: /^Вниз.*кадр 2/})).toBeDisabled();
  });

  it('кнопки перестановки и обложки — зоны нажатия от 44px (правка с телефона)', () => {
    render(
      <GalleryField image="/uploads/products/a.jpg" gallery={['/uploads/products/b.jpg']} onChange={() => {}} />,
    );

    // Набор написаний, а не одно: 44px здесь пишут и min-h-11, и min-h-[44px].
    const порог = /min-h-(11|12|\[44px\])/;
    expect(screen.getByRole('button', {name: /Сделать обложкой.*кадр 2/}).className).toMatch(порог);
    expect(screen.getByRole('button', {name: /^Вниз.*кадр 1/}).className).toMatch(порог);
  });
});

describe('GalleryField — удаление кадра', () => {
  it('убирает кадр из списка', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <GalleryField image="/uploads/products/a.jpg" gallery={['/uploads/products/b.jpg']} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', {name: /Убрать.*кадр 2/}));
    expect(onChange).toHaveBeenLastCalledWith({image: '/uploads/products/a.jpg', gallery: []});
  });

  it('последний оставшийся кадр убрать нельзя — карточка не может остаться совсем без снимка', () => {
    render(<GalleryField image="/uploads/products/a.jpg" gallery={[]} onChange={() => {}} />);

    expect(screen.getByRole('button', {name: /Убрать.*кадр 1/})).toBeDisabled();
  });
});

describe('GalleryField — загрузка пачкой, независимые состояния', () => {
  it('три файла — три миниатюры; отказ одного не трогает два других, даже если ответы приходят вперемешку', async () => {
    const one = deferred<string>();
    const two = deferred<string>();
    const three = deferred<string>();
    uploadMedia.mockImplementation((file: File) => {
      if (file.name === 'one.jpg') return one.promise;
      if (file.name === 'two.jpg') return two.promise;
      return three.promise;
    });

    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    const user = userEvent.setup();
    render(
      <GalleryField image="/uploads/products/a.jpg" gallery={[]} onChange={onChange} onUploadingChange={onUploadingChange} />,
    );

    const files = [
      new File(['1'], 'one.jpg', {type: 'image/jpeg'}),
      new File(['2'], 'two.jpg', {type: 'image/jpeg'}),
      new File(['3'], 'three.jpg', {type: 'image/jpeg'}),
    ];
    await user.upload(screen.getByLabelText(/Добавить кадры/i), files);

    expect(uploadMedia).toHaveBeenCalledTimes(3);
    expect(onUploadingChange).toHaveBeenLastCalledWith(true);
    // Три независимых состояния «грузится», ни одной общей строки на всех.
    expect(screen.getAllByText(/грузится/i)).toHaveLength(3);

    // Вперемешку: сперва падает первый, потом успевает второй, третий ещё летит.
    one.reject(new Error('too heavy'));
    await waitFor(() => expect(screen.getByText('too heavy')).toBeInTheDocument());

    two.resolve('/uploads/products/two.jpg');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({image: '/uploads/products/a.jpg', gallery: ['/uploads/products/two.jpg']}));

    // Третий всё ещё грузится, второй уже кадр, первый — ошибка рядом с собой.
    expect(screen.getAllByText(/грузится/i)).toHaveLength(1);
    expect(screen.getByText('too heavy')).toBeInTheDocument();
    expect(screen.getAllByRole('img').map((i) => i.getAttribute('src'))).toContain('/uploads/products/two.jpg');

    three.resolve('/uploads/products/three.jpg');
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        image: '/uploads/products/a.jpg',
        gallery: ['/uploads/products/two.jpg', '/uploads/products/three.jpg'],
      }),
    );

    // Загрузка закончена (успехом или отказом) — форму больше ждать не нужно.
    await waitFor(() => expect(onUploadingChange).toHaveBeenLastCalledWith(false));
  });

  it('отклонённый файл можно повторить — тот же файл, новая попытка', async () => {
    const first = deferred<string>();
    const retry = deferred<string>();
    let call = 0;
    uploadMedia.mockImplementation(() => (call++ === 0 ? first.promise : retry.promise));

    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<GalleryField image="/uploads/products/a.jpg" gallery={[]} onChange={onChange} />);

    await user.upload(screen.getByLabelText(/Добавить кадры/i), new File(['1'], 'one.jpg', {type: 'image/jpeg'}));
    first.reject(new Error('сеть моргнула'));
    await waitFor(() => expect(screen.getByText('сеть моргнула')).toBeInTheDocument());

    await user.click(screen.getByRole('button', {name: /Повторить/i}));
    retry.resolve('/uploads/products/one.jpg');

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({image: '/uploads/products/a.jpg', gallery: ['/uploads/products/one.jpg']}),
    );
    expect(uploadMedia).toHaveBeenCalledTimes(2);
  });

  it('дропзона принимает несколько картинок и не звучит как «одна за раз»', () => {
    render(<GalleryField image="/uploads/products/a.jpg" gallery={[]} onChange={() => {}} />);

    const input = screen.getByLabelText(/Добавить кадры/i);
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png');
  });
});
