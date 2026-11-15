import { Redirect, useLocalSearchParams } from "expo-router";

import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

/** Risks now live in Readiness as "Risks"; this route keeps deep links alive. */
export default function TripRisksRedirect() {
	const tripId = useTripIdParam();
	useLocalSearchParams();

	if (!tripId) {
		return <Redirect href={VIYA_ROUTES.trips} />;
	}

	return (
		<Redirect
			href={{
				params: { segment: "heads-up", tripId },
				pathname: "/(app)/trips/[tripId]/readiness",
			}}
		/>
	);
}
