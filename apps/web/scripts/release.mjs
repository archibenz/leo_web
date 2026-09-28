import {execSync} from 'node:child_process';

// Релиз сборки для отчётов об ошибках (lib/clientErrors.ts, lib/earlyErrors.ts,
// instrumentation.ts читают NEXT_PUBLIC_RELEASE). Прежде его не задавал никто,
// и в аналитику ошибки приходили с release=unknown — не понять, какая сборка
// упала (28.09, React #418 на /ru).
//
// Короткий sha коммита, 12 знаков — ровно имя папки релиза на сервере
// (/opt/reinasleo/web-releases/<sha12>, scripts/deploy-web.sh). Явный
// NEXT_PUBLIC_RELEASE в окружении сборки побеждает. Вне git-рабочей копии
// (Docker без .git) — пусто: отчёт уйдёт без релиза, а не с выдумкой.
/**
 * @param {Record<string, string | undefined>} [env]
 * @param {(command: string, options: object) => {toString(): string}} [run]
 * @returns {string}
 */
export function buildRelease(env = process.env, run = execSync) {
  const explicit = env.NEXT_PUBLIC_RELEASE?.trim();
  if (explicit) return explicit;
  try {
    const sha = run('git rev-parse --short=12 HEAD', {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim();
    return /^[0-9a-f]{12}$/.test(sha) ? sha : '';
  } catch {
    return '';
  }
}
