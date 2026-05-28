import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Spinner } from "heroui-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";

import {
	NextActionCard,
	QuickActions,
	StatusStrip,
	TripHero,
	TripTabPicker,
} from "./trip-dashboard-components";
import { TripTabContent } from "./trip-dashboard-tabs";
import type { TripTab, TripWorkspace } from "./trip-dashboard-types";
import { createTripDashboardModel } from "./trip-dashboard-utils";
import { useTripIdParam } from "./use-trip-id-param";

export function TripDashboardScreen({
	initialTab = "overview",
}: {
	initialTab?: TripTab;
} = {}) {
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const [activeTab, setActiveTab] = useState<TripTab>(initialTab);

	const model = useMemo(() => {
		if (!(tripId && workspace)) {
			return null;
		}

		return createTripDashboardModel({
			tripId,
			workspace: workspace as TripWorkspace,
		});
	}, [tripId, workspace]);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip to view its command center."
					icon="map-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined || !model) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<TripHero model={model} />
				<StatusStrip metrics={model.statusMetrics} />
				<NextActionCard model={model} onSelectTab={setActiveTab} />
				<QuickActions actions={model.quickActions} onSelectTab={setActiveTab} />
				<TripTabPicker
					activeTab={activeTab}
					model={model}
					onSelectTab={setActiveTab}
				/>
				<TripTabContent
					activeTab={activeTab}
					model={model}
					onSelectTab={setActiveTab}
				/>
			</View>
		</Container>
	);
}
