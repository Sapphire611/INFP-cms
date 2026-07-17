import { ReactNode } from "react";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cookies } from "next/headers";

import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const rawMode = cookieStore.get("theme_mode")?.value;
  const rawPreset = cookieStore.get("theme_preset")?.value;
  const themeMode = THEME_MODE_VALUES.includes(rawMode as ThemeMode) ? (rawMode as ThemeMode) : "light";
  const themePreset = THEME_PRESET_VALUES.includes(rawPreset as ThemePreset) ? (rawPreset as ThemePreset) : "default";

  return (
    <html
      lang="en"
      className={themeMode === "dark" ? "dark" : ""}
      data-theme-preset={themePreset}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-screen antialiased`}>
        <PreferencesStoreProvider themeMode={themeMode} themePreset={themePreset}>
          {children}
          <Toaster />
        </PreferencesStoreProvider>
      </body>
    </html>
  );
}
