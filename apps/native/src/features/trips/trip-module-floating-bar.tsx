import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { View } from "react-native";

import { FloatingAskViyaBar } from "./trip-dashboard-components";
import type { TripTab, TripWorkspace } from "./trip-dashboard-types";
import { createTripDashboardModel } from "./trip-dashboard-utils";

function TripModuleFloatingBar({
	activeTab,
	tripId,
}: {
	activeTab: TripTab;
	tripId: Id<"trips">;
}) {
	const workspace = useQuery(api.tripWorkspace.getTripWorkspace, { tripId });
	const model = useMemo(() => {
		if (!workspace) {
			return null;
		}

		return createTripDashboardModel({
			tripId,
			workspace: workspace as TripWorkspace,
		});
	}, [tripId, workspace]);

	if (!model) {
		return null;
	}

	return <FloatingAskViyaBar activeTab={activeTab} model={model} />;
}

export function TripModuleScreenFrame({
	activeTab,
	children,
	tripId,
}: {
	activeTab: TripTab;
	children: ReactNode;
	tripId: Id<"trips">;
}) {
	return (
		<View className="flex-1 bg-background">
			{children}
			<TripModuleFloatingBar activeTab={activeTab} tripId={tripId} />
		</View>
	);
}
