import type { Href, useRouter } from "expo-router";

type AppRouter = ReturnType<typeof useRouter>;

const EXPO_DEVELOPMENT_PATH_PREFIX = "/--";

const getPathnameWithoutExpoPrefix = (pathname: string) => {
	if (pathname === EXPO_DEVELOPMENT_PATH_PREFIX) {
		return "/";
	}

	if (pathname.startsWith(`${EXPO_DEVELOPMENT_PATH_PREFIX}/`)) {
		return pathname.slice(EXPO_DEVELOPMENT_PATH_PREFIX.length);
	}

	return pathname;
};

const isNativeRouteHost = (host: string) =>
	host.length > 0 &&
	!host.includes(".") &&
	!host.includes(":") &&
	host !== "localhost";

export const getDecoratedRouterHref = (
	decorateUrl: (url: string) => string,
	href: string
) => {
	const url = decorateUrl(href);

	if (!url.includes("://")) {
		return url;
	}

	try {
		const parsedUrl = new URL(url);
		const hostPath = isNativeRouteHost(parsedUrl.host)
			? `/${parsedUrl.host}`
			: "";
		const pathname = getPathnameWithoutExpoPrefix(parsedUrl.pathname);
		const normalizedPath = `${hostPath}${pathname}` || "/";

		return `${normalizedPath}${parsedUrl.search}${parsedUrl.hash}`;
	} catch {
		return href;
	}
};

export const pushDecoratedUrl = (
	router: AppRouter,
	decorateUrl: (url: string) => string,
	href: string
) => {
	const nextHref = getDecoratedRouterHref(decorateUrl, href);

	router.replace(nextHref as Href);
};

export const getAuthErrorMessage = (error: unknown, fallback: string) => {
	if (
		error &&
		typeof error === "object" &&
		"longMessage" in error &&
		typeof error.longMessage === "string"
	) {
		return error.longMessage;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return fallback;
};
