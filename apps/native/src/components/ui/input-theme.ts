import { type Palette, palettes } from "./tokens";

/**
 * Theme props every text input shares: placeholder, caret/selection and
 * keyboard follow the palette so inputs read correctly in light and dark.
 */
export function inputThemeProps(palette: Palette) {
	return {
		cursorColor: palette.accent,
		keyboardAppearance:
			palette.canvas === palettes.dark.canvas
				? ("dark" as const)
				: ("light" as const),
		placeholderTextColor: palette.inkTertiary,
		selectionColor: palette.accent,
	};
}
