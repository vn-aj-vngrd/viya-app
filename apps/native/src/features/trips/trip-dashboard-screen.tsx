import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Spinner } from "heroui-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";

import {
	FloatingAskViyaBar,
	MainModules,
	TripHero,
	TripStickyHeader,
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
	const shouldShowFocusSections = initialTab !== "overview";

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
		<View className="flex-1 bg-background">
			<TripStickyHeader model={model} />
			<Container
				className="px-4"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-3 pb-28">
					<TripHero model={model} />
					<MainModules model={model} />
					{shouldShowFocusSections ? (
						<>
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
						</>
					) : null}
				</View>
			</Container>
			<FloatingAskViyaBar model={model} />
		</View>
	);
}
