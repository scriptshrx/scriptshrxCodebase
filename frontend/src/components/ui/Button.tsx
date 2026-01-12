import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "glass" | "ghost" | "outline"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "default", ...props }, ref) => {

        const variants = {
            primary: "bg-gradient-to-r from-primary-start to-primary-end text-white hover:opacity-90 shadow-lg shadow-primary-start/25",
            secondary: "bg-secondary text-white hover:bg-secondary/90",
            glass: "glass hover:bg-white/10 text-white",
            ghost: "hover:bg-white/5 text-white/80 hover:text-white",
            outline: "border-2 border-slate-200 bg-transparent hover:bg-slate-50 text-slate-900"
        }

        const sizes = {
            default: "h-11 px-6 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-14 rounded-full px-8 text-lg",
            icon: "h-10 w-10 p-2 items-center justify-center flex"
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-start disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
