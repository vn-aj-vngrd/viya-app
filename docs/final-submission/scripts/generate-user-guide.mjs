import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const rootDir = path.resolve(scriptsDir, "..");
const screenshotDir = path.join(rootDir, "assets", "screenshots");
const guideScreenDir = path.join(rootDir, "assets", "guide-screens");
const htmlPath = path.join(rootDir, "Viya User Guide.html");
const pdfPath = path.join(rootDir, "Viya User Guide.pdf");
const require = createRequire(import.meta.url);
const workspaceNodeModules =
	process.env.WORKSPACE_NODE_MODULES ??
	"/Users/vanajvanguardia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const importBundledPackage = async (packageName) =>
	import(
		pathToFileURL(
			require.resolve(packageName, { paths: [workspaceNodeModules] })
		).href
	);
const sharpModule = await importBundledPackage("sharp");
const playwrightModule = await importBundledPackage("playwright");
const sharp = sharpModule.default ?? sharpModule;
const playwright = playwrightModule.default ?? playwrightModule;
const { chromium } = playwright;

const screenshots = [
	{
		caption:
			"Getting started: Viya introduces the trip lifecycle before sign-in.",
		file: "auth-current-check.png",
		key: "gettingStarted",
	},
	{
		caption: "Sign in to Viya with Google, GitHub, or email.",
		file: "auth-get-started-after-tap.png",
		key: "signIn",
	},
	{
		caption: "iOS asks permission to use Google sign-in for Expo.",
		file: "auth-google-permission.png",
		key: "googlePermission",
	},
	{
		caption: "Google account picker with the signed-in demo account.",
		file: "auth-google-account-picker.png",
		key: "googlePicker",
	},
	{
		caption: "Google confirmation before returning to the app.",
		file: "auth-after-account-select.png",
		key: "googleContinue",
	},
	{
		caption: "After Google sign-in, Viya opens Home.",
		file: "auth-after-google-continue.png",
		key: "loginHome",
	},
	{
		caption: "Home gathers current trips, prompts, and nearby inspiration.",
		file: "home-dashboard.png",
		key: "home",
	},
	{
		caption: "Trip setup starts with the minimum useful context.",
		file: "create-trip-first-screen.png",
		key: "create",
	},
	{
		caption: "Ask Viya inside a trip to generate or audit workspace modules.",
		file: "singapore-ask-viya.png",
		key: "ask",
	},
	{
		caption: "Overview shows readiness, budget, and module status together.",
		file: "singapore-overview-ready.png",
		key: "overview",
	},
	{
		caption: "Workspace switcher keeps deep modules easy to reach.",
		file: "singapore-workspace-switcher.png",
		key: "switcher",
	},
	{
		caption: "Itinerary organizes days, stops, and pace in a simple timeline.",
		file: "singapore-itinerary.png",
		key: "itinerary",
	},
	{
		caption: "Budget tracks spend, remaining room, and receipt evidence.",
		file: "singapore-budget.png",
		key: "budget",
	},
	{
		caption: "Readiness closes the loop with concrete prep tasks.",
		file: "readiness.png",
		key: "readiness",
	},
];

const escapeHtml = (value) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

await fs.mkdir(guideScreenDir, { recursive: true });

for (const screenshot of screenshots) {
	const input = path.join(screenshotDir, screenshot.file);
	const output = path.join(guideScreenDir, `${screenshot.key}.jpg`);
	await sharp(input)
		.resize({ width: 760, withoutEnlargement: true })
		.jpeg({ mozjpeg: true, quality: 88 })
		.toFile(output);
	screenshot.image = pathToFileURL(output).href;
}

const screenByKey = Object.fromEntries(
	screenshots.map((screenshot) => [screenshot.key, screenshot])
);

const phone = (key, label = screenByKey[key].caption) => `
	<figure class="phone">
		<img alt="${escapeHtml(label)}" src="${screenByKey[key].image}">
		<figcaption>${escapeHtml(label)}</figcaption>
	</figure>
`;

