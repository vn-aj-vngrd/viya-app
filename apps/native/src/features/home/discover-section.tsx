import type { ReactNode } from "react";
import { View } from "react-native";

import { SectionHeader, spacing } from "@/src/components/ui";

export function DiscoverSection({
	children,
	inset = true,
	title,
}: {
	children: ReactNode;
	/** Inset content gets the screen gutter; carousels run edge to edge. */
	inset?: boolean;
	title: string;
}) {
	return (
		<View style={{ gap: spacing.md }}>
			<View style={{ paddingHorizontal: spacing.screen }}>
				<SectionHeader title={title} />
			</View>
			{inset ? (
				<View style={{ paddingHorizontal: spacing.screen }}>{children}</View>
			) : (
				children
			)}
		</View>
	);
}
