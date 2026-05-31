import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
} from "react";
import { Uniwind } from "uniwind";

const FORCED_THEME = "light" as const;

type ThemeName = typeof FORCED_THEME;
export type ThemePreference = ThemeName;

Uniwind.setTheme(FORCED_THEME);

interface AppThemeContextType {
	currentTheme: ThemeName;
	hasAdaptiveThemes: boolean;
	isDark: boolean;
	isLight: boolean;
	themePreference: ThemePreference;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined
);

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
	useEffect(() => {
		Uniwind.setTheme(FORCED_THEME);
	}, []);

	const value = useMemo(
		() => ({
			currentTheme: FORCED_THEME,
			hasAdaptiveThemes: false,
			isDark: false,
			isLight: true,
			themePreference: FORCED_THEME,
		}),
		[]
	);

	return (
		<AppThemeContext.Provider value={value}>
			{children}
		</AppThemeContext.Provider>
	);
};

export function useAppTheme() {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
}
