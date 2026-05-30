import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");
const webCaptchaGuardPattern =
	/const shouldRenderCaptchaMount = Platform\.OS === "web"/;
const captchaMountPattern = /nativeID="clerk-captcha"/;
const captchaBeforeEmailActionPattern =
	/nativeID="clerk-captcha"[\s\S]*Continue with email/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("auth sign-in sheet", () => {
	it("keeps Clerk bot protection mounted for web email sign-up", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/auth/auth-sign-in-sheet.tsx"
		);

		expect(source).toMatch(webCaptchaGuardPattern);
		expect(source).toMatch(captchaMountPattern);
		expect(source).toMatch(captchaBeforeEmailActionPattern);
	});
});
