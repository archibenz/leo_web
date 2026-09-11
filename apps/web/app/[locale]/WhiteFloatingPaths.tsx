import {INK} from './wv-palette';

// Плавающие линии из блока auth-5. Геометрия кривых взята из блока дословно —
// ради неё он и выбран. Движение переписано: у Efferd это 36 <motion.path> на
// `motion/react`, которые покадрово гонят pathLength/pathOffset из JS. Здесь
// то же самое делает CSS: атрибут pathLength="1" нормирует длину любой кривой
// к единице, поэтому один общий @keyframes (`wv-paths` в globals.css) гоняет
// штрих длиной в эту единицу по всем путям сразу. Ни библиотеки, ни runtime —
// и при prefers-reduced-motion линии просто стоят нарисованными.
//
// Плотность своя: у блока непрозрачность доходит до 1.15 (сплошная заливка на
// их тёмной панели), у нас потолок 0.9, и поверх него ещё дышит общая
// непрозрачность 0.3–0.6 из кадров — на FOOT выходит волосяная линия White,
// а не жирный штрих.

const COUNT = 36;

// `fill` — для узкой полосы на телефоне: по умолчанию SVG вписывается целиком
// и в низкой коробке съёживается по ширине, а `slice` заполняет её и обрезает
// кривые сверху и снизу. На боковой панели остаётся вписывание, как у блока.
export default function WhiteFloatingPaths({position, fill = false}: {position: number; fill?: boolean}) {
  const paths = Array.from({length: COUNT}, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    opacity: 0.12 + i * 0.022,
    width: 0.5 + i * 0.03,
    // Детерминированно, а не Math.random(): у блока случайная длительность
    // считается и на сервере, и в браузере — разметка расходится и React
    // ругается на гидрацию. Диапазон тот же, 20–30 с.
    duration: 20 + (i % 11),
    delay: -(i * 0.9),
  }));

  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 696 316"
      preserveAspectRatio={fill ? 'xMidYMid slice' : undefined}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((path) => (
        <path
          className="wv-path"
          d={path.d}
          key={path.id}
          pathLength={1}
          stroke={INK}
          strokeOpacity={path.opacity}
          strokeWidth={path.width}
          style={{animationDuration: `${path.duration}s`, animationDelay: `${path.delay}s`}}
        />
      ))}
    </svg>
  );
}