const pages = [
	`
	<section class="page cover">
		<div class="cover-copy">
			<p class="eyebrow">User guide</p>
			<h1>Viya</h1>
			<p class="dek">From getting started and Google login to a ready AI travel workspace.</p>
			<div class="cover-card">
				<strong>Guide scope</strong>
				<span>Start on the getting-started screen, sign in with Google, choose the demo account, then use Home, Ask Viya, Workspace, Itinerary, Budget, Vault, and Readiness.</span>
			</div>
			<div class="meta-grid">
				<div><span>Audience</span><strong>Travelers and judges</strong></div>
				<div><span>Scenario shown</span><strong>Singapore Tech Week demo</strong></div>
				<div><span>Source</span><strong>Live iOS Simulator</strong></div>
			</div>
		</div>
		${phone("gettingStarted", "Start here: tap Get started from the Viya intro carousel.")}
	</section>
	`,
	`
	<section class="page">
		<div class="split">
			<div>
				<p class="eyebrow">1. Get started</p>
				<h2>Begin from the intro, then open sign-in.</h2>
				<p>Viya starts with a short carousel that explains the full trip lifecycle: dream it, get ready, and remember it. Tap <strong>Get started</strong> to open authentication.</p>
				<ol class="steps">
					<li><strong>Review the intro.</strong> The carousel shows planning, preparation, and recap.</li>
					<li><strong>Tap Get started.</strong> The sign-in sheet opens without leaving the app context.</li>
					<li><strong>Choose Google.</strong> For this demo, use Continue with Google.</li>
					<li><strong>Return to Home.</strong> After login, Viya loads the personalized dashboard.</li>
				</ol>
			</div>
			${phone("gettingStarted", "Getting-started carousel with Get started action.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">2. Sign in</p>
				<h2>Use Google and choose the saved account.</h2>
				<p>Tap <strong>Continue with Google</strong>. iOS may ask permission for Expo to use google.com for sign-in. Continue, then choose <strong>vanajvanguardia@gmail.com</strong> from the Google account picker.</p>
			</div>
			<div class="callout">This guide uses the already signed-in Google account on the simulator: vanajvanguardia@gmail.com.</div>
		</div>
		<div class="phone-grid two">
			${phone("signIn", "Sign-in sheet with Continue with Google.")}
			${phone("googlePicker", "Choose the saved Google account.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">3. Confirm access</p>
				<h2>Finish Google login and land on Home.</h2>
				<p>Accept the iOS sign-in permission if shown, then tap <strong>Continue</strong> on Google's confirmation screen. Viya returns to Home after authentication completes.</p>
			</div>
			<div class="checklist">
				<strong>Login screens captured</strong>
				<span>Viya sign-in sheet</span>
				<span>iOS Google permission</span>
				<span>Google account picker</span>
				<span>Google confirmation</span>
				<span>Post-login Home</span>
			</div>
		</div>
		<div class="phone-grid two">
			${phone("googlePermission", "iOS permission prompt for Google sign-in.")}
			${phone("googleContinue", "Google confirmation before returning to Viya.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">4. Home</p>
				<h2>Start with context, not a blank form.</h2>
				<p>Home shows active trips, suggested prompts, and destination ideas. Use it to continue an existing trip or start a new one from inspiration.</p>
			</div>
			<div class="callout">Best first action: open the active trip if one exists. Otherwise, start a trip from the create flow or ask Viya.</div>
		</div>
		<div class="phone-grid two">
			${phone("loginHome", "Home immediately after sign-in.")}
			${phone("create", "Create flow asking for destination first.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">5. Create a trip</p>
				<h2>Give Viya the basics, then let the workspace take over.</h2>
				<p>The trip setup flow collects the destination, travel window, budget comfort, traveler context, pace, and preferences. Keep answers practical; Viya can refine details later.</p>
			</div>
			<div class="checklist">
				<strong>Helpful inputs</strong>
				<span>Destination or region</span>
				<span>Dates or rough timing</span>
				<span>Budget ceiling</span>
				<span>Trip purpose</span>
				<span>Pace and must-haves</span>
			</div>
		</div>
		<div class="tip-band">
			<strong>Demo example:</strong> "Plan my Singapore group business-conference reward trip for Tech Week. Keep it polished but not exhausting, and handle flights, hotel, event pass, budget, itinerary, readiness, and one victory-lap moment."
		</div>
		<div class="phone-grid two">
			${phone("create", "Destination setup starts the structured trip workspace.")}
			${phone("overview", "After creation, the trip becomes an overview with modules.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">6. Ask Viya</p>
				<h2>Use AI as an operator for the trip.</h2>
				<p>Ask Viya from the global chat or inside a trip. Inside a trip, Viya uses the current workspace as context, so prompts can be short and specific.</p>
			</div>
			<div class="callout">Viya should not silently overwrite trip data. Review suggested changes before applying them.</div>
		</div>
		<div class="split visual">
			${phone("ask", "Trip-scoped Ask Viya screen with module prompts.")}
			<div>
				<h3>Useful prompts</h3>
				<ul class="bullets">
					<li>Build a realistic itinerary from this trip profile.</li>
					<li>Review this budget against my planning ceiling.</li>
					<li>Organize Vault and identify missing proof.</li>
					<li>Audit readiness before departure.</li>
					<li>What is the smartest next thing to check?</li>
				</ul>
				<h3>Good AI behavior</h3>
				<ul class="bullets">
					<li>Asks only for missing context.</li>
					<li>Explains the evidence used.</li>
					<li>Creates reviewable drafts.</li>
					<li>Connects changes across modules.</li>
				</ul>
			</div>
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">7. Workspace</p>
				<h2>Move between modules without losing the trip story.</h2>
				<p>The overview is the command center. It surfaces readiness, remaining budget, module counts, and the next best action. The switcher lets users jump to itinerary, budget, Vault, and readiness quickly.</p>
			</div>
			<div class="callout">Use Overview when deciding what to do next. Use the switcher when you already know which module needs work.</div>
		</div>
		<div class="phone-grid two">
			${phone("overview", "Overview shows the trip status in one glance.")}
			${phone("switcher", "Workspace switcher exposes every trip module.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">8. Itinerary and budget</p>
				<h2>Turn the plan into days and numbers.</h2>
				<p>Itinerary gives the traveler a day-by-day route with stops and pace. Budget keeps the trip grounded in confirmed spend, daily room, and receipts.</p>
			</div>
			<div class="checklist">
				<strong>Review before travel</strong>
				<span>Arrival and departure buffers</span>
				<span>Conference or event anchors</span>
				<span>Hotel and transport proof</span>
				<span>Daily safe spend</span>
				<span>Receipt links</span>
			</div>
		</div>
		<div class="phone-grid two">
			${phone("itinerary", "Itinerary organizes four days with planned stops.")}
			${phone("budget", "Budget shows remaining PHP room and tracked receipts.")}
		</div>
	</section>
	`,
	`
	<section class="page">
		<div class="header-row">
			<div>
				<p class="eyebrow">9. Vault and readiness</p>
				<h2>Finish when the trip is actually prepared.</h2>
				<p>Vault stores confirmations, receipts, passes, and notes. Readiness turns those files and decisions into concrete tasks so the user knows what is done and what is missing.</p>
			</div>
			<div class="callout">Readiness is the user-friendly finish line: when blockers are resolved, the trip is ready to travel.</div>
		</div>
		<div class="split visual">
			${phone("readiness", "Readiness board with 100% score and no open gap.")}
			<div>
				<h3>What to add to Vault</h3>
				<ul class="bullets">
					<li>Flight, hotel, transfer, and activity confirmations.</li>
					<li>Event passes, tickets, IDs, visas, and insurance notes.</li>
					<li>Receipts and expenses for budget tracking.</li>
					<li>Readiness notes such as packing, arrival cards, or emergency details.</li>
				</ul>
				<h3>What readiness checks</h3>
				<ul class="bullets">
					<li>Documents and booking proof.</li>
					<li>Budget buffer and receipt evidence.</li>
					<li>Schedule risks and transfer gaps.</li>
					<li>Assigned preparation tasks.</li>
				</ul>
			</div>
		</div>
	</section>
	`,
	`
	<section class="page final">
		<p class="eyebrow">Quick reference</p>
		<h2>Recommended user flow</h2>
		<div class="flow">
			<div><span>1</span><strong>Open Home</strong><p>Check the active trip or start a new one.</p></div>
			<div><span>2</span><strong>Create trip</strong><p>Enter destination, dates, budget, purpose, and pace.</p></div>
			<div><span>3</span><strong>Ask Viya</strong><p>Generate or audit the modules that need help.</p></div>
			<div><span>4</span><strong>Sync Vault</strong><p>Add confirmations, receipts, tickets, and notes.</p></div>
			<div><span>5</span><strong>Review modules</strong><p>Check itinerary, budget, bookings, risks, and places.</p></div>
			<div><span>6</span><strong>Finish readiness</strong><p>Resolve blockers until Viya says the trip is ready.</p></div>
		</div>
		<div class="footer-note">
			<strong>Demo note:</strong> Singapore Tech Week data and fixture documents are fictional demo material. The product flow is trip-agnostic and should work for any destination, dates, traveler type, and budget profile.
		</div>
	</section>
	`,
].join("\n");

