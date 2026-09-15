'use client';

import {Badge} from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {PanelEmpty} from './panel';

// Таблица последних заказов по образцу `dashboard-7/recent-transactions`.
// Из блока взяты устройство и плотность; поиск, флажки и меню строки не взяты
// — здесь их не к чему приложить, заказов показывается несколько последних, а
// не весь список. Они приедут в таблицу товаров, где им есть работа.

export type OrderRow = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  total: number;
  itemsCount: number;
  createdAt: string;
};

export type OrdersTableLabels = {
  client: string;
  status: string;
  sum: string;
  items: string;
  date: string;
  empty: string;
};

export function OrdersTable({
  orders,
  labels,
  statusLabel,
  formatMoney,
  formatDate,
}: {
  orders: OrderRow[];
  labels: OrdersTableLabels;
  /** Подпись статуса — словарь снаружи, чтобы таблица не знала про локали. */
  statusLabel: (status: string) => string;
  formatMoney: (value: number) => string;
  formatDate: (iso: string) => string;
}) {
  if (orders.length === 0) return <PanelEmpty>{labels.empty}</PanelEmpty>;

  return (
    <div className="-mx-4 overflow-x-auto md:-mx-5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 md:pl-5">{labels.client}</TableHead>
            <TableHead>{labels.status}</TableHead>
            <TableHead className="text-right">{labels.sum}</TableHead>
            <TableHead className="text-right">{labels.items}</TableHead>
            <TableHead className="pr-4 text-right md:pr-5">{labels.date}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="pl-4 md:pl-5">
                <div>{order.customerName}</div>
                {order.customerEmail && (
                  <div className="text-muted-foreground text-[12px]">{order.customerEmail}</div>
                )}
              </TableCell>
              <TableCell>
                {/* Красным — только «отменён». Прежний экран красил статусы
                    разноцветными пилюлями, и глаз не отличал важное от
                    обычного; правило «сигнальный цвет значит беду» принято
                    и здесь не меняется. */}
                <Badge variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}>
                  {statusLabel(order.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(order.total)}</TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {order.itemsCount}
              </TableCell>
              <TableCell className="pr-4 text-right text-muted-foreground text-[12px] md:pr-5">
                {formatDate(order.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
