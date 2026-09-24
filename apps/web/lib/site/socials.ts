import {API_BASE} from '../api';

// Соцсети сайта — один список на подвал, страницу контактов и разметку для
// поисковиков. Правит владелец в админке (/admin/socials), пишет и проверяет
// API (SiteSocialsService: только https и домен своей сети). До 24.09.2026
// адреса были вписаны в код, и подвал с контактами расходились.

export type SocialNetwork = 'instagram' | 'telegram' | 'vk';
export type SocialLink = {network: SocialNetwork; href: string};

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  vk: 'VK',
};

const HOSTS: Record<SocialNetwork, readonly string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  telegram: ['t.me'],
  vk: ['vk.com', 'm.vk.com', 'vk.ru'],
};

// Для режима без API (CATALOGUE_SOURCE=fixture): те три, что стояли на сайте
// до 24.09, — ровно то, что лежит в базе, пока владелец ничего не сохранял.
export const FIXTURE_SOCIALS: readonly SocialLink[] = [
  {network: 'instagram', href: 'https://instagram.com/reinasleo'},
  {network: 'telegram', href: 'https://t.me/reinasleo'},
  {network: 'vk', href: 'https://vk.com/reinasleo'},
];

// Ответ API — внешние данные. Проверка та же, что на записи: сеть из списка и
// https-адрес её домена. Что не прошло — не показываем, а не показываем как есть.
export function toSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const {network, href} = item as {network?: unknown; href?: unknown};
    if (typeof network !== 'string' || typeof href !== 'string' || !(network in HOSTS)) continue;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    const net = network as SocialNetwork;
    if (url.protocol !== 'https:' || !HOSTS[net].includes(url.hostname) || url.username || url.port) continue;
    if (out.some((l) => l.network === net)) continue;
    out.push({network: net, href});
  }
  return out;
}

// Недоступен API — соцсетей не показываем. Показать выключенную владельцем
// ссылку было бы неправдой, а подвал без значков — просто подвал.
export async function getSocials(): Promise<SocialLink[]> {
  if (process.env.CATALOGUE_SOURCE === 'fixture') return [...FIXTURE_SOCIALS];
  try {
    const res = await fetch(`${API_BASE}/api/site/socials`, {next: {revalidate: 600, tags: ['storefront']}});
    if (!res.ok) return [];
    return toSocialLinks(await res.json());
  } catch {
    return [];
  }
}

// Подпись на странице контактов: «@reinasleo» для Telegram и Instagram,
// «vk.com/reinasleo» для VK — как было вписано раньше.
export function socialHandle(link: SocialLink): string {
  const url = new URL(link.href);
  const path = url.pathname.replace(/\/+$/, '');
  return link.network === 'vk' ? `${url.hostname}${path}` : `@${path.replace(/^\//, '')}`;
}
