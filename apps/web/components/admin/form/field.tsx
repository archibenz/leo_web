'use client';

import type {ReactNode} from 'react';
import {Label} from '@/components/ui/label';

// Поле формы админки.
//
// ПОДПИСЬ СВЯЗАНА С ПОЛЕМ ЧЕРЕЗ id, И ЭТО ПОЧИНКА, А НЕ ОФОРМЛЕНИЕ.
// В прежних трёх формах `<label>` стоял рядом с полем без `htmlFor` и без
// вложения — то есть ни одно из девятнадцати полей формы товара не имело
// доступного имени. Экранный диктор читал бы «поле ввода», и только.
// Нашлось это при написании договора сохранения: тест не смог найти ни одно
// поле по подписи и вынужден был искать по порядку в разметке.
//
// Отсюда обязательный `id`: это не удобство, а условие того, что подпись
// вообще с чем-то связана.
export function FormField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  /** Пояснение под подписью: например, «на сайте не показывается». */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint && (
        // aria-describedby не ставим: подсказка идёт сразу за подписью и
        // читается вместе с ней. Лишняя связь заставила бы диктора произнести
        // её дважды.
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      )}
      {children}
    </div>
  );
}

// Полоса сохранения, прилипшая к низу полотна.
//
// Прежде кнопка стояла в конце формы — у товара это девятнадцать полей ниже
// первого экрана. На телефоне владелец до неё докручивал, а если не докручивал,
// правка пропадала молча. Ровно на это он и жаловался про страницу аккаунта:
// «сделай нормальное расположение кнопок».
export function FormActions({
  saving,
  message,
  onCancel,
  onSave,
  saveLabel,
  savingLabel,
  cancelLabel,
}: {
  saving: boolean;
  message?: string;
  onCancel?: () => void;
  /**
   * Задан — кнопка обычная и зовёт это. Не задан — кнопка отправляет форму.
   * Две формы из трёх лежат внутри <form>, а форма ухода обходится без него
   * и вешает сохранение прямо на кнопку. Ломать её устройство ради
   * единообразия значило бы трогать поведение там, где просили трогать вид.
   */
  onSave?: () => void;
  saveLabel: string;
  savingLabel: string;
  cancelLabel?: string;
}) {
  return (
    <div className="-mx-4 sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      {message && <span className="mr-auto text-muted-foreground text-[13px]">{message}</span>}
      {onCancel && cancelLabel && (
        <button
          className="min-h-11 px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={onCancel}
          type="button"
        >
          {cancelLabel}
        </button>
      )}
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        disabled={saving}
        onClick={onSave}
        type={onSave ? 'button' : 'submit'}
      >
        {saving ? savingLabel : saveLabel}
      </button>
    </div>
  );
}
