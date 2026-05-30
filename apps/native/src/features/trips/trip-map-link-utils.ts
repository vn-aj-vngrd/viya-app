interface TripMapSearchTarget {
	address?: string;
	label?: string;
	latitude?: number;
	locationName?: string;
	longitude?: number;
}

const joinSearchParts = (parts: readonly (string | undefined)[]) =>
	parts
		.map((part) => part?.trim())
		.filter((part): part is string => Boolean(part))
		.join(", ");

const hasCoordinatePair = ({ latitude, longitude }: TripMapSearchTarget) =>
	Number.isFinite(latitude) && Number.isFinite(longitude);

export const hasTripMapSearchTarget = (target: TripMapSearchTarget) =>
	Boolean(
		hasCoordinatePair(target) ||
			joinSearchParts([target.label, target.address, target.locationName])
	);

export const getTripMapSearchUrl = (target: TripMapSearchTarget) => {
	const query =
		joinSearchParts([target.label, target.address, target.locationName]) ||
		"Trip stop";
	const params = [`q=${encodeURIComponent(query)}`];

	if (hasCoordinatePair(target)) {
		params.push(
			`ll=${encodeURIComponent(`${target.latitude},${target.longitude}`)}`
		);
	}

	return `https://maps.apple.com/?${params.join("&")}`;
};
