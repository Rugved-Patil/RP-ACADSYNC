export type ThemeId =
  | "linen-olive"
  | "slate-sage"
  | "terracotta-dune"
  | "nocturne-olive"
  | "espresso-oat"
  | "indigo-parchment"
  | "burgundy-tweed"
  | "nordic-moss";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  type: "light" | "dark";
  subtitle: string;
  description: string;
  previewColors: {
    paper: string;
    card: string;
    primary: string;
    secondary: string;
    accent: string;
    ink: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "linen-olive",
    name: "Warm Linen & Olive",
    type: "light",
    subtitle: "Default Signature Artisan",
    description: "Warm, tactile artisan linen with classic deep Mediterranean olive tones.",
    previewColors: {
      paper: "#E8DDC8",
      card: "#F5F0E5",
      primary: "#596044",
      secondary: "#7B8061",
      accent: "#A4775C",
      ink: "#303329",
    },
  },
  {
    id: "slate-sage",
    name: "Cool Slate & Sage",
    type: "light",
    subtitle: "Cool Editorial Botanic",
    description: "Cool misty parchment balanced with soothing Scandinavian pine and sage botanicals.",
    previewColors: {
      paper: "#DFE5E0",
      card: "#F0F5F1",
      primary: "#486350",
      secondary: "#6B8874",
      accent: "#C07D3E",
      ink: "#222E25",
    },
  },
  {
    id: "terracotta-dune",
    name: "Terracotta & Dune",
    type: "light",
    subtitle: "Desert Warmth & Clay",
    description: "Sun-drenched desert clay, warm sand dunes, and rich earthenware ceramics.",
    previewColors: {
      paper: "#EFE4D6",
      card: "#FAF5EE",
      primary: "#8C4A32",
      secondary: "#756D54",
      accent: "#BA5D3F",
      ink: "#382B24",
    },
  },
  {
    id: "nocturne-olive",
    name: "Nocturne Olive",
    type: "dark",
    subtitle: "Dark Studio Mode",
    description: "Deep obsidian charcoal canvas with glowing sage-olive highlights for late-night scheduling.",
    previewColors: {
      paper: "#1A1D17",
      card: "#242820",
      primary: "#8EA473",
      secondary: "#6B7D57",
      accent: "#D4956B",
      ink: "#EAE3D2",
    },
  },
  {
    id: "espresso-oat",
    name: "Espresso & Oat",
    type: "light",
    subtitle: "Rich Roast Minimalist",
    description: "Cashmere oatmeal surfaces with rich dark roast coffee and toasted hazelnut undertones.",
    previewColors: {
      paper: "#E5DDD1",
      card: "#F6F1EA",
      primary: "#4A3528",
      secondary: "#7A5C47",
      accent: "#9C6644",
      ink: "#2C1E16",
    },
  },
  {
    id: "indigo-parchment",
    name: "Indigo & Parchment",
    type: "light",
    subtitle: "Oxford Tailored Navy",
    description: "Crisp Oxford cloth paper, tailored chambray, and deep midnight navy blue.",
    previewColors: {
      paper: "#E2E6EC",
      card: "#F2F5F9",
      primary: "#2B4468",
      secondary: "#4E688E",
      accent: "#B86B35",
      ink: "#1C293D",
    },
  },
  {
    id: "burgundy-tweed",
    name: "Burgundy & Tweed",
    type: "light",
    subtitle: "Heritage Bordeaux Rose",
    description: "Heathered rose tweed texture with deep vintage Bordeaux wine and crimson wax seals.",
    previewColors: {
      paper: "#E9DFDF",
      card: "#F7F2F2",
      primary: "#6E2E39",
      secondary: "#8A4854",
      accent: "#A85A48",
      ink: "#33181C",
    },
  },
  {
    id: "nordic-moss",
    name: "Nordic Moss & Pine",
    type: "dark",
    subtitle: "Deep Twilight Forest",
    description: "Dense spruce twilight forest with vivid emerald moss and glowing amber highlights.",
    previewColors: {
      paper: "#161F1A",
      card: "#1F2C24",
      primary: "#76A786",
      secondary: "#537A60",
      accent: "#D99B52",
      ink: "#E4EDE7",
    },
  },
];

const THEME_STORAGE_KEY = "acadsync-active-theme";

class ThemeService {
  private currentTheme: ThemeId = "linen-olive";
  private listeners: Array<(theme: ThemeId) => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (stored && THEMES.some((t) => t.id === stored)) {
        this.currentTheme = stored;
      }
      this.applyTheme(this.currentTheme);
    }
  }

  public getTheme(): ThemeId {
    return this.currentTheme;
  }

  public getThemeDefinition(id?: ThemeId): ThemeDefinition {
    const target = id || this.currentTheme;
    return THEMES.find((t) => t.id === target) || THEMES[0];
  }

  public setTheme(theme: ThemeId): void {
    if (!THEMES.some((t) => t.id === theme)) return;
    this.currentTheme = theme;
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      this.applyTheme(theme);
      this.notifyListeners();
    }
  }

  private applyTheme(theme: ThemeId): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    
    const themeDef = this.getThemeDefinition(theme);
    if (themeDef.type === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  public subscribe(listener: (theme: ThemeId) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentTheme));
  }
}

export const themeService = new ThemeService();
