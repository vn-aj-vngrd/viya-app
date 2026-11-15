import { getItemAsync, setItemAsync } from "expo-secure-store";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Appearance, Platform } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

type ThemeName = "light" | "dark";
export type ThemePreference = ThemeName | "system";

const THEME_STORAGE_KEY = "viya.appearance.theme";

interface AppThemeContextType {
	currentTheme: ThemeName;
	hasAdaptiveThemes: boolean;
	isDark: boolean;
	isLight: boolean;
	setTheme: (theme: ThemePreference) => Promise<void>;
	themePreference: ThemePreference;
	toggleTheme: () => Promise<void>;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined
);

function isThemePreference(value: string | null): value is ThemePreference {
	return value === "system" || value === "light" || value === "dark";
}

async function getStoredThemePreference() {
	if (Platform.OS === "web") {
		const storedThemePreference =
			globalThis.localStorage?.getItem(THEME_STORAGE_KEY);

		return isThemePreference(storedThemePreference)
			? storedThemePreference
			: null;
	}

	const storedThemePreference = await getItemAsync(THEME_STORAGE_KEY);

	return isThemePreference(storedThemePreference)
		? storedThemePreference
		: null;
}

async function saveThemePreference(themePreference: ThemePreference) {
	if (Platform.OS === "web") {
		globalThis.localStorage?.setItem(THEME_STORAGE_KEY, themePreference);
		return;
	}

	await setItemAsync(THEME_STORAGE_KEY, themePreference);
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
	const { hasAdaptiveThemes, theme } = useUniwind();
	const [themePreference, setThemePreference] =
		useState<ThemePreference>("system");

	useEffect(() => {
		let isMounted = true;

		const loadThemePreference = async () => {
			try {
				const storedThemePreference = await getStoredThemePreference();

				if (!(isMounted && storedThemePreference)) {
					return;
				}

				setThemePreference(storedThemePreference);
				Uniwind.setTheme(storedThemePreference);
			} catch {
				// Keep Uniwind's default adaptive theme when storage is unavailable.
			}
		};

		loadThemePreference().catch(() => {
			// Keep Uniwind's default adaptive theme when storage is unavailable.
		});

		return () => {
			isMounted = false;
		};
	}, []);

	// Native chrome (glass toolbars, search, tab bar, keyboard, sheets) follows
	// UIKit's appearance, not Uniwind: keep both on the same scheme.
	useEffect(() => {
		Appearance.setColorScheme(
			themePreference === "system" ? "unspecified" : themePreference
		);
	}, [themePreference]);

	const isLight = useMemo(() => theme === "light", [theme]);

	const isDark = useMemo(() => theme === "dark", [theme]);

	const setTheme = useCallback(async (newTheme: ThemePreference) => {
		setThemePreference(newTheme);
		Uniwind.setTheme(newTheme);

		try {
			await saveThemePreference(newTheme);
		} catch {
			// Theme changes should still apply even if persistence fails.
		}
	}, []);

	const toggleTheme = useCallback(async () => {
		await setTheme(theme === "light" ? "dark" : "light");
	}, [setTheme, theme]);

	const value = useMemo(
		() => ({
			currentTheme: theme,
			hasAdaptiveThemes,
			isDark,
			isLight,
			setTheme,
			themePreference,
			toggleTheme,
		}),
		[
			theme,
			hasAdaptiveThemes,
			isDark,
			isLight,
			setTheme,
			themePreference,
			toggleTheme,
		]
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
