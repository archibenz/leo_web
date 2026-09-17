'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon} from 'lucide-react';
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
  // Отдельный разбор: у admin уже есть свои `title` и `cancel` (например
  // admin.title — «Админ-панель»), и положи я подписи этого экрана рядом,
  // заголовок страницы молча стал бы названием всей админки.
  const tc = useTranslations('admin.careGuides');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CareGuide[]>('/api/admin/care-guides')
      .then(setGuides)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const parseSymbols = (raw: string): string[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить "${title}"?`)) return;
    try {
      await apiFetch(`/api/admin/care-guides/${id}`, {method: 'DELETE'});
      setGuides(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('[AdminCare] delete failed', err);
    }
  };

  // Подписи этого экрана заданы тернарником по локали, а не словарём. Так было
  // и до переезда; перенос строк в messages — работа про переводы, а не про
  // вид, и мешать её с переодеванием значило бы раздуть диф там, где владельцу
  // нечего смотреть. Оставлено как есть нарочно.

  return (
    <ListPage
      action={
        <Button asChild className="min-h-11">
          <Link href={`/${locale}/admin/care/new`}>
            <PlusIcon />
            {tc('add')}
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <BrandLoader size={32} />
        </div>
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
