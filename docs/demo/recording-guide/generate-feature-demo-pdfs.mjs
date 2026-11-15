import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const guideDir = path.dirname(__filename);
const rootDir = path.resolve(guideDir, "../../..");
const screenshotDir = path.join(rootDir, "docs", "demo", "screenshots");
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

const playwrightModule = await importBundledPackage("playwright");
const playwright = playwrightModule.default ?? playwrightModule;
const { chromium } = playwright;

const screenshot = (fileName) =>
	pathToFileURL(path.join(screenshotDir, fileName)).href;

const phone = (fileName, caption) => `
	<figure class="phone">
		<img alt="${caption}" src="${screenshot(fileName)}">
		<figcaption>${caption}</figcaption>
	</figure>
`;

const miniPhone = (fileName, caption) => `
	<figure class="phone mini">
		<img alt="${caption}" src="${screenshot(fileName)}">
		<figcaption>${caption}</figcaption>
	</figure>
`;

const step = (number, title, text) => `
	<div class="step-card">
		<span>${number}</span>
		<strong>${title}</strong>
		<p>${text}</p>
	</div>
`;

const feature = (title, text) => `
	<li><strong>${title}</strong><span>${text}</span></li>
`;

const sharedStyle = `
	@page {
		margin: 0;
		size: A4;
	}
	* {
		box-sizing: border-box;
	}
	body {
		margin: 0;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
			"Segoe UI", sans-serif;
		color: #121417;
		background: #e8edf3;
	}
	.page {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 22px;
		width: 210mm;
		height: 297mm;
		padding: 18mm;
		overflow: hidden;
		background: #f7f8fa;
		page-break-after: always;
	}
	.cover {
		display: grid;
		grid-template-columns: 1.02fr 0.98fr;
		align-items: center;
		gap: 24px;
	}
	.cover-copy,
	.stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.eyebrow {
		margin: 0;
		font-size: 11px;
		font-weight: 800;
		color: #0a84ff;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	h1,
	h2,
	h3,
	p {
		margin: 0;
	}
	h1 {
		max-width: 450px;
		font-size: 58px;
		line-height: 0.96;
		letter-spacing: 0;
	}
	h2 {
		max-width: 560px;
		font-size: 38px;
		line-height: 1.04;
		letter-spacing: 0;
	}
	h3 {
		font-size: 19px;
		line-height: 1.18;
	}
	p {
		font-size: 14px;
		line-height: 1.5;
		color: #626873;
	}
	.dek {
		max-width: 430px;
		font-size: 22px;
		font-weight: 650;
		line-height: 1.24;
		color: #31363d;
	}
	.card,
	.callout,
	.tip,
	.step-card,
	.stat,
	.checklist li,
	.fixture {
		padding: 15px;
		background: #ffffff;
		border: 1px solid #dde3ea;
		border-radius: 18px;
		box-shadow: 0 12px 30px rgba(24, 37, 56, 0.06);
	}
	.card strong,
	.callout strong,
	.tip strong {
		display: block;
		margin-bottom: 6px;
		color: #15181d;
	}
	.card,
	.callout,
	.tip {
		font-size: 13px;
		line-height: 1.45;
		color: #4c535d;
	}
	.header-row {
		display: grid;
		grid-template-columns: 1fr 250px;
		align-items: end;
		gap: 18px;
	}
	.split {
		display: grid;
		grid-template-columns: 1fr 300px;
		align-items: center;
		gap: 24px;
	}
	.split.reverse {
		grid-template-columns: 300px 1fr;
	}
	.phone {
		align-self: center;
		width: 238px;
		padding: 8px;
		margin: 0;
		overflow: hidden;
		background: #101114;
		border-radius: 34px;
		box-shadow: 0 18px 44px rgba(21, 31, 46, 0.18);
	}
	.phone img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 27px;
	}
	.phone figcaption {
		padding: 9px 7px 4px;
		font-size: 10px;
		line-height: 1.35;
		color: #d8dde5;
		background: #101114;
	}
	.phone.mini {
		width: 166px;
		border-radius: 28px;
	}
	.phone.mini img {
		border-radius: 22px;
	}
	.phone-grid {
		display: grid;
		justify-content: center;
		align-items: start;
		gap: 16px;
	}
	.phone-grid.two {
		grid-template-columns: repeat(2, 220px);
	}
	.phone-grid.three {
		grid-template-columns: repeat(3, 166px);
	}
	.phone-grid.two .phone {
		width: 220px;
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}
	.step-card {
		min-height: 138px;
		box-shadow: none;
	}
	.step-card span {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		margin-bottom: 14px;
		font-size: 12px;
		font-weight: 800;
		color: #fff;
		background: #0a84ff;
		border-radius: 999px;
	}
	.step-card strong {
		display: block;
		margin-bottom: 7px;
		font-size: 16px;
	}
	.step-card p {
		font-size: 12px;
		line-height: 1.38;
	}
	.checklist {
		display: grid;
		gap: 10px;
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.checklist li {
		display: grid;
		grid-template-columns: 135px 1fr;
		gap: 14px;
		box-shadow: none;
	}
	.checklist strong {
		font-size: 15px;
		color: #15181d;
	}
	.checklist span {
		font-size: 13px;
		line-height: 1.4;
		color: #626873;
	}
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.stat {
		position: relative;
		min-height: 82px;
		padding-left: 17px;
		box-shadow: none;
	}
	.stat::before {
		position: absolute;
		top: 15px;
		bottom: 15px;
		left: 9px;
		width: 5px;
		content: "";
		background: #0a84ff;
		border-radius: 999px;
	}
	.stat strong {
		display: block;
		font-size: 21px;
		line-height: 1.05;
	}
	.stat span {
		display: block;
		margin-top: 5px;
		font-size: 11px;
		line-height: 1.25;
		color: #626873;
	}
	.fixture-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}
	.fixture strong {
		display: block;
		margin-bottom: 5px;
		font-size: 14px;
	}
	.fixture span {
		font-size: 12px;
		line-height: 1.35;
		color: #626873;
	}
	.prompt {
		padding: 15px;
		font-size: 12px;
		line-height: 1.45;
		color: #2d333b;
		background: #eef7ff;
		border: 1px solid #cfe6ff;
		border-radius: 18px;
	}
	.tip {
		background: #eef7ff;
		border-color: #cfe6ff;
		box-shadow: none;
	}
	.footer-note {
		position: absolute;
		right: 18mm;
		bottom: 12mm;
		left: 18mm;
		font-size: 10px;
		line-height: 1.35;
		color: #8a919b;
	}
`;

