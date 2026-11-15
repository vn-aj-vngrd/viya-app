import { api } from "@viya-app/backend/convex/_generated/api";
import { getNextTrip } from "@viya-app/domain";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";

import { Icon, ListGroup, ListRow, ScreenShell } from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { formatCount, formatTripRange, toLocalDateKey } from "@/src/lib/format";

const ROW_ICON_SIZE = 22;

export default function VaultTabScreen() {
	const router = useRouter();
	const trips = useQuery(api.trips.listTrips);
	const vaultCounts = useQuery(api.vault.listVaultCountsByTrip);
	const realTrips = trips?.filter((trip) => !trip.isDemo) ?? [];
	const countsByTrip = new Map(
		(vaultCounts ?? []).map((entry) => [entry.tripId, entry])
	);
	const nextTripId = getNextTrip(realTrips, toLocalDateKey())?._id;
	const rank = (trip: (typeof realTrips)[number]) => {
		if (trip._id === nextTripId) {
			return 0;
		}

		return (countsByTrip.get(trip._id)?.files ?? 0) > 0 ? 1 : 2;
	};
	const sortedTrips = [...realTrips].sort((a, b) => {
		const byRank = rank(a) - rank(b);

		if (byRank !== 0) {
			return byRank;
		}

		if (rank(a) === 1) {
			return (
				(countsByTrip.get(b._id)?.lastAddedAt ?? 0) -
				(countsByTrip.get(a._id)?.lastAddedAt ?? 0)
			);
		}

		return (b.startDate ?? "").localeCompare(a.startDate ?? "");
	});

	const createTrip = () => router.push(VIYA_ROUTES.newTrip);

	if (trips === undefined || vaultCounts === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading vault" }}
				title="Vault"
				titleMode="large"
			/>
		);
	}

	if (realTrips.length === 0) {
		return (
			<ScreenShell
				state={{
					action: { label: "New trip", onPress: createTrip },
					description:
						"Files are kept per trip. Create a trip, then add tickets, IDs and receipts to it.",
					icon: "file-tray-full-outline",
					kind: "empty",
					title: "No trips yet",
				}}
				title="Vault"
				titleMode="large"
			/>
		);
	}

	return (
		<ScreenShell
			actions={[
				{
					icon: "add",
					items: sortedTrips.slice(0, 6).map((trip) => ({
						icon: "file-tray-full-outline" as const,
						key: trip._id,
						onPress: () => router.push(VIYA_ROUTES.tripVault(trip._id)),
						title: `Add to ${trip.title}`,
					})),
					key: "add",
					label: "Add a file",
					type: "menu",
				},
			]}
			title="Vault"
			titleMode="large"
		>
			<ListGroup header="By trip">
				{sortedTrips.map((trip) => {
					const files = countsByTrip.get(trip._id)?.files ?? 0;
					const value = files > 0 ? formatCount(files, "file") : "Empty";

					return (
						<ListRow
							accessibilityLabel={`Open vault for ${trip.title}, ${value}`}
							key={trip._id}
							leading={
								<Icon
									name="file-tray-full-outline"
									size={ROW_ICON_SIZE}
									tone="secondary"
								/>
							}
							onPress={() => router.push(VIYA_ROUTES.tripVault(trip._id))}
							subtitle={`${trip.destination} · ${formatTripRange(trip.startDate, trip.endDate)}`}
							title={trip.title}
							value={value}
						/>
					);
				})}
			</ListGroup>
		</ScreenShell>
	);
}
