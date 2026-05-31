import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

describe("profile light mode contract", () => {
	it("keeps profile settings from exposing appearance controls", () => {
		const source = readWorkspaceFile(
			"apps/native/app/(app)/(tabs)/profile.tsx"
		);

		expect(source).not.toContain('title="Appearance"');
		expect(source).not.toContain(
			"<BottomSheet.Title>Appearance</BottomSheet.Title>"
		);
		expect(source).not.toContain("setIsAppearanceSheetOpen");
		expect(source).not.toContain("ThemeOptionRow");
	});

	it("forces the app theme to light regardless of system or stored preference", () => {
		const source = readWorkspaceFile(
			"apps/native/contexts/app-theme-context.tsx"
		);

		expect(source).toContain('const FORCED_THEME = "light" as const;');
		expect(source).toContain("Uniwind.setTheme(FORCED_THEME)");
		expect(source).toContain("currentTheme: FORCED_THEME");
		expect(source).not.toContain("getStoredThemePreference");
		expect(source).not.toContain("saveThemePreference");
		expect(source).not.toContain("toggleTheme:");
	});
});
