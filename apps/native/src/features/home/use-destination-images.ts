import { useEffect, useState } from "react";

import { fetchDestinationImageUrl } from "@/src/features/trips/trip-cover-image";

/**
 * Module-level cache so destination photos resolve once per app session and
 * survive re-renders and navigation. Misses are not cached because Android
 * preview network failures can be transient.
 */
const imageUrlCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | undefined>>();

const resolveDestinationImage = (name: string) => {
	if (imageUrlCache.has(name)) {
		return Promise.resolve(imageUrlCache.get(name));
	}

	const existing = inFlightRequests.get(name);
	if (existing) {
		return existing;
	}

	const request = fetchDestinationImageUrl(name).then((url) => {
		if (url) {
			imageUrlCache.set(name, url);
		}
		inFlightRequests.delete(name);
		return url;
	});
	inFlightRequests.set(name, request);

	return request;
};

const seedFromCache = (names: string[]) => {
	const seeded: Record<string, string | undefined> = {};
	for (const name of names) {
		const cachedUrl = imageUrlCache.get(name);

		if (cachedUrl) {
			seeded[name] = cachedUrl;
		}
	}
	return seeded;
};

/**
 * Resolve a representative photo URL for each destination name. Returns a map
 * keyed by name; a missing key means "still loading" or "no image resolved".
 * Already-cached names are returned synchronously.
 */
export const useDestinationImages = (names: string[]) => {
	const cacheKey = names.join("|");
	const [urls, setUrls] = useState<Record<string, string | undefined>>(() =>
		seedFromCache(names)
	);

	useEffect(() => {
		const targetNames = cacheKey.split("|").filter(Boolean);
		let isActive = true;

		const cachedUpdates = seedFromCache(targetNames);
		if (Object.keys(cachedUpdates).length > 0) {
			setUrls((previous) => ({ ...cachedUpdates, ...previous }));
		}

		for (const name of targetNames) {
			if (imageUrlCache.has(name)) {
				continue;
			}

			resolveDestinationImage(name).then((url) => {
				if (isActive) {
					setUrls((previous) => ({ ...previous, [name]: url }));
				}
			});
		}

		return () => {
			isActive = false;
		};
	}, [cacheKey]);

	return urls;
};
