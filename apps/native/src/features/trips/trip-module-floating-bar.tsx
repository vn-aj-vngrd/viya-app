import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
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
	const workspace = useQuery(api.tripWorkspace.getTripWorkspace, { tripId });
	const model = workspace
		? createTripDashboardModel({
				tripId,
				workspace,
			})
		: null;

	return (
		<View className="flex-1 bg-background">
			<View
				className="gap-3 bg-background px-4 pb-3"
				style={{ paddingTop: insets.top + 10, zIndex: 30 }}
			>
				<View className="min-h-11 flex-row items-center gap-3">
					<NavigationBackButton onPress={() => router.back()} />
					<View className="min-w-0 flex-1">
						<Text numberOfLines={1} type="body-sm" weight="bold">
							{model?.workspace.trip.title ?? ""}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{model
								? `${model.workspace.trip.destination} · ${model.tripWindow}`
								: ""}
						</Text>
					</View>
					<View className="w-12 items-end">
						{headerAction ??
							(model && activeTab === "overview" ? (
								<TripHeaderActionGroup model={model} />
							) : null)}
					</View>
				</View>
				{header ? <View className="pt-1">{header}</View> : null}
			</View>
			<View className="flex-1">{children}</View>
			{model ? (
				<TripModuleNavigationBar activeTab={activeTab} model={model} />
			) : null}
		</View>
	);
}
