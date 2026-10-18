import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ru from '../../../messages/ru.json';
import type {StorefrontSection} from '../../../lib/catalogue/types';
import SectionForm from '../SectionForm';
import TickerForm from '../TickerForm';
import ModelForm from '../ModelForm';
import VariantForm from '../VariantForm';

const mocks = vi.hoisted(() => ({
  guard: {dirty: false, busy: false, reset: () => {}},
  apiFetch: vi.fn(), saveSectionDraft: vi.fn(), saveModelDraft: vi.fn(), saveVariantDraft: vi.fn(), uploadMedia: vi.fn(),
}));
vi.mock('../useEditorFormState', () => ({useEditorFormState: (dirty: boolean, busy: boolean, reset: () => void) => { mocks.guard = {dirty, busy, reset}; }}));
vi.mock('../../../lib/api', () => ({apiFetch: mocks.apiFetch, getToken: () => null, API_BASE: ''}));
vi.mock('../editorApi', () => ({saveSectionDraft: mocks.saveSectionDraft, saveModelDraft: mocks.saveModelDraft, saveVariantDraft: mocks.saveVariantDraft, uploadMedia: mocks.uploadMedia}));

function section(id = 'one'): StorefrontSection {
  return {id, slug: id, layout: 'hero', status: 'active', nameRu: id, nameEn: id, sortOrder: 0,
    headlineRu: id === 'one' ? 'Первый' : 'Второй', items: [{ru: id === 'one' ? 'Первый' : 'Второй'}]};
}
function model() {
  return {nameRu: 'Первый', nameEn: 'First', descRu: 'Описание', descEn: 'Description', storyRu: '', storyEn: '', compositionRu: 'Хлопок', compositionEn: 'Cotton', careRu: 'Уход', careEn: 'Care', sizes: ['S'], measurements: [],
    variants: {one: {price: 1000, stockQuantity: 2, priceSource: 'manual', discountPct: 5, image: '/one.jpg', gallery: ['/two.jpg']}, two: {price: 2000, stockQuantity: 3, priceSource: 'manual', discountPct: 5, image: '/other.jpg', gallery: []}}};
}
const saved = vi.fn();
const forms = [
  {name: 'section', label: 'Заголовок · ru', initial: 'Первый', submitted: 'Сохранённый', newer: 'Новый ввод', save: mocks.saveSectionDraft,
    view: (id = 'one') => <SectionForm section={section(id)} onSaved={saved}/>, expected: {headlineRu: 'Первый'}},
  {name: 'ticker', label: 'Текст (ru) · строка 1', initial: 'Первый', submitted: 'Сохранённый', newer: 'Новый ввод', save: mocks.saveSectionDraft,
    view: (id = 'one') => <NextIntlClientProvider locale="ru" messages={{editor: ru.editor}}><TickerForm section={{...section(id), layout: 'ticker'}} products={[]} locale="ru" onSaved={saved}/></NextIntlClientProvider>,
    expected: {items: [{ru: 'Первый', en: null, href: null, until: null}]}},
  {name: 'model', label: 'Название · ru', initial: 'Первый', submitted: 'Сохранённый', newer: 'Новый ввод', save: mocks.saveModelDraft,
    view: (id = 'one') => <ModelForm modelId={id} onSaved={saved}/>, expected: {nameRu: 'Первый'}},
  {name: 'variant', label: 'Ваша цена, ₽', initial: 1000, submitted: 1500, newer: 1750, save: mocks.saveVariantDraft,
    view: (id = 'one') => <VariantForm modelId="model" variantId={id} onSaved={saved}/>, expected: {price: 1000}},
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard = {dirty: false, busy: false, reset: () => {}};
  mocks.apiFetch.mockReset().mockImplementation((path: string) => Promise.resolve({...model(), nameRu: path.endsWith('/two') ? 'Второй' : 'Первый'}));
  for (const save of [mocks.saveSectionDraft, mocks.saveModelDraft, mocks.saveVariantDraft]) save.mockReset().mockResolvedValue({});
});
afterEach(cleanup);

