import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

export function MobileThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-3 w-3" />;
      case 'dark':
        return <Moon className="h-3 w-3" />;
      case 'system':
        return <Monitor className="h-3 w-3" />;
      default:
        return <Moon className="h-3 w-3" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
      onClick={toggleTheme}
    >
      {getThemeIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
