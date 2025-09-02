"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Sun className="h-4 w-4 text-muted-foreground" />
        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors">
          <div className="h-4 w-4 rounded-full bg-background shadow-sm transition-transform" />
        </div>
        <Moon className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  const isDark = theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Sun className={cn("h-4 w-4 transition-colors", isDark ? "text-muted-foreground" : "text-yellow-500")} />
      <button
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isDark ? "bg-primary" : "bg-muted"
        )}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle theme"
      >
        <div
          className={cn(
            "h-4 w-4 rounded-full bg-background shadow-sm transition-all duration-200 flex items-center justify-center",
            isDark ? "translate-x-6" : "translate-x-1"
          )}
        >
          {isDark ? (
            <Moon className="h-2.5 w-2.5 text-blue-600" />
          ) : (
            <Sun className="h-2.5 w-2.5 text-yellow-600" />
          )}
        </div>
      </button>
      <Moon className={cn("h-4 w-4 transition-colors", isDark ? "text-blue-400" : "text-muted-foreground")} />
    </div>
  )
}