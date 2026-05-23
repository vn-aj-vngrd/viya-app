import type { Href, useRouter } from "expo-router";

type AppRouter = ReturnType<typeof useRouter>;

export const pushDecoratedUrl = (
	router: AppRouter,
	decorateUrl: (url: string) => string,
	href: string
) => {
	const url = decorateUrl(href);
	const nextHref = url.includes("://") ? new URL(url).pathname : url;

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
