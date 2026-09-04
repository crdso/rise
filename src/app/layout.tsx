import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });

export const metadata: Metadata = {
  title: { default: "RISE", template: "%s · RISE" },
  description: "Painel pessoal: finanças, calendário, lembretes e escola.",
  manifest: "/manifest.json",
  applicationName: "RISE",
  appleWebApp: {
    capable: true,
    title: "RISE",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Dark-only: uma única cor de barra, nunca clara.
  themeColor: "#080913",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Aplica tema/densidade/movimento antes da primeira pintura.
// Sem isso haveria um frame com o tema errado. O fallback dark do CSS
// garante que nunca existe flash claro, mesmo no tema personalizado.
const NO_FLASH = `try{
var d=document.documentElement;
var t=localStorage.getItem('rise_theme')||'blurple';
d.setAttribute('data-theme',t);
var dn=localStorage.getItem('rise_density');if(dn)d.setAttribute('data-density',dn);
if(localStorage.getItem('rise_reduced_motion')==='1')d.setAttribute('data-motion','reduced');
var c=localStorage.getItem('rise_custom_theme');
if(c){var p=JSON.parse(c);if(p&&p.intensity)d.style.setProperty('--ambient-intensity',String(p.intensity));}
}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${space.variable} h-full`}>
      <head>
        <meta name="color-scheme" content="dark" />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-full antialiased overflow-x-hidden">
        <ThemeProvider>
          <ToastProvider>
            <div className="rise-ambient" aria-hidden />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
