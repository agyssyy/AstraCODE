"use client";

import { Check, Moon, Sun, Monitor } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@astracode/ui";
import { api } from "@/lib/api";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ sync = true }: { sync?: boolean }) {
  const { theme, resolved, setTheme } = useTheme();

  const choose = (next: "light" | "dark" | "system") => {
    setTheme(next);
    if (sync) {
      api.patch("/settings", { theme: next }).catch(() => {
        /* not signed in or offline — local preference still applies */
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme" className="group">
          {resolved === "dark" ? (
            <Moon className="transition-transform duration-500 group-hover:-rotate-12" />
          ) : (
            <Sun className="transition-transform duration-500 group-hover:rotate-45" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => choose("light")}>
          <Sun /> Light {theme === "light" ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => choose("dark")}>
          <Moon /> Dark {theme === "dark" ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => choose("system")}>
          <Monitor /> System {theme === "system" ? <Check className="ml-auto size-3.5" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
