import { Link, useLocation } from "react-router-dom";
import { Home, Search, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/usePlayerStore";

const MobileNav = () => {
  const location = useLocation();
  const { currentSong } = usePlayerStore();
  
  // Check if we have an active song to add padding to the bottom nav
  const hasActiveSong = !!currentSong;

  const navItems = [
    {
      label: "Home",
      icon: Home,
      path: "/",
    },
    {
      label: "Search",
      icon: Search,
      path: "/search",
    },
    {
      label: "Your Library",
      icon: Library,
      path: "/library",
    }
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    // Treat liked-songs as part of the library
    if (path === "/library" && (location.pathname.startsWith("/liked-songs") || location.pathname === "/library")) return true;
    return false;
  };

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 md:hidden",
        hasActiveSong ? "pb-16" : ""
      )}
    >
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center space-y-1",
              isActive(item.path) 
                ? "text-white" 
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileNav; 