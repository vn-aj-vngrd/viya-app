import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const tripAgentDraftHelperPattern = /tripAgentDraftApply/;
const floatingAskViyaBarPattern = /FloatingAskViyaBar/;
const tripModuleScreenFramePattern = /TripModuleScreenFrame/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

const requiredTripRoutes = [
	{
		constant: "tripDashboard",
		file: "apps/native/app/(app)/trips/[tripId]/index.tsx",
		leaf: "",
		screen: "TripDashboardScreen",
	},
	{
		constant: "tripItinerary",
		file: "apps/native/app/(app)/trips/[tripId]/itinerary.tsx",
		leaf: "/itinerary",
		screen: "TripItineraryScreen",
	},
	{
		constant: "tripPlaces",
		file: "apps/native/app/(app)/trips/[tripId]/places.tsx",
		leaf: "/places",
		screen: "TripPlacesScreen",
	},
	{
		constant: "tripBookings",
		file: "apps/native/app/(app)/trips/[tripId]/bookings.tsx",
		leaf: "/bookings",
		screen: "BookingHubScreen",
	},
	{
		constant: "tripVault",
		file: "apps/native/app/(app)/trips/[tripId]/vault.tsx",
		leaf: "/vault",
		screen: "TripVaultScreen",
	},
	{
		constant: "tripBudget",
		file: "apps/native/app/(app)/trips/[tripId]/budget.tsx",
		leaf: "/budget",
		screen: "TripBudgetScreen",
	},
	{
		constant: "tripReadiness",
		file: "apps/native/app/(app)/trips/[tripId]/readiness.tsx",
		leaf: "/readiness",
		screen: "ReadinessScreen",
	},
	{
		constant: "tripRisks",
		file: "apps/native/app/(app)/trips/[tripId]/risks.tsx",
		leaf: "/risks",
		screen: "TripRisksScreen",
	},
	{
		constant: "tripNotes",
		file: "apps/native/app/(app)/trips/[tripId]/notes.tsx",
		leaf: "/notes",
		screen: "TripNotesScreen",
	},
	{
		constant: "tripCompanions",
		file: "apps/native/app/(app)/trips/[tripId]/companions.tsx",
		leaf: "/companions",
		screen: "TripCompanionsScreen",
	},
	{
		constant: "tripTravelMode",
		file: "apps/native/app/(app)/trips/[tripId]/travel-mode.tsx",
		leaf: "/travel-mode",
		screen: "TripTravelModeScreen",
	},
	{
		constant: "tripMoments",
		file: "apps/native/app/(app)/trips/[tripId]/moments.tsx",
		leaf: "/moments",
		screen: "TripMomentsScreen",
	},
	{
		constant: "tripWrapped",
		file: "apps/native/app/(app)/trips/[tripId]/wrapped.tsx",
		leaf: "/wrapped",
		screen: "TripRecapScreen",
	},
] as const;

const requiredBackendModules = [
	"bookings",
	"companions",
	"itinerary",
	"moments",
	"notes",
	"places",
	"readiness",
	"risks",
	"tripWorkspace",
	"trips",
	"vault",
] as const;

const requiredWorkspaceFields = [
	"agentDrafts",
	"bookings",
	"companions",
	"documents",
	"expenses",
	"itineraryDays",
	"itineraryItems",
	"moments",
	"notes",
	"readinessItems",
	"risks",
	"savedPlaces",
	"trip",
	"vaultItems",
] as const;

const requiredAiModules = [
	"itinerary",
	"places",
	"bookings",
	"documents",
	"budget",
	"readiness",
	"risks",
	"travel",
	"recap",
] as const;

const requiredFloatingModuleScreens = [
	{
		activeTab: "itinerary",
		file: "apps/native/src/features/trips/trip-itinerary-screen.tsx",
	},
	{
		activeTab: "places",
		file: "apps/native/src/features/trips/trip-places-screen.tsx",
	},
	{
		activeTab: "bookings",
		file: "apps/native/src/features/bookings/booking-hub-screen.tsx",
	},
	{
		activeTab: "documents",
		file: "apps/native/src/features/vault/trip-vault-screen.tsx",
	},
	{
		activeTab: "budget",
		file: "apps/native/src/features/budget/trip-budget-screen.tsx",
	},
	{
		activeTab: "checklist",
		file: "apps/native/src/features/readiness/readiness-screen.tsx",
	},
	{
		activeTab: "risks",
		file: "apps/native/app/(app)/trips/[tripId]/risks.tsx",
	},
	{
		activeTab: "companions",
		file: "apps/native/src/features/trips/trip-companions-screen.tsx",
	},
	{
		activeTab: "notes",
		file: "apps/native/src/features/trips/trip-notes-screen.tsx",
	},
	{
		activeTab: "travel",
		file: "apps/native/src/features/trips/trip-travel-mode-screen.tsx",
	},
	{
		activeTab: "memories",
		file: "apps/native/src/features/trips/trip-moments-screen.tsx",
	},
	{
		activeTab: "recap",
		file: "apps/native/src/features/trips/trip-recap-screen.tsx",
	},
] as const;

