import { View } from "react-native";

import {
	ListGroup,
	metrics,
	radius,
	Skeleton,
	spacing,
} from "@/src/components/ui";

const SKELETON_ROWS = ["first", "second", "third", "fourth"] as const;
const TITLE_HEIGHT = 16;
const SUBTITLE_HEIGHT = 13;

export function TripListSkeleton() {
	return (
		<View accessibilityLabel="Loading trips" accessibilityRole="progressbar">
			<ListGroup separatorInset={spacing.lg + metrics.thumbnail + spacing.md}>
				{SKELETON_ROWS.map((row) => (
					<View
						key={row}
						style={{
							alignItems: "center",
							flexDirection: "row",
							gap: spacing.md,
							paddingHorizontal: spacing.lg,
							paddingVertical: spacing.md,
						}}
					>
						<Skeleton
							height={metrics.thumbnail}
							radius={radius.tile}
							width={metrics.thumbnail}
						/>
						<View style={{ flex: 1, gap: spacing.sm }}>
							<Skeleton height={TITLE_HEIGHT} width="60%" />
							<Skeleton height={SUBTITLE_HEIGHT} width="40%" />
						</View>
					</View>
				))}
			</ListGroup>
		</View>
	);
}
