import {
	type ThemePreference,
	useAppTheme,
} from "@/contexts/app-theme-context";
import { Icon, ListGroup, ListRow, ScreenShell } from "@/src/components/ui";

const CHECK_SIZE = 17;
const themeOptions: readonly { title: string; value: ThemePreference }[] = [
	{ title: "System", value: "system" },
	{ title: "Light", value: "light" },
	{ title: "Dark", value: "dark" },
];

export default function AppearanceScreen() {
	const { setTheme, themePreference } = useAppTheme();

	return (
		<ScreenShell title="Appearance">
			<ListGroup footer="System follows your device setting.">
				{themeOptions.map((option) => {
					const selected = themePreference === option.value;

					return (
						<ListRow
							accessibilityLabel={`${option.title}${selected ? ", selected" : ""}`}
							key={option.value}
							onPress={() => {
								setTheme(option.value).catch(() => undefined);
							}}
							showChevron={false}
							title={option.title}
							trailing={
								selected ? (
									<Icon
										name="checkmark"
										size={CHECK_SIZE}
										tone="accent"
										weight="semibold"
									/>
								) : undefined
							}
						/>
					);
				})}
			</ListGroup>
		</ScreenShell>
	);
}
