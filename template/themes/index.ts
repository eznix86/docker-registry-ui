import type { Theme } from "@mui/material/styles";
import type { ThemeName } from "./types";

export type { ThemeName, Colors } from "./types";

const themeFactories: Record<ThemeName, () => Promise<Theme>> = {
    "the-hub-dark": () => import("./the-hub-dark").then(m => m.BaseTheme),
    "the-hub-light": () => import("./the-hub-light").then(m => m.BaseTheme),
    monokai: () => import("./monokai").then(m => m.BaseTheme),
    "nord-dark": () => import("./nord-dark").then(m => m.BaseTheme),
    "nord-light": () => import("./nord-light").then(m => m.BaseTheme),
    "one-dark": () => import("./one-dark").then(m => m.BaseTheme),
    "tokyo-night": () => import("./tokyo-night").then(m => m.BaseTheme),
    cyberpunk: () => import("./cyberpunk").then(m => m.BaseTheme),
};

const themeCache = new Map<ThemeName, Theme>();

export async function withTheme(themeName: ThemeName): Promise<Theme> {
    if (themeCache.has(themeName)) {
        return themeCache.get(themeName)!;
    }

    const theme = await themeFactories[themeName]();
    themeCache.set(themeName, theme);
    return theme;
}
