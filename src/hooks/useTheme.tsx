import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface PartnerBranding {
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  partnerBranding: PartnerBranding | null;
  setPartnerBranding: (branding: PartnerBranding | null) => void;
  clearPartnerBranding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const hexToHSL = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const applyBrandingCSS = (branding: PartnerBranding | null) => {
  const root = document.documentElement;
  if (!branding) {
    // Reset to defaults
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-dark');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--gradient-primary');
    return;
  }

  const primaryHSL = hexToHSL(branding.primary_color);
  const accentHSL = hexToHSL(branding.accent_color);

  // Parse primary to darken
  const parts = primaryHSL.split(' ');
  const hue = parts[0];
  const sat = parts[1];
  const lightness = parseInt(parts[2]);
  const darkPrimaryHSL = `${hue} ${sat} ${Math.max(lightness - 15, 10)}%`;

  root.style.setProperty('--primary', primaryHSL);
  root.style.setProperty('--primary-dark', darkPrimaryHSL);
  root.style.setProperty('--accent', accentHSL);
  root.style.setProperty('--ring', primaryHSL);
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${darkPrimaryHSL}))`);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [partnerBranding, setPartnerBrandingState] = useState<PartnerBranding | null>(() => {
    try {
      const stored = localStorage.getItem('partner_branding');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    applyBrandingCSS(partnerBranding);
  }, [partnerBranding]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setPartnerBranding = useCallback((branding: PartnerBranding | null) => {
    setPartnerBrandingState(branding);
    if (branding) {
      localStorage.setItem('partner_branding', JSON.stringify(branding));
    } else {
      localStorage.removeItem('partner_branding');
    }
  }, []);

  const clearPartnerBranding = useCallback(() => {
    setPartnerBrandingState(null);
    localStorage.removeItem('partner_branding');
    applyBrandingCSS(null);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, partnerBranding, setPartnerBranding, clearPartnerBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
