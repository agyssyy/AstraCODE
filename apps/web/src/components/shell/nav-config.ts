import {
  BarChart3,
  BookOpen,
  Boxes,
  Code2,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Puzzle,
  Send,
  Server,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/chat", label: "Astra AI", icon: MessageSquare },
      { href: "/studio", label: "Studio", icon: Code2 },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/providers", label: "Providers", icon: Server, exact: true },
      { href: "/models", label: "Model Hub", icon: Boxes },
      { href: "/benchmark", label: "Benchmark Lab", icon: FlaskConical },
      { href: "/api", label: "API Center", icon: Send, exact: true },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/extensions", label: "Extensions", icon: Puzzle },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Resources",
    items: [{ href: "/docs", label: "Documentation", icon: BookOpen }],
  },
];

export const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Your workspace at a glance." },
  "/chat": { title: "Astra AI", description: "Streaming coding assistant." },
  "/studio": { title: "Astra Studio", description: "Edit, run and preview projects." },
  "/providers": { title: "Providers", description: "Manage provider endpoints, keys and health." },
  "/models": { title: "Model Hub", description: "Providers, models and encrypted API keys." },
  "/benchmark": { title: "Benchmark Lab", description: "Measure models on real coding tasks." },
  "/api": { title: "API Center", description: "Build, send and inspect HTTP requests." },
  "/projects": { title: "Projects", description: "Create, import and manage projects." },
  "/extensions": { title: "Extensions", description: "Templates and prompt packs." },
  "/settings": { title: "Settings", description: "Account, appearance and AI defaults." },
  "/docs": { title: "Documentation", description: "Setup, architecture and reference." },
};

export function activeFor(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const statIcon = BarChart3;
