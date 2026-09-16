import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // `ui-accent`, а НЕ `accent`: у shadcn `accent` означает поверхность
        // наведения, у нас ключ `accent` — брендовое золото #D4A574. Из
        // коробки эти два варианта заливали кнопку золотом под курсором.
        //
        // Замерено 17.09 на /ru/admin: тумблер навигации под курсором давал
        // rgb(212, 165, 116) — то самое золото градиентной темы на экране,
        // который владелец просил сделать светлым, и на кнопке, которую он
        // жмёт с телефона.
        outline:
          "border border-input bg-background shadow-sm hover:bg-ui-accent hover:text-ui-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-ui-accent hover:text-ui-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Кнопка витрины. Заведена потому, что `accent` в теме — золото
        // градиентной админки: любой блок Efferd с `ghost`/`outline` из
        // коробки подсвечивается золотом на ховере, и каждый раз это
        // перебивали руками. Внешний вид не дублируется — вариант просто
        // надевает .wv-btn (globals.css), единственный источник правды для
        // CTA White: чернильный прямоугольник, который на ховере
        // выворачивается. .wv-btn-flat снимает радиус: пилюля хороша на
        // коротком CTA, но растянутая во всю ширину формы читается капсулой,
        // которой на витрине нет нигде. rounded-none — для twMerge, чтобы он
        // выбросил базовый rounded-md из класса.
        white: "wv-btn wv-btn-flat rounded-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        white: "min-h-[52px] px-9 py-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
