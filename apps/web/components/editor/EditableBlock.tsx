'use client';

import {useEffect, useId, type ReactNode} from 'react';
import {FOOT, HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditor} from './EditorProvider';
import type {DraftKind, EditorTarget} from './types';

// Точка редактирования на живой странице. Вне режима — прозрачная обёртка:
// ни разметки, ни классов, ни обработчиков, чтобы покупатель получил ту же
// страницу, что и раньше.
//
// Размер кнопки — порог 44px/13px, тот же, что у EditorButton. Замер 15.09 на
// 393x852 показал здесь 29 px при кегле 10: владелец правит с телефона, и это
// вход в КАЖДУЮ правку. Промахнувшись, он не думает «промахнулся» — он думает,
// что кнопка не работает.
//
// Кнопка и маркер стоят В ПОТОКЕ, над содержимым, а не absolute поверх него.
// Первый вариант был absolute — и на коротком блоке (цена — одна строка) ярлык
// накрывал ровно то число, которое владелец собрался править. Сдвиг вёрстки в
// режиме правки честнее, чем правка вслепую.
export default function EditableBlock({target, owner, children}: {
  target: EditorTarget;
  // Чей черновик стережёт маркер. У варианта это его МОДЕЛЬ: черновик варианта
  // лежит внутри модельного и ломается вместе с ним.
  owner: {kind: DraftKind; id: string};
  children: ReactNode;
}) {
  const {editing, target: current, open, brokenFor, registerEditable, unregisterEditable} = useEditor();

  // Своё имя, а не `${kind}:${id}`: на карточке товара название и короткое
  // описание — две РАЗНЫЕ точки правки с одинаковой целью (одна модель), и по
  // цели они слились бы в одну. Счётчик показал бы пять вместо шести, и число
  // на экране врало бы владельцу ровно про то, ради чего его показывают.
  const слот = useId();

  // Отмечаемся только в режиме правки: вне его точек нет, и число не нужно.
  useEffect(() => {
    if (!editing) return;
    registerEditable(слот);
    return () => unregisterEditable(слот);
  }, [editing, слот, registerEditable, unregisterEditable]);

  if (!editing) return <>{children}</>;

  const active = current?.kind === target.kind && current.id === target.id;
  const broken = brokenFor(owner.kind, owner.id);

  return (
    // ПОДСВЕЧЕНО РОВНО ТО, ЧТО ПРАВИТСЯ, и ничего больше. Серого слоя «сюда
    // нельзя» нет намеренно: на витрине правится шесть областей из всей
    // страницы, и заливка остального читалась бы как запрет, хотя правда —
    // «мы пока не сделали». Врать интонацией хуже, чем молчать; про
    // неподсвеченное говорит словами полоса режима правки.
    //
    // Подложка — FOOT, та же, на которой стоит подвал: заметная рядом с белым
    // и не спорящая с кадрами. Владелец входит в режим правки нарочно, но
    // снимки экрана он шлёт из него же — подсветка не должна мешать обсуждать
    // вид.
    <div data-editable="true" style={{border: `1px dashed ${active ? SIGNAL : HAIR}`, background: FOOT}}>
      <div className="wv-rise flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => open(target)}
          className="inline-flex min-h-11 items-center px-4 py-2 text-[13px] uppercase tracking-[0.12em]"
          style={{border: `1px solid ${active ? SIGNAL : INK}`, color: active ? SIGNAL : INK}}
        >
          {target.label}
        </button>
        {broken && (
          <p role="status" className="flex-1 text-[11px] leading-snug" style={{color: SIGNAL}}>
            Черновик этой карточки не читается — показано опубликованное. {broken.reason}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
