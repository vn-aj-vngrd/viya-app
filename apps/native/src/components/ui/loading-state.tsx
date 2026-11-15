import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppText } from "./app-text";
import { spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface LoadingStateProps {
	className?: string;
	/** Delay before showing so fast loads never flash. Default 250ms. */
	delay?: number;
	/** One line of context. */
	message?: string;
	/** Truthful title, e.g. "Loading trips". */
	title?: string;
}

/** Centered spinner + title + line, same position as EmptyState. */
export function LoadingState({
	className,
	delay = 250,
	message,
	title = "Loading",
}: LoadingStateProps) {
	const { palette } = useUITheme();
	const [visible, setVisible] = useState(delay === 0);

	useEffect(() => {
		if (delay === 0) {
			return;
		}
		const timer = setTimeout(() => setVisible(true), delay);
		return () => clearTimeout(timer);
	}, [delay]);

	return (
		<View
			accessibilityLabel={title}
			accessibilityRole="progressbar"
			className={className}
			style={{
				alignItems: "center",
				flex: 1,
				gap: spacing.sm,
				justifyContent: "center",
				opacity: visible ? 1 : 0,
				paddingHorizontal: spacing["2xl"],
			}}
		>
			<ActivityIndicator color={palette.inkSecondary} size="large" />
			<AppText
				style={{ marginTop: spacing.xs, textAlign: "center" }}
				variant="headline"
			>
				{title}
			</AppText>
			{message ? (
				<AppText
					style={{ textAlign: "center" }}
					tone="secondary"
					variant="subhead"
				>
					{message}
				</AppText>
			) : null}
		</View>
	);
}
