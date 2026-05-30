import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip vault empty latest action contract", () => {
	it("keeps the empty latest-file summary connected to first upload", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/vault/trip-vault-screen.tsx"
		);

		expect(source).toContain("onUploadFirstFile");
		expect(source).toContain("isUploading");
		expect(source).toContain("No file synced yet");
		expect(source).toContain("Upload first file");
		expect(source).toContain('handleUpload("document")');
	});
});