describe("trip workspace contract", () => {
	it("keeps every trip workspace route wired to a screen and route constant", () => {
		const routesSource = readWorkspaceFile(
			"apps/native/src/constants/routes.ts"
		);
		const layoutSource = readWorkspaceFile("apps/native/app/(app)/_layout.tsx");

		for (const route of requiredTripRoutes) {
			const routePath = resolve(rootPath, route.file);
			assert.equal(existsSync(routePath), true, `${route.file} is missing`);
			if (route.leaf) {
				assert.match(
					routesSource,
					new RegExp(`${route.constant}:.*"${route.leaf}"`),
					`${route.constant} should point to ${route.leaf}`
				);
			} else {
				assert.match(
					routesSource,
					new RegExp(`${route.constant}:.*tripRoute\\(tripId\\)`),
					`${route.constant} should point to the trip index`
				);
			}
			assert.match(
				readFileSync(routePath, "utf8"),
				new RegExp(route.screen),
				`${route.file} should render ${route.screen}`
			);
			assert.match(
				layoutSource,
				new RegExp(`name="trips/\\[tripId\\]${route.leaf || "/index"}"`),
				`${route.file} should be registered in the app stack`
			);
		}
	});

	it("keeps every dedicated trip module screen on the floating module switcher", () => {
		const floatingBarSource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-module-floating-bar.tsx"
		);

		assert.match(
			floatingBarSource,
			floatingAskViyaBarPattern,
			"trip module floating bar should reuse the shared dashboard floating bar"
		);

		for (const screen of requiredFloatingModuleScreens) {
			const source = readWorkspaceFile(screen.file);
			assert.match(
				source,
				tripModuleScreenFramePattern,
				`${screen.file} should render the floating module switcher`
			);
			assert.match(
				source,
				new RegExp(`activeTab="${screen.activeTab}"`),
				`${screen.file} should identify the active module as ${screen.activeTab}`
			);
		}
	});

	it("keeps trip workspace frontend fields aligned with backend modules", () => {
		const apiSource = readWorkspaceFile(
			"packages/backend/convex/_generated/api.d.ts"
		);
		const typesSource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-types.ts"
		);
		const workspaceSource = readWorkspaceFile(
			"packages/backend/convex/tripWorkspace.ts"
		);

		for (const moduleName of requiredBackendModules) {
			assert.match(
				apiSource,
				new RegExp(`${moduleName}: typeof ${moduleName}`),
				`${moduleName} should be available through generated Convex API`
			);
		}

		for (const field of requiredWorkspaceFields) {
			assert.match(
				typesSource,
				new RegExp(`${field}[?:]`),
				`TripWorkspace should expose ${field}`
			);
			assert.match(
				workspaceSource,
				new RegExp(`\\b${field}\\b`),
				`getTripWorkspace should return ${field}`
			);
		}

		assert.doesNotMatch(
			apiSource,
			tripAgentDraftHelperPattern,
			"pure AI draft helpers should not be generated as Convex modules"
		);
	});

	it("keeps Viya agent shortcuts aligned with supported backend modules", () => {
		const dashboardSource = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-components.tsx"
		);
		const agentSource = readWorkspaceFile(
			"packages/backend/convex/ai/tripAgent.ts"
		);

		for (const moduleName of requiredAiModules) {
			assert.match(
				agentSource,
				new RegExp(`v\\.literal\\("${moduleName}"\\)`),
				`backend should accept ${moduleName} agent drafts`
			);
			assert.match(
				agentSource,
				new RegExp(`${moduleName}:`),
				`backend should map ${moduleName} to an AI model purpose`
			);
			assert.match(
				dashboardSource,
				new RegExp(`module: "${moduleName}"`),
				`workspace should expose a ${moduleName} Viya shortcut`
			);
		}
	});
});
