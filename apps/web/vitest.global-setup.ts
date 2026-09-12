import {execFileSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Список слагов для edge генерируется, в git его нет, а middleware.ts
// импортирует его статически — без файла не соберётся ни один тест, который
// трогает мидлварь. Здесь режим `--allow-stub`: API поднят — список настоящий,
// API нет (чистый клон, CI job `web`) — валидный модуль с пустым списком.
//
// Пустой список для тестов не бутафория: на нём middleware обязана пропускать
// товарные адреса, и `lib/__tests__/middleware.test.ts` именно это и проверяет.
export default function setup(): void {
  const root = dirname(fileURLToPath(import.meta.url));
  execFileSync(
    process.execPath,
    [join(root, 'scripts', 'generate-product-slugs.mjs'), '--allow-stub'],
    {stdio: 'inherit'},
  );
}
