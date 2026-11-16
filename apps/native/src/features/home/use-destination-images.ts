import { useEffect, useState } from "react";

import { fetchDestinationImageUrl } from "@/src/features/trips/trip-cover-image";

/**
 * Module-level cache so destination photos resolve once per app session and
 * survive re-renders and navigation. A failed lookup (timeout, offline) is not
 * cached for good: it is retried after MISS_RETRY_MS, so a flaky first load
 * does not leave a placeholder until the app restarts.
 */
const imageUrlCache = new Map<string, string>();
const missTimestamps = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<string | undefined>>();
const MISS_RETRY_MS = 30_000;
const ATTEMPTS = 2;
const RETRY_DELAY_MS = 600;

const wait = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

const hasFreshMiss = (name: string) => {
	const missedAt = missTimestamps.get(name);

	return missedAt !== undefined && Date.now() - missedAt < MISS_RETRY_MS;
};

const isSettled = (name: string) =>
	imageUrlCache.has(name) || hasFreshMiss(name);

const lookupWithRetry = async (name: string) => {
	for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
		const url = await fetchDestinationImageUrl(name);

		if (url) {
			return url;
		}

		if (attempt < ATTEMPTS - 1) {
			await wait(RETRY_DELAY_MS);
		}
	}
};

const resolveDestinationImage = (name: string) => {
	const cached = imageUrlCache.get(name);

	if (cached) {
		return Promise.resolve(cached);
	}

	if (hasFreshMiss(name)) {
		return Promise.resolve(undefined);
	}

	const existing = inFlightRequests.get(name);
	if (existing) {
		return existing;
	}

	const request = lookupWithRetry(name).then((url) => {
		if (url) {
			imageUrlCache.set(name, url);
			missTimestamps.delete(name);
		} else {
			missTimestamps.set(name, Date.now());
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
		if (isSettled(name)) {
			seeded[name] = imageUrlCache.get(name);
		}
	}
	return seeded;
};

/**
 * Resolve a representative photo URL for each destination name. Returns a map
 * keyed by name; a missing key means "still loading", an explicit `undefined`
 * means "no image right now" (retried on a later mount). Already-resolved
 * names are returned synchronously.
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
			if (isSettled(name)) {
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