describe.each(forms)('$name draft baseline', (form) => {
  it('successful save becomes the baseline and reverting to the old value sends a new patch', async () => {
    render(form.view());
    const input = await screen.findByLabelText(form.label);
    fireEvent.change(input, {target: {value: form.submitted}});
    fireEvent.click(screen.getByRole('button', {name: 'Сохранить в черновик'}));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', {name: 'Сохранить в черновик'})).toBeDisabled();
    expect(mocks.guard.dirty).toBe(false);
    fireEvent.change(input, {target: {value: form.initial}});
    expect(mocks.guard.dirty).toBe(true);
    fireEvent.click(screen.getByRole('button', {name: 'Сохранить в черновик'}));
    await waitFor(() => expect(form.save).toHaveBeenCalledTimes(2));
    expect(form.save.mock.calls[1][1]).toEqual(form.expected);
  });

  it('preserves text typed during a pending save and resets to the exact submitted snapshot', async () => {
    let resolve!: (value: unknown) => void;
    form.save.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(form.view());
    const input = await screen.findByLabelText(form.label);
    fireEvent.change(input, {target: {value: form.submitted}});
    fireEvent.click(screen.getByRole('button', {name: 'Сохранить в черновик'}));
    expect(mocks.guard.busy).toBe(true);
    fireEvent.change(input, {target: {value: form.newer}});
    await act(async () => { resolve({}); });
    expect(input).toHaveValue(form.newer);
    expect(mocks.guard.dirty).toBe(true);
    expect(mocks.guard.busy).toBe(false);
    act(() => mocks.guard.reset());
    expect(screen.getByLabelText(form.label)).toHaveValue(form.submitted);
    expect(mocks.guard.dirty).toBe(false);
  });

  it('switching target replaces old unsaved fields with the selected target', async () => {
    const view = render(form.view());
    const input = await screen.findByLabelText(form.label);
    fireEvent.change(input, {target: {value: form.newer}});
    view.rerender(form.view('two'));
    await waitFor(() => expect(screen.getByLabelText(form.label)).toHaveValue(form.name === 'variant' ? 2000 : 'Второй'));
    expect(mocks.guard.dirty).toBe(false);
    expect(screen.getByRole('button', {name: 'Сохранить в черновик'})).toBeDisabled();
  });

  it('a previous target save resolving late cannot replace the current target baseline', async () => {
    let resolve!: (value: unknown) => void;
    form.save.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = render(form.view());
    fireEvent.change(await screen.findByLabelText(form.label), {target: {value: form.submitted}});
    fireEvent.click(screen.getByRole('button', {name: 'Сохранить в черновик'}));
    view.rerender(form.view('two'));
    await waitFor(() => expect(screen.getByLabelText(form.label)).toHaveValue(form.name === 'variant' ? 2000 : 'Второй'));
    await act(async () => { resolve({}); });
    expect(mocks.guard.dirty).toBe(false);
    expect(screen.getByRole('button', {name: 'Сохранить в черновик'})).toBeDisabled();
    act(() => mocks.guard.reset());
    expect(screen.getByLabelText(form.label)).toHaveValue(form.name === 'variant' ? 2000 : 'Второй');
  });

  it('failed saves retain the last successful baseline', async () => {
    form.save.mockRejectedValueOnce(new Error('Save failed'));
    render(form.view());
    fireEvent.change(await screen.findByLabelText(form.label), {target: {value: form.submitted}});
    fireEvent.click(screen.getByRole('button', {name: 'Сохранить в черновик'}));
    await screen.findByRole('alert');
    expect(mocks.guard.dirty).toBe(true);
    expect(mocks.guard.busy).toBe(false);
    expect(saved).not.toHaveBeenCalled();
    act(() => mocks.guard.reset());
    expect(screen.getByLabelText(form.label)).toHaveValue(form.initial);
    expect(mocks.guard.dirty).toBe(false);
  });
});

it.each(forms.filter(form => ['model', 'variant'].includes(form.name)))('$name initial read is busy until data commits', async (form) => {
  let resolve!: (value: unknown) => void;
  mocks.apiFetch.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  render(form.view());
  expect(mocks.guard.busy).toBe(true);
  expect(mocks.guard.dirty).toBe(false);
  await act(async () => { resolve(model()); });
  expect(await screen.findByLabelText(form.label)).toBeVisible();
  expect(mocks.guard.busy).toBe(false);
});

it('variant reset restores gallery and the local discount input buffer', async () => {
  render(forms[3].view());
  const discount = await screen.findByLabelText('Скидка, %');
  fireEvent.change(discount, {target: {value: '15'}});
  fireEvent.click(screen.getByRole('button', {name: 'Убрать · кадр 2'}));
  expect(screen.getAllByRole('img')).toHaveLength(1);
  expect(mocks.guard.dirty).toBe(true);
  act(() => mocks.guard.reset());
  expect(screen.getByLabelText('Скидка, %')).toHaveValue('5');
  expect(screen.getAllByRole('img')).toHaveLength(2);
  expect(mocks.guard.dirty).toBe(false);
});

it.each(forms.filter(form => ['section', 'variant'].includes(form.name)))('$name keeps the workspace busy until its upload finishes', async (form) => {
  let resolve!: (value: string) => void;
  mocks.uploadMedia.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  render(form.view());
  await screen.findByLabelText(form.label);
  const input = form.name === 'variant' ? screen.getByLabelText('Добавить кадры') : screen.getAllByLabelText('Десктоп').filter(node => node.tagName === 'INPUT')[1];
  fireEvent.change(input, {target: {files: [new File(['image'], 'new.jpg', {type: 'image/jpeg'})]}});
  expect(mocks.guard.busy).toBe(true);
  await act(async () => { resolve('/uploaded.jpg'); });
  expect(mocks.guard.busy).toBe(false);
  expect(mocks.guard.dirty).toBe(true);
});
