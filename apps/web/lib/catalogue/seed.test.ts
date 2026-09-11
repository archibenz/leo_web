import {describe, it, expect} from 'vitest';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

// V30 — единственный источник каталога после удаления products.ts. Тест держит
// её честной: счёт строк по каждой таблице и существование каждой картинки на
// диске (заменяет WhiteCatalogue.test.ts, который проверял то же по файлу).
const SQL = readFileSync(join(process.cwd(), '..', 'api', 'src', 'main', 'resources', 'db', 'migration', 'V30__seed_storefront_catalogue.sql'), 'utf8');
const count = (table: string) => (SQL.match(new RegExp(`INSERT INTO ${table} `, 'g')) ?? []).length;

describe('V30 seed', () => {
  it('carries the whole storefront', () => {
    expect(count('product_models')).toBe(20);
    expect(count('products')).toBe(87);
    expect(count('product_sets')).toBe(5);
    expect(count('product_set_items')).toBe(12);
    expect(count('storefront_sections')).toBe(2);
    expect(SQL).toContain('UPDATE products SET active = false WHERE is_test = true');
  });

  it('every image and video it references exists under public/', () => {
    const paths = [...new Set(SQL.match(/\/(?:images|videos)\/white\/[^'"$\s,]+/g) ?? [])];
    expect(paths.length).toBeGreaterThan(100);
    const missing = paths.filter((p) => !existsSync(join(process.cwd(), 'public', p)));
    expect(missing).toEqual([]);
  });

  it('gives every variant a WB article id and every model a key from products.ts', () => {
    expect((SQL.match(/'wb-\d{9,10}'/g) ?? []).length).toBeGreaterThanOrEqual(87);
    // Два цвета с одним nm дали бы один INSERT, который ON CONFLICT молча съест:
    // тест «87 INSERT» прошёл бы, а в базе оказалось бы 86. Считаем различные id.
    const variantIds = new Set(SQL.match(/INSERT INTO products \([^)]*\) VALUES \('(wb-\d+)'/g) ?? []);
    expect(variantIds.size).toBe(87);
    // Слаги идут в SQL долларовыми кавычками ($q$…$q$), как и все тексты.
    expect(SQL).toContain('$q$sportivnyy-kostyum-s-kantom$q$'); // key 21, без цены — тоже заводится
  });
});
