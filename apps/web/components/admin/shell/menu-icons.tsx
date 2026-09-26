import type {LucideIcon} from 'lucide-react';
import {
  Bell,
  BookOpen,
  CalendarRange,
  ChartLine,
  Database,
  Filter,
  Flag,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Library,
  ListChecks,
  Package,
  Pencil,
  Ruler,
  Sheet,
  Shield,
  Snowflake,
  Store,
  Wallet,
  Warehouse,
} from 'lucide-react';

// Имена иконок из общего menu.json → компоненты lucide. Белый список, а не
// динамический импорт по имени: неизвестное имя должно краснеть в тесте
// (lib/nav/__tests__/menu.test.ts), а не молча рисовать пустое место. Такой же
// список держит аналитика.
export const MENU_ICONS: Readonly<Record<string, LucideIcon>> = {
  bell: Bell,
  'book-open': BookOpen,
  'calendar-range': CalendarRange,
  'chart-line': ChartLine,
  database: Database,
  filter: Filter,
  flag: Flag,
  'flask-conical': FlaskConical,
  globe: Globe,
  'layout-dashboard': LayoutDashboard,
  library: Library,
  'list-checks': ListChecks,
  package: Package,
  pencil: Pencil,
  ruler: Ruler,
  sheet: Sheet,
  shield: Shield,
  snowflake: Snowflake,
  store: Store,
  wallet: Wallet,
  warehouse: Warehouse,
};

export function MenuIcon({name}: {name?: string}) {
  const Icon = name ? MENU_ICONS[name] : undefined;
  return Icon ? <Icon /> : null;
}
