// Марка дома в админке — та же картинка, что в шапке витрины
// (/logos/name-mark-black.svg), а не слово, набранное шрифтом: 28.09 админка
// ушла на Jost целиком, а марке нужен её собственный рисунок (решение
// оркестратора). Маской поверх currentColor, как иконка свёрнутой панели
// рядом: темнеет и светлеет вместе с системной темой админки.
const MASK = 'url(/logos/name-mark-black.svg) center / contain no-repeat';

export default function Wordmark({className = ''}: {className?: string}) {
  return (
    <span
      role="img"
      aria-label="REINASLEO"
      className={`inline-block bg-current ${className}`}
      style={{aspectRatio: '1038 / 174', WebkitMask: MASK, mask: MASK}}
    />
  );
}
