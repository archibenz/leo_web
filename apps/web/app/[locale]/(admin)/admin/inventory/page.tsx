'use client';

import {useState, useEffect, useMemo} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from '@/components/loading/LoadingLink';
import {CheckIcon, XIcon} from 'lucide-react';
import {PageSkeleton} from '@/components/loading/PageSkeleton';
import {usePageLoading} from '@/components/loading/PageLoadingProvider';
import {apiFetch} from '../../../../../lib/api';
import {Button} from '../../../../../components/ui/button';
import {Input} from '../../../../../components/ui/input';
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
  stockQuantity: number;
  lowStockThreshold: number;
  isTest: boolean;
  active: boolean;
};

export default function AdminInventoryPage() {
  const t = useTranslations('admin');
  const ui = useTranslations('admin.ui');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stockError, setStockError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [query, setQuery] = useState('');

  usePageLoading(loading);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    apiFetch<Product[]>('/api/admin/products')
      .then(data => {
        if (active) setProducts(data.filter(p => p.active && !p.isTest));
      })
      .catch(() => {if (active) setLoadFailed(true);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [loadAttempt]);

  const handleUpdateStock = async (id: string) => {
    if (savingId) return;
    setSavingId(id);
    setStockError(false);
    try {
      const updated = await apiFetch<Product>(`/api/admin/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({quantity: editValue}),
      });
      setProducts(prev => prev.map(p => p.id === id ? {...p, stockQuantity: updated.stockQuantity} : p));
      setEditingId(null);
    } catch {
      setStockError(true);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(p => p.title.toLowerCase().includes(needle));
  }, [products, query]);

  return (
    <ListPage
      search={{
        value: query,
        onChange: setQuery,
        placeholder: t('searchProducts'),
        hint: query.trim() ? t('foundOf', {shown: filtered.length, total: products.length}) : undefined,
      }}
      title={t('inventory')}
    >
      {loading ? (
        <PageSkeleton kind="admin-table" embedded />
      ) : loadFailed ? (
        <Panel><p role="alert" className="mb-4 text-[13px]">{ui('loadFailed')}</p><Button className="min-h-11" onClick={() => setLoadAttempt(value => value + 1)}>{ui('retry')}</Button></Panel>
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
                  <TableHead className="w-48 pr-4 text-right">{t('product.stockShort')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(product => {
                  const editing = editingId === product.id;
                  const gone = product.stockQuantity === 0;
                  const low = !gone && product.stockQuantity <= product.lowStockThreshold;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="pl-4">
                        <Link
                          className="block min-h-11 py-2 hover:underline"
                          href={`/${locale}/admin/products/${product.id}`}
                        >
                          <span className="truncate">{product.title}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="pr-4">
                        {editing ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              aria-label={ui('stockLabel', {name: product.title})}
                              aria-describedby={stockError ? `stock-error-${product.id}` : undefined}
                              disabled={savingId === product.id}
                              autoFocus
                              className="h-11 w-20 text-center tabular-nums"
                              inputMode="numeric"
                              onChange={e => {setEditValue(parseInt(e.target.value) || 0); setStockError(false);}}
                              type="number"
                              value={editValue}
                            />
                            <Button
                              aria-label={t('ok')}
                              disabled={savingId === product.id}
                              aria-busy={savingId === product.id}
                              className="size-11"
                              onClick={() => handleUpdateStock(product.id)}
                              size="icon"
                            >
                              <CheckIcon />
                            </Button>
                            <Button
                              aria-label={t('cancel')}
                              disabled={savingId === product.id}
                              className="size-11"
                              onClick={() => {setEditingId(null); setStockError(false);}}
                              size="icon"
                              variant="ghost"
                            >
                              <XIcon />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            {/* Красным — только «кончилось». «Мало» тем же
                                цветом, но жирнее: если красить сигнальным и
                                предупреждение, беду перестанут замечать.
                                Прежде «мало» было жёлтым, и на белом фоне
                                жёлтый почти не читался. */}
                            <span
                              className={
                                gone
                                  ? 'text-lg font-medium text-destructive tabular-nums'
                                  : low
                                    ? 'text-lg font-medium tabular-nums'
                                    : 'text-lg text-muted-foreground tabular-nums'
                              }
                            >
                              {product.stockQuantity}
                            </span>
                            <Button
                              disabled={savingId !== null}
                              className="min-h-11"
                              onClick={() => {
                                setStockError(false);
                                setEditingId(product.id);
                                setEditValue(product.stockQuantity);
                              }}
                              size="sm"
                              variant="outline"
                            >
                              {t('product.updateStock')}
                            </Button>
                          </div>
                        )}
                        {editing && stockError && <p id={`stock-error-${product.id}`} role="alert" className="mt-2 text-right text-[13px] text-destructive">{ui('stockFailed')}</p>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </ListPage>
  );
}
