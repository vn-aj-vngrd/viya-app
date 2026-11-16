import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { PrimaryButton, ScreenShell } from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

import {
	TripDraftsSheet,
	TripHero,
	TripModuleGroups,
	TripNextUp,
	TripToday,
	useTripHeaderActions,
} from "./trip-dashboard-components";
import type { TripDashboardModel, TripWorkspace } from "./trip-dashboard-types";
import { createTripDashboardModel } from "./trip-dashboard-utils";
import { useTripIdParam } from "./use-trip-id-param";

function TripDashboardContent({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const { openDrafts } = useLocalSearchParams<{ openDrafts?: string }>();
	const [isDraftsOpen, setIsDraftsOpen] = useState(openDrafts === "1");
	const { actions, openProfileSheet, sheet } = useTripHeaderActions(model);
	const isTraveling = model.phase === "during";

	return (
		<ScreenShell
			actions={actions}
			footer={
				isTraveling ? (
					<PrimaryButton
						icon="navigate-outline"
						label="Open Travel Mode"
						onPress={() =>
							router.push(VIYA_ROUTES.tripTravelMode(model.tripId))
						}
					/>
				) : undefined
			}
			sheets={
				<>
					{sheet}
					<TripDraftsSheet
						isOpen={isDraftsOpen}
						model={model}
						onOpenChange={setIsDraftsOpen}
					/>
				</>
			}
			title={model.workspace.trip.title}
			titleMode="large"
		>
			<TripHero model={model} onAddDestination={openProfileSheet} />
			{isTraveling ? <TripToday model={model} /> : <TripNextUp model={model} />}
			<TripModuleGroups
				model={model}
				onOpenDrafts={() => setIsDraftsOpen(true)}
			/>
		</ScreenShell>
	);
}

export function TripDashboardScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);

	const model = useMemo(() => {
		if (!(tripId && workspace)) {
			return null;
		}

		return createTripDashboardModel({
			tripId,
			workspace: workspace as TripWorkspace,
		});
	}, [tripId, workspace]);

	if (!tripId || workspace === null) {
		return (
			<ScreenShell
				state={{
					action: {
						label: "Back to trips",
						onPress: () => router.replace(VIYA_ROUTES.trips),
					},
					description: "This trip was deleted or you no longer have access.",
					icon: "map-outline",
					kind: "empty",
					title: "This trip is no longer available",
				}}
				title="Trip"
			/>
		);
	}

	if (workspace === undefined || !model) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading trip" }}
				title="Trip"
			/>
		);
	}

	return <TripDashboardContent model={model} />;
}
