import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

const themeScript = `(function(){try{var t=localStorage.getItem('astra-theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "AstraCode — Build beyond limits.",
    template: "%s · AstraCode",
  },
  description:
    "AstraCode is an open-source AI developer platform: streaming coding assistant, browser IDE, model hub, benchmarks and API playground.",
  applicationName: "AstraCode",
  keywords: ["AI", "developer platform", "coding assistant", "open source", "AstraCode"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#080d1a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <div className="liquid-atmosphere" aria-hidden="true">
          <span className="orb-a" />
          <span className="orb-b" />
          <span className="orb-c" />
        </div>
        <div className="relative z-10">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
        </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
