import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-10 h-10 rounded-full border border-border/50 bg-background/60 backdrop-blur-md shadow-sm hover:bg-accent hover:text-accent-foreground transition-all duration-500 overflow-hidden"
      aria-label="Toggle theme"
    >
      <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ${isDark ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <Sun className="h-5 w-5 text-amber-500 drop-shadow-sm transition-transform duration-500 hover:rotate-45" />
      </div>
      <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ${isDark ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <Moon className="h-5 w-5 text-blue-500 drop-shadow-sm transition-transform duration-500 hover:-rotate-12" />
      </div>
    </Button>
  )
}
