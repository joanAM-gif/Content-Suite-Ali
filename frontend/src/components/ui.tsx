import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/* -------------------------------- Button -------------------------------- */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "success" | "danger"
type Size = "sm" | "md" | "lg"

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring",
  secondary:
    "bg-muted text-foreground hover:bg-border focus-visible:ring-ring",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring",
  success:
    "bg-success text-success-foreground hover:brightness-95 focus-visible:ring-success",
  danger:
    "bg-danger text-danger-foreground hover:brightness-95 focus-visible:ring-danger",
}

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
)
Button.displayName = "Button"

/* --------------------------------- Card --------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm shadow-black/[0.03]",
        className,
      )}
    >
      {children}
    </div>
  )
}

/* -------------------------------- Labels -------------------------------- */

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </label>
  )
}

/* -------------------------------- Inputs -------------------------------- */

const fieldBase =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />
  ),
)
Input.displayName = "Input"

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-24 resize-y", className)} {...props} />
  ),
)
Textarea.displayName = "Textarea"

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = "Select"

/* --------------------------------- Field -------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* --------------------------------- Badge -------------------------------- */

type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning"

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success-muted text-success",
  danger: "bg-danger-muted text-danger",
  warning: "bg-[oklch(0.96_0.06_75)] text-[oklch(0.5_0.13_60)]",
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* -------------------------------- Spinner ------------------------------- */

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label && <span>{label}</span>}
    </div>
  )
}
