import {render, screen} from '@testing-library/react';
import {describe, it, expect} from 'vitest';
import WhiteLegalShowcase from './WhiteLegalShowcase';

const PROPS = {
  tag: 'Правовая информация',
  title: 'Политика обработки персональных данных',
  lastUpdated: 'Последнее обновление: апрель 2026',
  sections: [
    {heading: '1. Общие положения', body: 'Настоящая Политика разработана в соответствии с 152-ФЗ.'},
    {heading: '2. Категории субъектов', body: 'Покупатели и посетители сайта.'},
  ],
};

describe('WhiteLegalShowcase', () => {
  it('renders the tag, title, date and every section', () => {
    render(<WhiteLegalShowcase {...PROPS} />);
    expect(screen.getByRole('heading', {level: 1, name: PROPS.title})).toBeInTheDocument();
    expect(screen.getByText(PROPS.tag)).toBeInTheDocument();
    expect(screen.getByText(PROPS.lastUpdated)).toBeInTheDocument();
    for (const s of PROPS.sections) {
      expect(screen.getByRole('heading', {level: 2, name: s.heading})).toBeInTheDocument();
      expect(screen.getByText(s.body)).toBeInTheDocument();
    }
  });

  it('carries no gradient-theme classes (paper-card / capsule-tag / text-ink)', () => {
    const {container} = render(<WhiteLegalShowcase {...PROPS} />);
    expect(container.querySelector('.paper-card')).toBeNull();
    expect(container.querySelector('.capsule-tag')).toBeNull();
    expect(container.querySelector('[class*="text-ink"]')).toBeNull();
  });
});