const featuresHtml = `<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>Viya Features Guide</title>
		<style>${sharedStyle}</style>
	</head>
	<body>
		<section class="page cover">
			<div class="cover-copy">
				<p class="eyebrow">Features guide</p>
				<h1>Viya turns a trip into a ready workspace.</h1>
				<p class="dek">A visual guide to the app flow: sign in, onboard, create a trip, generate modules, upload proof, and finish at readiness.</p>
				<div class="card">
					<strong>Core idea</strong>
					Viya is a trip workspace with an AI assistant inside it. The assistant can ask, generate, adjust, audit, and stage changes across itinerary, Vault, budget, and readiness.
				</div>
			</div>
			${phone("features-08-workspace.png", "Trip workspace: the connected center of the product.")}
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Get started and login</p>
					<h2>The app starts with account-backed trip context.</h2>
					<p>Use the simulator flow: Get started, Continue with Google, Continue on the Google permission prompt, then choose the saved default account.</p>
				</div>
				<div class="callout"><strong>Why it matters</strong> Trips, files, preferences, and readiness need to persist beyond a single chat session.</div>
			</div>
			<div class="phone-grid three">
				${miniPhone("features-01-get-started.png", "Get started: product promise before sign in.")}
				${miniPhone("features-02-login.png", "Login: Continue with Google.")}
				${miniPhone("features-04-google-account-picker.png", "Google: choose the default simulator account.")}
			</div>
			<div class="steps">
				${step("1", "Get Started", "Open Viya from the intro carousel and start the signed-in flow.")}
				${step("2", "Login", "Use Continue with Google and accept the browser handoff prompt.")}
				${step("3", "Account", "Pick the default saved Google account, then return to Viya.")}
			</div>
		</section>

		<section class="page">
			<div class="split">
				<div class="stack">
					<p class="eyebrow">Onboarding and Home</p>
					<h2>Viya collects defaults before planning starts.</h2>
					<p>Onboarding gives Viya reusable travel preferences. Home then becomes the dashboard for suggestions, active trips, and the next planning action.</p>
					<ul class="checklist">
						${feature("Onboarding questions", "Trip vibe, pace, budget, interests, food, companions, suggestion style, and rest needs.")}
						${feature("Home tour", "Dashboard context, trip suggestions, active trip entry points, and path into the Trips tab.")}
						${feature("AI setup value", "The assistant can use preferences as defaults instead of asking the same questions every time.")}
					</ul>
				</div>
				${phone("features-06-home.png", "Home: suggestions and trip entry points.")}
			</div>
		</section>

		<section class="page">
			<div class="split reverse">
				${phone("features-07-create-trip.png", "Create trip: structured manual questions start the workspace.")}
				<div class="stack">
					<p class="eyebrow">Trip tab to New Trip</p>
					<h2>Manual trip creation gives AI clean facts.</h2>
					<p>The demo path uses the Trip tab, New Trip, Manual, then structured answers. This keeps the product grounded before AI generates anything.</p>
					<ul class="checklist">
						${feature("Destination", "Singapore, with Manila as the origin for the demo scenario.")}
						${feature("Dates and travelers", "The live capture uses the 3-4 day shortcut, Work, and 2 travelers.")}
						${feature("Budget and requirements", "PHP 90,000 total budget with moderate strictness and work-leisure planning intent.")}
					</ul>
				</div>
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Trip workspace tour</p>
					<h2>The workspace is where the modules connect.</h2>
					<p>After trip creation, the overview shows the connected surfaces: itinerary, budget, Vault, readiness, and the trip-scoped AI chat.</p>
				</div>
				<div class="callout"><strong>Demo point</strong> The product is not a generic chat screen. AI actions land in specific workspace modules.</div>
			</div>
			<div class="phone-grid two">
				${phone("features-08-workspace.png", "Workspace overview: module cards and readiness status.")}
				${phone("features-13-ai-chat.png", "Ask Viya: trip-scoped AI actions.")}
			</div>
			<div class="stat-grid">
				<div class="stat"><strong>Overview</strong><span>Shows trip status and module entry points.</span></div>
				<div class="stat"><strong>Itinerary</strong><span>Turns trip facts into a timed plan.</span></div>
				<div class="stat"><strong>Vault</strong><span>Stores proof and extracted evidence.</span></div>
				<div class="stat"><strong>Readiness</strong><span>Ends the flow with a travel check.</span></div>
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Generate itinerary</p>
					<h2>AI creates a plan inside the itinerary module.</h2>
					<p>Use the itinerary Viya action to generate the schedule from the Singapore trip context, pacing, budget, and requirements.</p>
				</div>
				<div class="prompt">Prompt backup: Generate a realistic Singapore itinerary for this work-leisure group trip. Keep the pacing balanced, add buffers, keep evenings light, and include one small victory-lap moment.</div>
			</div>
			<div class="phone-grid two">
				${phone("features-09-itinerary.png", "Itinerary: days, stops, meals, and buffers.")}
				${phone("features-13-ai-chat.png", "AI integration: Generate itinerary appears as a trip action.")}
			</div>
			<div class="tip"><strong>What to show</strong> The output should be multi-day, paced, and connected to trip requirements. Do not present a generic attraction list as the final state.</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Upload files in Vault</p>
					<h2>Vault turns trip files into workspace evidence.</h2>
					<p>Start from the empty Vault screen, then upload the fixture documents. TripSync reviews extracted details before linking them to bookings, budget, and readiness.</p>
				</div>
				<div class="callout"><strong>AI integration</strong> Extraction is reviewable. Viya should use evidence from files, not invent confirmed bookings or costs.</div>
			</div>
			<div class="split reverse">
				${phone("features-10-vault-workspace.png", "Workspace switcher: open Vault and related modules.")}
				<div class="fixture-grid">
					<div class="fixture"><strong>Flight</strong><span>Manila to Singapore, confirmation VIYA-SIN-2026, PHP 21,800.</span></div>
					<div class="fixture"><strong>Hotel</strong><span>Marina Bay / City Hall area, confirmation HOTEL-SIN-WIN, PHP 32,400.</span></div>
					<div class="fixture"><strong>Event pass</strong><span>Tech Week Singapore, Marina Bay Sands, badge pickup reminder.</span></div>
					<div class="fixture"><strong>Receipt</strong><span>MRT, SIM, coffee, and airport transfer bundle, SGD 82.</span></div>
					<div class="fixture"><strong>Readiness note</strong><span>Passport, SG Arrival Card, outfit, badge, and travel-day reminders.</span></div>
				</div>
			</div>
		</section>

		<section class="page">
			<div class="split">
				<div class="stack">
					<p class="eyebrow">Budget and readiness</p>
					<h2>Spend and preparedness update from evidence.</h2>
					<p>The live starter workspace begins with the PHP planning ceiling and no expenses. After Vault evidence is reviewed, Budget and Readiness can be synced from proof.</p>
					<ul class="checklist">
						${feature("Budget AI", "Syncs confirmed flight, hotel, and receipt evidence against the PHP 90,000 ceiling.")}
						${feature("Readiness AI", "Audits documents, bookings, budget, buffers, safety, and schedule load.")}
						${feature("Finish line", "The prepared state should become visible in the module, not just described by chat.")}
					</ul>
				</div>
				<div class="phone-grid two">
					${miniPhone("features-11-budget.png", "Budget: evidence-backed spend.")}
					${miniPhone("features-12-readiness.png", "Readiness: starts open until proof is reviewed.")}
				</div>
			</div>
		</section>

		<section class="page">
			<div class="split reverse">
				${phone("features-13-ai-chat.png", "Ask Viya: trip-aware questions after readiness.")}
				<div class="stack">
					<p class="eyebrow">Ask Viya in the trip</p>
					<h2>End by asking questions from the completed workspace.</h2>
					<p>After the modules are connected, Ask Viya should answer from itinerary, Vault, budget, and readiness context.</p>
					<div class="prompt">Question 1: What is the smartest next thing to check before departure, and what evidence are you using from the workspace?</div>
					<div class="prompt">Question 2: Once readiness is complete, what should we watch on travel day so the schedule stays light and the budget stays on track?</div>
					<div class="tip"><strong>End frame</strong> Finish on the connected trip workspace overview or the readiness module after checks are complete.</div>
				</div>
			</div>
		</section>
	</body>
</html>`;

