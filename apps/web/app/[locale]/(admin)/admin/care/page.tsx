'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {MoreHorizontalIcon, PencilIcon, Trash2Icon} from 'lucide-react';
import BrandLoader from '../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../lib/api';
import {CareSymbolsRow} from '../../../../../components/CareSymbols';
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

type CareGuide = {
  id: string;
  title: string;
  description: string | null;
  careSymbols: string;
  sortOrder: number;
  active: boolean;
};

export default function AdminCarePage() {
  const t = useTranslations('admin');
  const ui = useTranslations('admin.ui');
  // Отдельный разбор: у admin уже есть свои `title` и `cancel` (например
  // admin.title — «Админ-панель»), и положи я подписи этого экрана рядом,
  // заголовок страницы молча стал бы названием всей админки.
  const tc = useTranslations('admin.careGuides');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    apiFetch<CareGuide[]>('/api/admin/care-guides')
      .then(data => {if (active) setGuides(data);})
      .catch(() => {if (active) setLoadFailed(true);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [loadAttempt]);

  const parseSymbols = (raw: string): string[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  const handleDelete = async (id: string, title: string) => {
    if (deletingIds.includes(id) || !confirm(t('confirmDelete', {name: title}))) return;
    setDeleteError(null);
    setDeletingIds(ids => [...ids, id]);
    try {
      await apiFetch(`/api/admin/care-guides/${id}`, {method: 'DELETE'});
      setGuides(prev => prev.filter(g => g.id !== id));
    } catch {
      setDeleteError(ui('deleteFailed', {name: title}));
    } finally {
      setDeletingIds(ids => ids.filter(value => value !== id));
    }
  };

  // Подписи этого экрана заданы тернарником по локали, а не словарём. Так было
  // и до переезда; перенос строк в messages — работа про переводы, а не про
  // вид, и мешать её с переодеванием значило бы раздуть диф там, где владельцу
  // нечего смотреть. Оставлено как есть нарочно.

  return (
    <ListPage
      action={
        <Button asChild variant="owner" size="owner">
          <Link href={`/${locale}/admin/care/new`}>
            <span>{tc('add')}</span>
          </Link>
        </Button>
      }
      title={tc('title')}
    >
      {/* Справочники ухода на сайт не попадают. Ручка /api/care-guides их
          отдаёт, но читает её только components/CarePageClient.tsx, который
          подключён лишь из gradient-archive; живая /care берёт текст из
          messages (white.info.care.sections). То есть здесь можно писать
          час, и на сайте не изменится ничего. */}
      <Notice>
        {tc('notShownNotice')}
      </Notice>

      {deleteError && <p role="alert" className="text-[13px] text-destructive">{deleteError}</p>}
      {loading ? (
        <div role="status" aria-label={ui('loading')} className="flex items-center justify-center py-20">
          <BrandLoader size={32} />
        </div>
      ) : loadFailed ? (
        <Panel><p role="alert" className="mb-4 text-[13px]">{ui('loadFailed')}</p><Button className="min-h-11" onClick={() => setLoadAttempt(value => value + 1)}>{ui('retry')}</Button></Panel>
      ) : guides.length === 0 ? (
        <Panel>
          <PanelEmpty>{tc('empty')}</PanelEmpty>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-lg ring-1 ring-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 pl-4">№</TableHead>
                  <TableHead>{tc('colTitle')}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {tc('colSymbols')}
                  </TableHead>
                  <TableHead className="w-12 pr-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map(guide => {
                  const symbols = parseSymbols(guide.careSymbols);
                  return (
                    <TableRow key={guide.id}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">
                        {guide.sortOrder}
                      </TableCell>
                      <TableCell>
                        <Link
                          className="block min-h-11 py-2 hover:underline"
                          href={`/${locale}/admin/care/${guide.id}`}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate">{guide.title}</span>
                            {!guide.active && (
                              <Badge variant="destructive">{t('inactive')}</Badge>
                            )}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {symbols.length > 0 ? (
                          <CareSymbolsRow locale={locale} size={20} symbols={symbols} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={t('rowActions', {name: guide.title})}
                              disabled={deletingIds.includes(guide.id)}
                              aria-busy={deletingIds.includes(guide.id)}
                              className="size-11"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/${locale}/admin/care/${guide.id}`}>
                                <PencilIcon />
                                {tc('edit')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => handleDelete(guide.id, guide.title)}
                              variant="destructive"
                            >
                              <Trash2Icon />
                              {t('deleteBtn')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
