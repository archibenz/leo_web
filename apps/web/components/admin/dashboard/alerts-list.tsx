'use client';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {PanelEmpty} from './panel';

// Уведомления склада. Поведение прежнее дословно: нажатие гасит уведомление
// через ту же ручку, список тот же. Изменён только вид.

export type StockAlert = {
  id: string;
  productTitle: string;
  alertType: string;
  currentStock: number;
};

export function AlertsList({
  alerts,
  labels,
  onAcknowledge,
}: {
  alerts: StockAlert[];
  labels: {outOfStock: string; lowStock: string; current: string; acknowledge: string; empty: string};
  onAcknowledge: (id: string) => void;
}) {
  if (alerts.length === 0) return <PanelEmpty>{labels.empty}</PanelEmpty>;

  return (
    <ul className="divide-y">
      {alerts.map((alert) => {
        const gone = alert.alertType === 'out_of_stock';
        return (
          <li className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={alert.id}>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Сигнальный цвет — только «кончилось». «Мало» это повод
                    заказать, а не беда: покрась мы оба красным, беду
                    перестали бы замечать. */}
                <Badge variant={gone ? 'destructive' : 'secondary'}>
                  {gone ? labels.outOfStock : labels.lowStock}
                </Badge>
                <span className="truncate text-[13px]">{alert.productTitle}</span>
              </div>
              <p className="text-muted-foreground text-[12px]">
                {labels.current}: <span className="tabular-nums">{alert.currentStock}</span>
              </p>
            </div>
            {/* min-h-11 — наш порог зоны нажатия: владелец гасит уведомления
                с телефона. */}
            <Button
              className="min-h-11 shrink-0"
              onClick={() => onAcknowledge(alert.id)}
              size="sm"
              variant="outline"
            >
              {labels.acknowledge}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
