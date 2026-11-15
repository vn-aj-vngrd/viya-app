import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");
const quickExpenseCategoryMapPattern =
	/const quickExpenseCategoryByItineraryCategory/;
const quickExpenseContextPattern =
	/const quickExpenseContext = getQuickExpenseContext\(\s*heroEntry,\s*workspace\.bookings\s*\)/;
const quickExpenseBookingPatchPattern =
	/\.\.\.\(quickExpenseContext\.bookingId\s*\? \{ bookingId: quickExpenseContext\.bookingId \}\s*: \{\}\)/;
const quickExpenseCategoryPattern = /category: quickExpenseContext\.category/;
const quickExpenseBookingLabelPattern =
	/linkedBookingLabel=\{quickExpenseContext\.bookingLabel\}/;
const travelDocumentUrlPattern = /url: item\.url/;
const travelDocumentOpenHandlerPattern = /handleOpenTravelDocument/;
const travelDocumentLinkingPattern = /Linking\.openURL\(url\)/;
const travelDocumentActionPattern = /header="Documents"/;
const bookingProofLookupPattern = /vaultItemById\.get\(booking\.vaultItemId\)/;
const bookingProofActionPattern = /header="Tickets"/;
const riskModuleHrefPattern =
	/router\.push\(VIYA_ROUTES\.tripRisks\(tripId\)\)/;
const riskModuleActionPattern = /urgent risk/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip travel mode contract", () => {
	it("logs quick expenses with current itinerary context", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toMatch(quickExpenseCategoryMapPattern);
		expect(source).toMatch(quickExpenseContextPattern);
		expect(source).toMatch(quickExpenseBookingPatchPattern);
		expect(source).toMatch(quickExpenseCategoryPattern);
		expect(source).toMatch(quickExpenseBookingLabelPattern);
	});

	it("opens saved vault documents from Travel Mode", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toMatch(travelDocumentUrlPattern);
		expect(source).toMatch(travelDocumentOpenHandlerPattern);
		expect(source).toMatch(travelDocumentLinkingPattern);
		expect(source).toMatch(travelDocumentActionPattern);
	});

	it("opens linked booking proof files from Travel Mode", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toMatch(bookingProofLookupPattern);
		expect(source).toMatch(bookingProofActionPattern);
	});

	it("keeps open risk alerts navigable to the Risks module", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-travel-mode-screen.tsx"
		);

		expect(source).toMatch(riskModuleHrefPattern);
		expect(source).toMatch(riskModuleActionPattern);
	});
});
