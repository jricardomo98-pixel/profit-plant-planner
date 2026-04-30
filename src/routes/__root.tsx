import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Calculamus — Calculadora de custos e lucro" },
      { name: "description", content: "Calcula o custo real e o preço justo dos teus produtos. Para pequenos negócios artesanais." },
      { name: "theme-color", content: "#22c55e" },
      { property: "og:title", content: "Calculamus — Calculadora de custos e lucro" },
      { property: "og:description", content: "Sabe ao cêntimo quanto te custa produzir e quanto deves cobrar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">Voltar ao início</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-center" />
        <Scripts />
      </body>
    </html>
  );
}
