import * as React from 'react';
import type {ReactNode} from 'react';

// Перетекание обложки там, где браузер это умеет, и обычная разметка там, где
// не умеет.
//
// ПОЧЕМУ ЧЕРЕЗ ПРОВЕРКУ, А НЕ ПРЯМЫМ ИМПОРТОМ. Компонент приходит из РАЗНЫХ
// сборок React, и имя у него разное:
//
//   что шлётся в браузер  next/dist/compiled/react-experimental → unstable_ViewTransition
//   что видят юнит-тесты  node_modules/react 19.2               → нет ни того ни другого
//   React 19.3+                                                 → ViewTransition, уже стабильный
//
// Прямой импорт `unstable_ViewTransition` собирается и работает, но в jsdom
// даёт undefined — и три файла проверок падают с «Element type is invalid»,
// то есть страница товара и главная перестают проверяться вовсе. Замерено:
// 13 упавших проверок.
//
// И дело не только в тестах. View Transitions нет в браузерах старше Safari 18
// и Firefox без флага. Там переход не нужен, а страница нужна.
//
// Поэтому правило одно на все три случая: НЕТ КОМПОНЕНТА — РИСУЕМ ДЕТЕЙ.
// Это не подпорка под тест, а поведение, которое в любом случае обязано быть.
const Компонент = (React as unknown as {
  ViewTransition?: (props: {name?: string; children?: ReactNode}) => ReactNode;
  unstable_ViewTransition?: (props: {name?: string; children?: ReactNode}) => ReactNode;
}).ViewTransition ?? (React as unknown as {
  unstable_ViewTransition?: (props: {name?: string; children?: ReactNode}) => ReactNode;
}).unstable_ViewTransition;

/** Умеет ли текущая сборка React переходы — для проверок, чтобы им было что утверждать. */
export const переходыДоступны = Boolean(Компонент);

export function CoverTransition({name, children}: {name: string; children: ReactNode}) {
  if (!Компонент) return <>{children}</>;
  return <Компонент name={name}>{children}</Компонент>;
}
