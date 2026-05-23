import { TripEmptyScreen } from "@/src/features/trips/trip-empty-screen";

export default function TripReadinessScreen() {
	return (
		<TripEmptyScreen
			icon="shield-checkmark"
			subtitle="Bookings, documents, budget, packing, safety, and gaps."
			title="Readiness"
		/>
	);
}
