import '@testing-library/jest-dom/vitest';

// jsdom не реализует ResizeObserver, а примитивы Radix (выключатель, боковая
// панель, всплывающие списки) читают через него размеры при монтировании.
// Без заглушки любой тест, отрисовавший такой примитив, падает с
// «ResizeObserver is not defined» — и падает НЕ там, где ошибка: сообщение
// приходит из чужого пакета и уводит искать поломку в своём коде.
//
// Заглушка пустая нарочно. Она не должна ничего измерять: тесты проверяют
// разметку и поведение, а не раскладку, которой в jsdom всё равно нет.
// Понадобится измерение — это будет работа для браузера, не для заглушки.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Тем же порядком — три метода элемента, которых в jsdom нет, а выпадающие
// списки Radix их зовут при открытии. Без них список не раскрывается, и тест
// видит не «выбор не сработал», а «элемента нет», то есть снова указывает не
// туда.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
