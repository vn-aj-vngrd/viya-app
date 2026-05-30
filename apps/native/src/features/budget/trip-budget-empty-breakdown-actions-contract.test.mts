import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget empty breakdown actions contract", () => {
	it("keeps empty spend breakdown connected to expenses and bookings", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		expect(source).toContain("No booked costs or manual expenses yet.");
		expect(source).toContain("Add expense");
		expect(source).toContain("Add booking cost");
		expect(source).toContain("href={VIYA_ROUTES.tripBookings(tripId)}");
		expect(source).toContain("setExpenseForm(initialExpenseForm())");
	});
});
