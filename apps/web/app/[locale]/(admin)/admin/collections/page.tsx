'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon} from 'lucide-react';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../lib/api';
import {Badge} from '../../../../../components/ui/badge';
import {Button} from '../../../../../components/ui/button';
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
import {Notice} from '../../../../../components/admin/list/notice';

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  productCount: number;
};

export default function AdminCollectionsPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Collection[]>('/api/admin/collections')
      .then(setCollections)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('confirmDelete', {name}))) return;
    try {
      await apiFetch(`/api/admin/collections/${id}?permanent=true`, {method: 'DELETE'});
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('[AdminCollections] delete failed', err);
    }
  };

  return (
    <AdminLayout>
      <ListPage
        action={
          <Button asChild className="min-h-11">
            <Link href={`/${locale}/admin/collections/new`}>
              <PlusIcon />
              {t('collection.add')}
            </Link>
          </Button>
        }
        title={t('collections')}
      >
        {/* Коллекции на белую витрину не попадают: StorefrontResponse — это
            products + sets + sections, коллекций в нём нет, и ни одна белая
            страница /api/admin/collections не зовёт. Раздел остаётся рабочим
            для бота и старого каталога — но человек, который здесь что-то
            заведёт, ждёт этого на сайте. Говорим заранее. */}
        <Notice>{t('collection.notOnSiteNotice')}</Notice>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : collections.length === 0 ? (
          <Panel>
            <PanelEmpty>{t('collection.noCollections')}</PanelEmpty>
          </Panel>
        ) : (
          <div className="overflow-hidden rounded-lg ring-1 ring-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t('collection.name')}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t('collection.description')}
                    </TableHead>
                    <TableHead className="text-right">{t('collection.productCount')}</TableHead>
                    <TableHead className="w-12 pr-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map(col => (
                    <TableRow key={col.id}>
                      <TableCell className="pl-4">
                        <Link
                          className="block min-h-11 py-2 hover:underline"
                          href={`/${locale}/admin/collections/${col.id}`}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate">{col.name}</span>
                            {!col.active && <Badge variant="destructive">{t('inactive')}</Badge>}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                        {col.description || '—'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {col.productCount}
                      </TableCell>
                      <TableCell className="pr-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={t('rowActions', {name: col.name})}
                              className="size-11"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/${locale}/admin/collections/${col.id}`}>
                                <PencilIcon />
                                {t('collection.edit')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => handleDelete(col.id, col.name)}
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
    </AdminLayout>
  );
}
