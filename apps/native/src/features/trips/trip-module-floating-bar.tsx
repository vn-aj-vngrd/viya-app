import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import { AppText, useUITheme } from "@/src/components/ui";
import {
	TripHeaderActionGroup,
	TripModuleNavigationBar,
} from "./trip-dashboard-components";
import type { TripTab } from "./trip-dashboard-types";
import { createTripDashboardModel } from "./trip-dashboard-utils";

export function TripModuleScreenFrame({
	activeTab,
	header,
	children,
	headerAction,
	tripId,
}: {
	activeTab: TripTab;
	header?: ReactNode;
	children: ReactNode;
	headerAction?: ReactNode;
	tripId: Id<"trips">;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const workspace = useQuery(api.tripWorkspace.getTripWorkspace, { tripId });
	const model = workspace
		? createTripDashboardModel({
				tripId,
				workspace,
			})
		: null;

	return (
		<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
			<View
				style={{
					backgroundColor: palette.canvas,
					gap: 12,
					paddingBottom: 12,
					paddingHorizontal: 16,
					paddingTop: insets.top + 10,
					zIndex: 30,
				}}
			>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						gap: 12,
						minHeight: 44,
					}}
				>
					<NavigationBackButton onPress={() => router.back()} />
					<View style={{ flex: 1, minWidth: 0 }}>
						<AppText bold numberOfLines={1} variant="subhead">
							{model?.workspace.trip.title ?? ""}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{model
								? `${model.workspace.trip.destination} · ${model.tripWindow}`
								: ""}
						</AppText>
					</View>
					<View style={{ alignItems: "flex-end", minWidth: 48 }}>
						{headerAction ??
							(model && activeTab === "overview" ? (
								<TripHeaderActionGroup model={model} />
							) : null)}
					</View>
				</View>
				{header ? <View style={{ paddingTop: 4 }}>{header}</View> : null}
			</View>
			<View style={{ flex: 1 }}>{children}</View>
			{model ? (
				<TripModuleNavigationBar activeTab={activeTab} model={model} />
			) : null}
		</View>
	);
}
