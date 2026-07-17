"use client";

import { PaintBucket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { updateThemeMode, updateThemePreset } from "@/lib/theme-utils";
import { setCookie } from "@/lib/cookie-actions";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { THEME_PRESET_OPTIONS, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

export function ThemeSettings() {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);

  const handleThemeMode = async (value: string) => {
    if (!value) return;
    updateThemeMode(value as "light" | "dark");
    setThemeMode(value as ThemeMode);
    await setCookie("theme_mode", value);
  };

  const handlePreset = async (value: string) => {
    updateThemePreset(value);
    setThemePreset(value as ThemePreset);
    await setCookie("theme_preset", value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <PaintBucket className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium">主题设置</h4>
            <p className="text-muted-foreground text-xs">自定义配色和外观</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">配色方案</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {THEME_PRESET_OPTIONS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePreset(preset.value)}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted transition-colors"
                >
                  <span
                    className={`h-6 w-6 rounded-full ring-offset-1 ${
                      themePreset === preset.value ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      backgroundColor: themeMode === "dark" ? preset.primary.dark : preset.primary.light,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">外观模式</Label>
            <ToggleGroup
              className="w-full"
              size="sm"
              variant="outline"
              type="single"
              value={themeMode}
              onValueChange={handleThemeMode}
            >
              <ToggleGroupItem className="text-xs flex-1" value="light">
                浅色
              </ToggleGroupItem>
              <ToggleGroupItem className="text-xs flex-1" value="dark">
                深色
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
