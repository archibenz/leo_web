'use client';

import {useState, useEffect, useMemo} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon} from 'lucide-react';
import BrandLoader from '../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../lib/api';
import {formatPrice} from '../../../../../lib/formatPrice';
import {Badge} from '../../../../../components/ui/badge';
import {Button} from '../../../../../components/ui/button';
import {Switch} from '../../../../../components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../components/ui/table';
import {Panel, PanelEmpty} from '../../../../../components/admin/dashboard/panel';
import {ListPage} from '../../../../../components/admin/list/list-page';

type Product = {
  id: string;
  title: string;
  price: number;
  category: string | null;
  stockQuantity: number;
  isTest: boolean;
  active: boolean;
  collectionName: string | null;
};

export default function AdminProductsPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  // Тестовые (демо) товары скрыты по умолчанию (вычистка 26.09): на проде их
  // 13, все неактивны, английскими названиями стояли первыми и отодвигали 87
  // настоящих. Не удаляем — на них могут быть ссылки; показываются по кнопке.
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    apiFetch<Product[]>('/api/admin/products')
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t('confirmDelete', {name: title}))) return;
    try {
      await apiFetch(`/api/admin/products/${id}?permanent=true`, {method: 'DELETE'});
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('[AdminProducts] delete failed', err);
    }
  };

  // Поиск идёт по уже загруженному списку — ни одного нового запроса.
  // Ищем не только по названию: владелец помнит вещь то по имени, то по
  // коллекции, то по разделу, и поиск, знающий одно название, отказал бы ему
  // ровно тогда, когда нужен.
  const categoryLabel = (c: string | null) =>
    c && t.has(`product.categories.${c}`) ? t(`product.categories.${c}`) : c;
  const testCount = products.filter(p => p.isTest).length;
  const visible = useMemo(() => (showTest ? products : products.filter(p => !p.isTest)), [products, showTest]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visible;
    return visible.filter(p =>
      [p.title, p.category, categoryLabel(p.category), p.collectionName]
        .filter(Boolean)
        .some(field => (field as string).toLowerCase().includes(needle)),
    );
  }, [visible, query]);

  return (
    <ListPage
      action={
        <Button asChild className="min-h-11">
          <Link href={`/${locale}/admin/products/new`}>
            <PlusIcon />
            {t('product.add')}
          </Link>
        </Button>
      }
      search={{
        value: query,
        onChange: setQuery,
        placeholder: t('searchProducts'),
        // Восемьдесят семь цветовых вариантов перебором глазами — это
        // неработоспособность, а не неудобство. Счётчик говорит, сколько из
        // скольких видно, чтобы отфильтрованный список не путали с коротким.
        hint: query.trim() ? t('foundOf', {shown: filtered.length, total: visible.length}) : undefined,
      }}
      toolbar={
        testCount > 0 ? (
          <label className="flex w-fit items-center gap-2 text-[13px] text-muted-foreground">
            <Switch checked={showTest} onCheckedChange={setShowTest} />
            {t('showTestProducts', {n: testCount})}
          </label>
        ) : undefined
      }
      title={t('products')}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <BrandLoader size={32} />
        </div>
      ) : products.length === 0 ? (
        <Panel>
          <PanelEmpty>{t('product.noProducts')}</PanelEmpty>
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <PanelEmpty>{t('nothingFound')}</PanelEmpty>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-lg ring-1 ring-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t('product.title')}</TableHead>
                  {/* Раздел и коллекция прячутся на телефоне: без этого
                      таблица уезжает вбок, и владелец листает её пальцем
                      вместо того, чтобы читать. На мониторе они нужны. */}
                  <TableHead className="hidden md:table-cell">{t('product.category')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('collections')}</TableHead>
                  <TableHead className="text-right">{t('product.price')}</TableHead>
                  <TableHead className="text-right">{t('product.stockShort')}</TableHead>
                  <TableHead className="w-12 pr-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="pl-4">
                      <Link
                        className="block min-h-11 py-2 hover:underline"
                        href={`/${locale}/admin/products/${product.id}`}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate">{product.title}</span>
                          {product.isTest && <Badge variant="outline">{t('product.demo')}</Badge>}
                          {!product.active && <Badge variant="destructive">{t('inactive')}</Badge>}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {categoryLabel(product.category) ?? '—'}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {product.collectionName ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(locale, product.price)}
                    </TableCell>
                    {/* Красным — только «кончилось». «Мало» набирается тем
                        же цветом, но жирнее: сигнальный цвет значит беду, и
                        если красить им и предупреждение, беду перестанут
                        замечать. То же правило, что на дашборде. */}
                    <TableCell
                      className={
                        product.stockQuantity === 0
                          ? 'text-right font-medium text-destructive tabular-nums'
                          : product.stockQuantity <= 5
                            ? 'text-right font-medium tabular-nums'
                            : 'text-right text-muted-foreground tabular-nums'
                      }
                    >
                      {product.stockQuantity}
                    </TableCell>
                    <TableCell className="pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={t('rowActions', {name: product.title})}
                            className="size-11"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/${locale}/admin/products/${product.id}`}>
                              <PencilIcon />
                              {t('product.edit')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => handleDelete(product.id, product.title)}
                            variant="destructive"
                          >
                            <Trash2Icon />
                            {t('deleteBtn')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ListPage>
  );
}
