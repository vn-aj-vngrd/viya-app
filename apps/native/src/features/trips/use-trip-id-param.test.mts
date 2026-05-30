import { describe, expect, test } from "bun:test";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

import { getTripIdParamValue } from "./trip-id-param";

describe("trip id route param parsing", () => {
	test("accepts Convex-shaped trip ids", () => {
		const tripId = "j57f0p4ef7v8k9m2n3q4r5s6t7u8v9w0" as Id<"trips">;

		expect(getTripIdParamValue(tripId)).toBe(tripId);
	});

	test("uses the first route param value", () => {
		const tripId = "k57f0p4ef7v8k9m2n3q4r5s6t7u8v9w0" as Id<"trips">;

		expect(getTripIdParamValue([tripId, "demo"])).toBe(tripId);
	});

	test("rejects missing and malformed direct route ids", () => {
		expect(getTripIdParamValue(undefined)).toBeNull();
		expect(getTripIdParamValue("demo")).toBeNull();
		expect(getTripIdParamValue("trip_123")).toBeNull();
	});
});
