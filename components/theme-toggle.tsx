"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ORDER = ["dark", "light", "system"] as const;
type Mode = (typeof ORDER)[number];

const ICONS: Record<Mode, typeof Moon> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

const LABELS: Record<Mode, string> = {
  dark: "Mode sombre — clic : passer en clair",
  light: "Mode clair — clic : passer au système",
  system: "Système — clic : passer en sombre",
};

/**
 * Bouton flottant haut-droite qui cycle entre 3 modes :
 *   dark → light → system → dark ...
 *
 * - Mounted-only render pour éviter le mismatch SSR (next-themes ne
 *   connaît pas le thème côté serveur).
 * - L'icône reflète le thème *demandé* (theme), pas le thème *résolu*
 *   (resolvedTheme), pour que l'utilisateur sache où il a positionné
 *   le toggle même quand "system" donne le même rendu que "dark".
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Pendant l'hydratation : on rend un placeholder de la même taille
  // pour préserver le layout, mais sans icône (évite le flicker).
  if (!mounted) {
    return <div aria-hidden className="size-9 rounded-full" />;
  }

  const current = (ORDER.includes(theme as Mode) ? theme : "system") as Mode;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
  const Icon = ICONS[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={LABELS[current]}
      title={LABELS[current]}
      className={cn(
        "inline-flex size-9 items-center justify-center",
        "rounded-full border border-border/60 bg-card/80 text-muted-foreground",
        "shadow-sm backdrop-blur transition-colors",
        "hover:border-foreground/30 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