const html = `<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<title>Viya User Guide</title>
	<style>
		@page { margin: 0; size: A4; }
		* { box-sizing: border-box; }
		body {
			background: #e8edf3;
			color: #121417;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			margin: 0;
		}
		.page {
			background: #f7f8fa;
			display: flex;
			flex-direction: column;
			gap: 24px;
			height: 297mm;
			overflow: hidden;
			padding: 19mm 18mm;
			page-break-after: always;
			position: relative;
			width: 210mm;
		}
		.cover {
			align-items: center;
			background:
				radial-gradient(circle at 82% 12%, rgba(10, 132, 255, 0.16), transparent 28%),
				linear-gradient(145deg, #ffffff 0%, #f3f7fb 50%, #eef3f8 100%);
			display: grid;
			grid-template-columns: 1.05fr 0.95fr;
			gap: 20px;
		}
		.cover-copy {
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.eyebrow {
			color: #0a84ff;
			font-size: 11px;
			font-weight: 800;
			letter-spacing: 0.08em;
			margin: 0;
			text-transform: uppercase;
		}
		h1, h2, h3, p { margin: 0; }
		h1 {
			font-size: 76px;
			letter-spacing: 0;
			line-height: 0.92;
		}
		h2 {
			font-size: 38px;
			letter-spacing: 0;
			line-height: 1.02;
			max-width: 560px;
		}
		h3 {
			font-size: 18px;
			line-height: 1.18;
			margin-bottom: 10px;
		}
		p {
			color: #626873;
			font-size: 15px;
			line-height: 1.55;
		}
		.dek {
			color: #31363d;
			font-size: 23px;
			font-weight: 650;
			line-height: 1.22;
			max-width: 430px;
		}
		.cover-card, .callout, .tip-band, .footer-note {
			background: #ffffff;
			border: 1px solid #dde3ea;
			border-radius: 18px;
			box-shadow: 0 12px 32px rgba(24, 37, 56, 0.07);
			padding: 16px;
		}
		.cover-card {
			display: flex;
			flex-direction: column;
			gap: 8px;
			max-width: 430px;
		}
		.cover-card span, .callout, .tip-band, .footer-note {
			color: #4c535d;
			font-size: 14px;
			line-height: 1.45;
		}
		.meta-grid {
			display: grid;
			gap: 10px;
			grid-template-columns: repeat(3, 1fr);
			margin-top: 8px;
		}
		.meta-grid div {
			background: rgba(255, 255, 255, 0.72);
			border: 1px solid #e0e5eb;
			border-radius: 14px;
			padding: 12px;
		}
		.meta-grid span {
			color: #7b828d;
			display: block;
			font-size: 9px;
			font-weight: 800;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}
		.meta-grid strong {
			display: block;
			font-size: 12px;
			line-height: 1.25;
			margin-top: 5px;
		}
		.phone {
			align-self: center;
			background: #101114;
			border-radius: 35px;
			box-shadow: 0 20px 54px rgba(21, 31, 46, 0.24);
			margin: 0;
			overflow: hidden;
			padding: 8px;
			width: 245px;
		}
		.phone img {
			border-radius: 28px;
			display: block;
			height: auto;
			width: 100%;
		}
		.phone figcaption {
			background: #101114;
			color: #d8dde5;
			font-size: 10px;
			line-height: 1.35;
			padding: 9px 7px 5px;
		}
		.cover .phone { width: 255px; }
		.header-row {
			align-items: end;
			display: grid;
			gap: 18px;
			grid-template-columns: 1fr 235px;
		}
		.split {
			display: grid;
			gap: 24px;
			grid-template-columns: 1fr 300px;
		}
		.split.visual {
			align-items: center;
			grid-template-columns: 300px 1fr;
		}
		.pattern-panel, .checklist {
			background: #101114;
			border-radius: 22px;
			color: #fff;
			padding: 20px;
		}
		.pattern-panel p {
			color: #dce1e7;
			font-size: 12px;
			margin-top: 12px;
		}
		.steps {
			counter-reset: item;
			display: grid;
			gap: 10px;
			list-style: none;
			margin: 20px 0 0;
			padding: 0;
		}
		.steps li {
			background: #ffffff;
			border: 1px solid #dfe5eb;
			border-radius: 15px;
			color: #565d67;
			font-size: 13px;
			line-height: 1.42;
			padding: 13px 14px;
		}
		.steps strong, .bullets strong { color: #16191d; }
		.phone-grid {
			align-items: start;
			display: grid;
			gap: 24px;
			justify-content: center;
		}
		.phone-grid.two {
			grid-template-columns: repeat(2, 245px);
		}
		.checklist {
			display: flex;
			flex-direction: column;
			gap: 9px;
		}
		.checklist strong {
			font-size: 15px;
			margin-bottom: 3px;
		}
		.checklist span {
			border-top: 1px solid rgba(255, 255, 255, 0.14);
			color: #dce1e7;
			font-size: 12px;
			line-height: 1.3;
			padding-top: 9px;
		}
		.tip-band {
			background: #eef7ff;
			border-color: #cfe6ff;
			box-shadow: none;
		}
		.bullets {
			display: grid;
			gap: 9px;
			list-style: none;
			margin: 0 0 24px;
			padding: 0;
		}
		.bullets li {
			background: #ffffff;
			border: 1px solid #e0e5eb;
			border-radius: 13px;
			color: #4e5560;
			font-size: 13px;
			line-height: 1.4;
			padding: 11px 13px;
		}
		.flow {
			display: grid;
			gap: 14px;
			grid-template-columns: repeat(3, 1fr);
			margin-top: 16px;
		}
		.flow div {
			background: #ffffff;
			border: 1px solid #dfe5eb;
			border-radius: 18px;
			min-height: 142px;
			padding: 16px;
		}
		.flow span {
			align-items: center;
			background: #0a84ff;
			border-radius: 999px;
			color: #fff;
			display: flex;
			font-size: 13px;
			font-weight: 800;
			height: 30px;
			justify-content: center;
			margin-bottom: 18px;
			width: 30px;
		}
		.flow strong {
			display: block;
			font-size: 17px;
			margin-bottom: 8px;
		}
		.flow p {
			font-size: 12px;
			line-height: 1.4;
		}
		.final {
			justify-content: center;
		}
		.footer-note {
			margin-top: 14px;
		}
	</style>
</head>
<body>${pages}</body>
</html>`;

await fs.writeFile(htmlPath, html);

const chromePath =
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const hasLocalChrome = await fs
	.access(chromePath)
	.then(() => true)
	.catch(() => false);
const browser = await chromium.launch({
	executablePath: hasLocalChrome ? chromePath : undefined,
	headless: true,
});
try {
	const page = await browser.newPage({
		deviceScaleFactor: 1,
		viewport: { height: 1123, width: 794 },
	});
	await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
	await page.pdf({
		format: "A4",
		margin: { bottom: "0", left: "0", right: "0", top: "0" },
		path: pdfPath,
		printBackground: true,
		preferCSSPageSize: true,
	});
} finally {
	await browser.close();
}

console.log(`Generated ${pdfPath}`);
