import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const createBookingSyncPattern =
	/syncBookingVaultLink\(ctx, undefined, args\.vaultItemId, bookingId\)/;
const explicitVaultPatchPattern =
	/const shouldUpdateVaultItem = vaultItemId !== undefined/;
const conditionalVaultPatchPattern =
	/if \(shouldUpdateVaultItem\) \{\s*patch\.vaultItemId = nextVaultItemId/;
const linkBookingSyncPattern =
	/syncBookingVaultLink\(\s*ctx,\s*booking\.vaultItemId,\s*args\.vaultItemId,\s*args\.bookingId\s*\)/;
const sortedBookingsPattern =
	/sortedBookings\s*=\s*\[\.\.\.bookings\]\.sort\(\(firstBooking, secondBooking\) =>[\s\S]*firstBooking\.startDateTime[\s\S]*secondBooking\.startDateTime/;
const returnedSortedBookingsPattern = /return sortedBookings/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip booking contract", () => {
	it("keeps Vault proof links aligned without clearing omitted proof fields", () => {
		const source = readWorkspaceFile("packages/backend/convex/bookings.ts");

		assert.match(
			source,
			createBookingSyncPattern,
			"createBookingTarget should sync a provided Vault proof link"
		);
		assert.match(
			source,
			explicitVaultPatchPattern,
			"updateBooking should distinguish omitted proof fields from clear requests"
		);
		assert.match(
			source,
			conditionalVaultPatchPattern,
			"updateBooking should patch vaultItemId only when explicitly provided"
		);
		assert.match(
			source,
			linkBookingSyncPattern,
			"linkBookingVaultItem should clear the old reverse link and set the new one"
		);
	});

	it("lists booking targets in chronological order", () => {
		const source = readWorkspaceFile("packages/backend/convex/bookings.ts");

		assert.match(
			source,
			sortedBookingsPattern,
			"listTripBookings should sort booking targets by start time and title"
		);
		assert.match(
			source,
			returnedSortedBookingsPattern,
			"listTripBookings should return the sorted booking list"
		);
	});
});