const demoHtml = `<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>Viya Demo Guide</title>
		<style>${sharedStyle}</style>
	</head>
	<body>
		<section class="page cover">
			<div class="cover-copy">
				<p class="eyebrow">Recording guide</p>
				<h1>Viya demo flow, screen by screen.</h1>
				<p class="dek">Use this while watching the recorded walkthrough. It follows the exact story from Get Started to the final trip-aware AI questions.</p>
				<div class="card">
					<strong>Scenario</strong>
					Singapore work-leisure group trip with a PHP 90,000 planning ceiling. The recording guide still includes optional fixture documents for the Vault and readiness portion.
				</div>
			</div>
			${phone("features-01-get-started.png", "Start: Get Started on the intro carousel.")}
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Opening sequence</p>
					<h2>Get Started, Login, and Onboarding.</h2>
					<p>The recording begins before the workspace exists. This shows that Viya has a real account flow and collects preferences before planning.</p>
				</div>
				<div class="callout"><strong>Onboarding answers</strong> Luxury, Moderate, Mid-range, Food, Culture, Hidden gems, Local eats, Work, Give me options, Rest breaks.</div>
			</div>
			<div class="phone-grid three">
				${miniPhone("features-01-get-started.png", "Get Started.")}
				${miniPhone("features-02-login.png", "Continue with Google.")}
				${miniPhone("features-04-google-account-picker.png", "Choose the default account.")}
			</div>
			<div class="steps">
				${step("1", "Get Started", "Tap the app entry button from the carousel.")}
				${step("2", "Google Login", "Use Continue with Google and the saved simulator account.")}
				${step("3", "Onboarding", "Answer the preference questions, then land on Home.")}
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Home to trip creation</p>
					<h2>Home tour, Trip tab, New Trip, Manual.</h2>
					<p>Show Home briefly, then create the Singapore trip through the manual question flow. The goal is structured facts before AI generation.</p>
				</div>
				<div class="callout"><strong>Manual answers</strong> Singapore, 3-4 days, Work, 2 travelers, Food, Culture, Work + leisure, Balanced pace, PHP 90,000 total budget.</div>
			</div>
			<div class="phone-grid three">
				${miniPhone("features-06-home.png", "Home tour.")}
				${miniPhone("features-07-create-trip.png", "Manual trip question flow.")}
				${miniPhone("features-08-workspace.png", "Workspace opens after creation.")}
			</div>
			<div class="tip"><strong>Voiceover cue</strong> The trip is no longer just text. It is a workspace with destination, dates, travelers, budget, requirements, and purpose.</div>
		</section>

		<section class="page">
			<div class="split">
				<div class="stack">
					<p class="eyebrow">Workspace tour</p>
					<h2>Show the modules before using AI actions.</h2>
					<p>Open the workspace overview and point to the core modules: itinerary, budget, Vault, readiness, and Ask Viya. Do not use a one-click autopilot card.</p>
					<ul class="checklist">
						${feature("Itinerary", "Where the schedule and day-by-day plan lives.")}
						${feature("Vault", "Where uploaded proof and TripSync reviews live.")}
						${feature("Budget", "Where costs, receipts, and remaining room are tracked.")}
						${feature("Readiness", "Where the final travel preparedness score is confirmed.")}
					</ul>
				</div>
				${phone("features-08-workspace.png", "Trip workspace overview.")}
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Generate itinerary</p>
					<h2>Open Itinerary and use the AI action.</h2>
					<p>Tap the module Viya button, choose Generate itinerary, then return to Itinerary and hold on the generated days and stops.</p>
				</div>
				<div class="prompt">Expected result: a balanced Singapore itinerary with practical buffers, meals, light evenings, estimated costs, and one small victory-lap moment.</div>
			</div>
			<div class="phone-grid two">
				${phone("features-13-ai-chat.png", "Ask Viya action: Generate itinerary.")}
				${phone("features-09-itinerary.png", "Generated itinerary result.")}
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Upload files in Vault</p>
					<h2>TripSync grounds the workspace in proof.</h2>
					<p>Upload each fixture file and confirm the review before moving to the next one. This is the proof layer for budget and readiness.</p>
				</div>
				<div class="callout"><strong>Fixture folder</strong> docs/demo/fixtures/</div>
			</div>
			<div class="split reverse">
				${phone("features-10-vault-workspace.png", "Open Vault from the workspace switcher.")}
				<div class="fixture-grid">
					<div class="fixture"><strong>Flight confirmation</strong><span>Creates confirmed flight booking and transport readiness evidence.</span></div>
					<div class="fixture"><strong>Hotel voucher</strong><span>Creates confirmed hotel booking and schedule readiness evidence.</span></div>
					<div class="fixture"><strong>Tech Week pass</strong><span>Creates event proof and badge pickup readiness evidence.</span></div>
					<div class="fixture"><strong>Expense receipt</strong><span>Links SGD 82 transport evidence into budget context.</span></div>
					<div class="fixture"><strong>Readiness note</strong><span>Grounds passport, SG Arrival Card, outfit, safety, weather, and backup reminders.</span></div>
				</div>
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Budget sync</p>
					<h2>Show the budget after Vault evidence exists.</h2>
					<p>Open Budget, use Sync budget, then show the PHP 90,000 planning ceiling, confirmed evidence, receipt context, and remaining room.</p>
				</div>
				<div class="prompt">Prompt backup: Review this Singapore trip budget against the PHP 90,000 planning ceiling. Use confirmed flight, hotel, and receipt evidence from Vault.</div>
			</div>
			<div class="split reverse">
				${phone("features-11-budget.png", "Budget: synced spend and remaining room.")}
				<ul class="checklist">
					${feature("What to say", "Budget is using reviewed workspace evidence, not invented AI numbers.")}
					${feature("What to show", "Remaining room, confirmed costs, daily spend context, and linked receipt evidence.")}
					${feature("Success check", "The receipt is no longer just a file; it affects the budget story.")}
				</ul>
			</div>
		</section>

		<section class="page">
			<div class="header-row">
				<div>
					<p class="eyebrow">Readiness to 100%</p>
					<h2>Readiness is the finish line.</h2>
					<p>Open Readiness, use Complete readiness after evidence is available, then hold on the resolved state. This is where the plan, files, budget, and checks come together.</p>
				</div>
				<div class="prompt">Prompt backup: Audit this Singapore trip for travel preparedness across documents, bookings, budget, receipt evidence, buffers, packing, and schedule load.</div>
			</div>
			<div class="split">
				<ul class="checklist">
					${feature("Documents", "Passport validity, SG Arrival Card, event pass, and travel proof.")}
					${feature("Bookings", "Flight, hotel, and event details are confirmed through Vault evidence.")}
					${feature("Travel day", "Airport transfer buffers, light conference pacing, and schedule overload checks.")}
					${feature("End state", "No open gaps once the required evidence and checklist items are resolved.")}
				</ul>
				${phone("features-12-readiness.png", "Readiness: starter state before proof is reviewed.")}
			</div>
		</section>

		<section class="page">
			<div class="split reverse">
				${phone("features-13-ai-chat.png", "Trip-aware Ask Viya questions.")}
				<div class="stack">
					<p class="eyebrow">Final AI questions</p>
					<h2>Open Ask Viya inside the trip and ask from the workspace.</h2>
					<p>The final questions should be answered using the selected Singapore trip context: itinerary, Vault, budget, and readiness.</p>
					<div class="prompt">Question 1: For my Singapore trip, what is the smartest next thing to check before departure, and what evidence are you using from the workspace?</div>
					<div class="prompt">Question 2: Once readiness is complete, what should we watch on travel day so the schedule stays light and the budget stays on track?</div>
					<div class="tip"><strong>End</strong> Finish on Readiness after checks are resolved or the connected workspace overview.</div>
				</div>
			</div>
		</section>
	</body>
</html>`;

const outputs = [
	{
		html: path.join(guideDir, "features.html"),
		pdf: path.join(guideDir, "features.pdf"),
		source: featuresHtml,
	},
	{
		html: path.join(guideDir, "demo.html"),
		pdf: path.join(guideDir, "demo.pdf"),
		source: demoHtml,
	},
];

for (const output of outputs) {
	await fs.writeFile(output.html, output.source);
}

const chromeExecutable =
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
	executablePath: chromeExecutable,
	headless: true,
});

try {
	for (const output of outputs) {
		const page = await browser.newPage();
		await page.goto(pathToFileURL(output.html).href, {
			waitUntil: "networkidle",
		});
		await page.pdf({
			path: output.pdf,
			format: "A4",
			printBackground: true,
			preferCSSPageSize: true,
		});
		await page.close();
		console.log(output.pdf);
	}
} finally {
	await browser.close();
}
