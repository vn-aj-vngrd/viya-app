# Trip Workspace UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the trip workspace UI by removing colored accent backgrounds, flattening list rows, and standardising add/edit actions across all module screens.

**Architecture:** Apply a consistent ruleset inline — no new abstractions. Cards only for repeated+clickable elements; white chips with `border-border`; sections via gap+heading; add actions via header `+` button; edit/delete via row `ellipsis-horizontal` menu.

**Tech Stack:** React Native, Expo Router, NativeWind (Tailwind), heroui-native (`Surface`, `Menu`, `Button`, `Text`), `@expo/vector-icons` Ionicons.

---

## Files Modified

| File | Changes |
|---|---|
| `apps/native/src/features/trips/trip-dashboard-components.tsx` | Section borders, InfoRow borders, module tile badges, TripHero border |
| `apps/native/src/features/trips/trip-itinerary-screen.tsx` | MetaPill chips, day circle, flat stop rows, day header ellipsis |
| `apps/native/src/features/budget/trip-budget-screen.tsx` | Overview card, expense icon, expense row ellipsis, section borders |
| `apps/native/src/features/readiness/readiness-screen.tsx` | Score card Surface, ReadinessPill border, ReadinessMetric, header add button |
| `apps/native/src/features/readiness/readiness-item-row.tsx` | Icon badge, row pills, edit/delete → ellipsis |
| `apps/native/src/features/vault/vault-preview-card.tsx` | Icon badge, edit/delete → ellipsis |
| `apps/native/src/features/vault/trip-vault-screen.tsx` | Status block Surface wrapper |

---

## Task 1: Remove Section and InfoRow border dividers

**Files:**
- Modify: `apps/native/src/features/trips/trip-dashboard-components.tsx`

- [ ] **Step 1: Update `Section` component — remove `border-t` and change icon to muted**

In `trip-dashboard-components.tsx`, replace the `Section` function body:

```tsx
export function Section({
	children,
	icon,
	title,
}: {
	children: ReactNode;
	icon?: IoniconName;
	title: string;
}) {
	return (
		<View className="gap-3 py-2">
			<View className="flex-row items-center gap-2">
				{icon ? <Ionicons color={mutedColor} name={icon} size={18} /> : null}
				<Text.Heading type="h5" weight="semibold">
					{title}
				</Text.Heading>
			</View>
			{children}
		</View>
	);
}
```

- [ ] **Step 2: Update `InfoRow` component — remove `border-t`**

Replace the `InfoRow` function body:

```tsx
export function InfoRow({
	detail,
	icon,
	label,
	right,
}: {
	detail?: string;
	icon?: IoniconName;
	label: string;
	right?: string;
}) {
	return (
		<View className="flex-row items-center gap-3 py-2">
			{icon ? <Ionicons color={accentColor} name={icon} size={18} /> : null}
			<View className="min-w-0 flex-1">
				<Text numberOfLines={1} type="body-sm" weight="semibold">
					{label}
				</Text>
				{detail ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{detail}
					</Text>
				) : null}
			</View>
			{right ? (
				<Text color="muted" numberOfLines={1} type="body-xs">
					{right}
				</Text>
			) : null}
		</View>
	);
}
```

- [ ] **Step 3: Run linter**

```bash
bun x ultracite check apps/native/src/features/trips/trip-dashboard-components.tsx
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/native/src/features/trips/trip-dashboard-components.tsx
git commit -m "refactor(workspace): remove border dividers from Section and InfoRow"
```

---

## Task 2: Clean module tile badge backgrounds

**Files:**
- Modify: `apps/native/src/features/trips/trip-dashboard-components.tsx`

- [ ] **Step 1: Update `ModuleLauncherBadge` non-active state**

Replace the non-active `return` in `ModuleLauncherBadge` (the `if (isActive)` branch is unchanged):

```tsx
	return (
		<View className="min-w-0 max-w-28 shrink items-center rounded-full border border-border bg-white px-2 py-1">
			<Text
				numberOfLines={1}
				style={{ color: accent.color }}
				type="body-xs"
				weight="semibold"
			>
				{value}
			</Text>
		</View>
	);
```

- [ ] **Step 2: Update `ModuleLauncherTile` icon container**

Find this block inside `ModuleLauncherTile`:

```tsx
					<View
						className="h-9 w-9 items-center justify-center rounded-2xl"
						style={{ backgroundColor: accent.bg }}
					>
```

Replace with:

```tsx
					<View className="h-9 w-9 items-center justify-center rounded-2xl bg-surface-secondary">
```

- [ ] **Step 3: Update `WorkspaceModuleTile` icon container and value badge**

Find the icon container inside `WorkspaceModuleTile`:

```tsx
						<View
							className="h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
							style={{ backgroundColor: accent.bg }}
						>
```

Replace with:

```tsx
						<View className="h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary">
```

Then find the value badge in `WorkspaceModuleTile`:

```tsx
						<View
							className="min-w-0 max-w-28 shrink rounded-full px-2.5 py-1"
							style={{ backgroundColor: accent.bg }}
						>
							<Text
								numberOfLines={1}
								style={{ color: accent.color }}
								type="body-xs"
								weight="semibold"
							>
								{item.value}
							</Text>
						</View>
```

Replace with:

```tsx
						<View className="min-w-0 max-w-28 shrink rounded-full border border-border bg-white px-2.5 py-1">
							<Text
								numberOfLines={1}
								style={{ color: accent.color }}
								type="body-xs"
								weight="semibold"
							>
								{item.value}
							</Text>
						</View>
```

- [ ] **Step 4: Run linter**

```bash
bun x ultracite check apps/native/src/features/trips/trip-dashboard-components.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/native/src/features/trips/trip-dashboard-components.tsx
git commit -m "refactor(workspace): replace accent-fill badges with white+border chips in module tiles"
```

---

## Task 3: Remove TripHero metrics border

**Files:**
- Modify: `apps/native/src/features/trips/trip-dashboard-components.tsx`

- [ ] **Step 1: Remove `border-border border-t` from metrics row in `TripHero`**

Find:

```tsx
			<View className="flex-row items-stretch gap-4 border-border border-t pt-4">
```

Replace with:

```tsx
			<View className="flex-row items-stretch gap-4 pt-4">
```

- [ ] **Step 2: Run linter and commit**

```bash
bun x ultracite check apps/native/src/features/trips/trip-dashboard-components.tsx
git add apps/native/src/features/trips/trip-dashboard-components.tsx
git commit -m "refactor(workspace): remove border divider from TripHero metrics row"
```

---

## Task 4: White chips for ItineraryMetaPill

**Files:**
- Modify: `apps/native/src/features/trips/trip-itinerary-screen.tsx`

- [ ] **Step 1: Replace `ItineraryMetaPill` with white chip variant**

Replace the entire `ItineraryMetaPill` function:

```tsx
function ItineraryMetaPill({
	icon,
	label,
	tone = "neutral",
}: {
	icon: IoniconName;
	label: string;
	tone?: "accent" | "neutral" | "warning";
}) {
	const toneColors = {
		accent: ITINERARY_ACCENT_COLOR,
		neutral: ITINERARY_MUTED_COLOR,
		warning: ITINERARY_WARNING_COLOR,
	} as const;
	const color = toneColors[tone];

	return (
		<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1.5">
			<Ionicons color={color} name={icon} size={13} />
			<Text
				numberOfLines={1}
				style={{ color }}
				type="body-xs"
				weight="semibold"
			>
				{label}
			</Text>
		</View>
	);
}
```

- [ ] **Step 2: Run linter**

```bash
bun x ultracite check apps/native/src/features/trips/trip-itinerary-screen.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/native/src/features/trips/trip-itinerary-screen.tsx
git commit -m "refactor(itinerary): replace colored MetaPill backgrounds with white+border chips"
```

---

## Task 5: Clean itinerary day circle and timeline node backgrounds

**Files:**
- Modify: `apps/native/src/features/trips/trip-itinerary-screen.tsx`

- [ ] **Step 1: Update day number circle in `ItineraryDaySurface`**

Find inside `ItineraryDaySurface`:

```tsx
				<View
					className="h-12 w-12 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(10, 132, 255, 0.1)" }}
				>
```

Replace with:

```tsx
				<View className="h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
```

- [ ] **Step 2: Update default/pending circle in `ItineraryTimelineNode`**

In `getNodeAppearance` inside `ItineraryTimelineNode`, find the default return:

```tsx
		return {
			backgroundColor: "rgba(10, 132, 255, 0.1)",
			iconColor: ITINERARY_ACCENT_COLOR,
			iconName: getCategoryIcon(category),
		};
```

Replace with:

```tsx
		return {
			backgroundColor: undefined,
			iconColor: ITINERARY_ACCENT_COLOR,
			iconName: getCategoryIcon(category),
		};
```

Then update the `Pressable` inside `ItineraryTimelineNode` to use a className for the default background:

Find:

```tsx
			className="h-9 w-9 items-center justify-center rounded-full"
			disabled={isPending}
			onPress={onToggleComplete}
			style={({ pressed }) => ({
				backgroundColor: appearance.backgroundColor,
				opacity: isPending ? 0.6 : 1,
				transform: [{ scale: pressed ? 0.9 : 1 }],
			})}
```

Replace with:

```tsx
			className={`h-9 w-9 items-center justify-center rounded-full ${appearance.backgroundColor === undefined ? "bg-surface-secondary" : ""}`}
			disabled={isPending}
			onPress={onToggleComplete}
			style={({ pressed }) => ({
				backgroundColor: appearance.backgroundColor,
				opacity: isPending ? 0.6 : 1,
				transform: [{ scale: pressed ? 0.9 : 1 }],
			})}
```

- [ ] **Step 3: Run linter**

```bash
bun x ultracite check apps/native/src/features/trips/trip-itinerary-screen.tsx
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/native/src/features/trips/trip-itinerary-screen.tsx
git commit -m "refactor(itinerary): replace colored circle backgrounds with surface-secondary"
```

---

## Task 6: Flat stop rows in itinerary day detail

**Files:**
- Modify: `apps/native/src/features/trips/trip-itinerary-screen.tsx`

- [ ] **Step 1: Remove outer card wrapper from stop list in `ItineraryPlannedDayContent`**

Find:

```tsx
			{dayItems.length === 0 ? (
				<EmptyPlannedDayContent onAddStop={onAddStop} />
			) : (
				<View className="rounded-[28px] border border-border bg-white p-4">
					{dayItems.map((item, index) => (
						<ItineraryItemCard
							bookingLabel={
								item.bookingId
									? (bookingLabelById.get(item.bookingId) ?? "Booking linked")
									: null
							}
							isLast={index === dayItems.length - 1}
							isPending={pendingItemId === item._id}
							item={item}
							key={item._id}
							onDelete={() => onDeleteItem(item._id)}
							onEdit={() => onEditItem(item)}
							onOpenBooking={onOpenBooking}
							onOpenMaps={() => onOpenMaps(item)}
							onToggleComplete={() => onToggleComplete(item)}
							onToggleSkip={() => onToggleSkip(item)}
						/>
					))}
				</View>
			)}
```

Replace with:

```tsx
			{dayItems.length === 0 ? (
				<EmptyPlannedDayContent onAddStop={onAddStop} />
			) : (
				<View>
					{dayItems.map((item, index) => (
						<ItineraryItemCard
							bookingLabel={
								item.bookingId
									? (bookingLabelById.get(item.bookingId) ?? "Booking linked")
									: null
							}
							isLast={index === dayItems.length - 1}
							isPending={pendingItemId === item._id}
							item={item}
							key={item._id}
							onDelete={() => onDeleteItem(item._id)}
							onEdit={() => onEditItem(item)}
							onOpenBooking={onOpenBooking}
							onOpenMaps={() => onOpenMaps(item)}
							onToggleComplete={() => onToggleComplete(item)}
							onToggleSkip={() => onToggleSkip(item)}
						/>
					))}
				</View>
			)}
```

- [ ] **Step 2: Add border-b separator to `ItineraryItemCard` rows**

Find the outer `View` in `ItineraryItemCard`:

```tsx
	return (
		<View className="flex-row gap-3">
```

Replace with:

```tsx
	return (
		<View className={`flex-row gap-3 ${isLast ? "" : "border-border border-b pb-2"}`}>
```

Then find the content `View` that currently uses `pb-6` / `pb-1`:

```tsx
			<View
				className={`min-w-0 flex-1 gap-1.5 ${isLast ? "pb-1" : "pb-6"}`}
```

Replace with:

```tsx
			<View
				className={`min-w-0 flex-1 gap-1.5 ${isLast ? "pb-1" : "pb-4"}`}
```

- [ ] **Step 3: Remove Surface wrapper from `EmptyPlannedDayContent`**

Replace `EmptyPlannedDayContent`:

```tsx
function EmptyPlannedDayContent({ onAddStop }: { onAddStop: () => void }) {
	return (
		<View className="items-center gap-3 py-6">
			<View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
				<Ionicons
					color={ITINERARY_ACCENT_COLOR}
					name="time-outline"
					size={21}
				/>
			</View>
			<View className="items-center gap-1">
				<Text color="muted" type="body-sm" weight="semibold">
					No stops yet
				</Text>
				<Text color="muted" numberOfLines={2} type="body-xs">
					Add the first stop when the timing is ready.
				</Text>
			</View>
			<ItineraryQuietActionButton
				icon="add-circle-outline"
				label="Add stop"
				onPress={onAddStop}
			/>
		</View>
	);
}
```

- [ ] **Step 4: Run linter**

```bash
bun x ultracite check apps/native/src/features/trips/trip-itinerary-screen.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/native/src/features/trips/trip-itinerary-screen.tsx
git commit -m "refactor(itinerary): flatten stop rows, remove outer card wrapper and empty state background"
```

---

## Task 7: Replace day header edit/delete buttons with ellipsis menu

**Files:**
- Modify: `apps/native/src/features/trips/trip-itinerary-screen.tsx`

`Menu` is already imported from `heroui-native` in this file.

- [ ] **Step 1: Replace the action button group in `ItineraryPlannedDayContent` header**

Find the `<View className="flex-row items-center gap-2">` block that contains the edit pencil + delete trash + add buttons. It looks like:

```tsx
					<View className="flex-row items-center gap-2">
						<Pressable
							accessibilityLabel="Edit itinerary day"
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
							onPress={() => onEditDay(day)}
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons
								color={ITINERARY_ACCENT_COLOR}
								name="create-outline"
								size={19}
							/>
						</Pressable>
						<Pressable
							accessibilityLabel="Delete itinerary day"
							accessibilityRole="button"
							accessibilityState={{ disabled: isDeletingDay }}
							className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
							disabled={isDeletingDay}
							onPress={() => onDeleteDay(day._id)}
							style={({ pressed }) => ({
								opacity: isDeletingDay ? 0.5 : 1,
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							{isDeletingDay ? (
								<Spinner size="sm" />
							) : (
								<Ionicons
									color={ITINERARY_DANGER_COLOR}
									name="trash-outline"
									size={19}
								/>
							)}
						</Pressable>
						<Pressable
							accessibilityLabel="Add itinerary stop"
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full bg-accent"
							onPress={onAddStop}
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons color="#FFFFFF" name="add" size={21} />
						</Pressable>
					</View>
```

Replace with:

```tsx
					<View className="flex-row items-center gap-2">
						<Menu>
							<Menu.Trigger asChild={true}>
								<Pressable
									accessibilityLabel="Day options"
									accessibilityRole="button"
									className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
									style={({ pressed }) => ({
										transform: [{ scale: pressed ? 0.94 : 1 }],
									})}
								>
									<Ionicons
										color={ITINERARY_MUTED_COLOR}
										name="ellipsis-horizontal"
										size={18}
									/>
								</Pressable>
							</Menu.Trigger>
							<Menu.Portal>
								<Menu.Overlay />
								<Menu.Content
									align="end"
									className="rounded-[24px] border border-border bg-surface p-2"
									offset={8}
									placement="bottom"
									presentation="popover"
									width={200}
								>
									<ItineraryMenuItem
										icon="create-outline"
										label="Edit day"
										onPress={() => onEditDay(day)}
									/>
									<View className="mx-2 my-1 h-px bg-border" />
									<ItineraryMenuItem
										icon="trash-outline"
										label="Delete day"
										onPress={() => onDeleteDay(day._id)}
										tone="danger"
									/>
								</Menu.Content>
							</Menu.Portal>
						</Menu>
						<Pressable
							accessibilityLabel="Add itinerary stop"
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full bg-accent"
							onPress={onAddStop}
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons color="#FFFFFF" name="add" size={21} />
						</Pressable>
					</View>
```

Note: `isDeletingDay`, `Spinner` are no longer referenced in this block. Check if `isDeletingDay` and `Spinner` are still used elsewhere in `ItineraryPlannedDayContent`. If `Spinner` is only used there, remove its import from heroui-native.

- [ ] **Step 2: Run linter — it will flag unused imports if Spinner is no longer needed**

```bash
bun x ultracite check apps/native/src/features/trips/trip-itinerary-screen.tsx
```

Fix any unused import warnings.

- [ ] **Step 3: Commit**

```bash
git add apps/native/src/features/trips/trip-itinerary-screen.tsx
git commit -m "refactor(itinerary): replace day edit/delete buttons with ellipsis overflow menu"
```

---

## Task 8: Budget overview card and section cleanup

**Files:**
- Modify: `apps/native/src/features/budget/trip-budget-screen.tsx`

- [ ] **Step 1: Replace `BudgetOverviewCard` — remove Surface, clean icon badge, status chip, and progress box**

Replace the entire `BudgetOverviewCard` function:

```tsx
function BudgetOverviewCard({
	budgetStatus,
	dailySafeSpendLabel,
	onOpenBudgetEditor,
	plannedBudgetLabel,
	progress,
	remainingAmountLabel,
	totalTrackedSpendLabel,
}: {
	budgetStatus: string;
	dailySafeSpendLabel: string;
	onOpenBudgetEditor: () => void;
	plannedBudgetLabel: string;
	progress: number;
	remainingAmountLabel: string;
	totalTrackedSpendLabel: string;
}) {
	return (
		<View className="gap-3">
			<View className="flex-row items-center gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
					<Ionicons color={budgetAccentColor} name="wallet-outline" size={20} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						BUDGET STATUS
					</Text>
					<Text.Heading numberOfLines={1} type="h3" weight="semibold">
						{remainingAmountLabel}
					</Text.Heading>
					<Text color="muted" numberOfLines={1} type="body-xs">
						{dailySafeSpendLabel} safe daily spend
					</Text>
				</View>
				<View className="rounded-full border border-border bg-white px-3 py-1.5">
					<Text
						numberOfLines={1}
						style={{ color: budgetAccentColor }}
						type="body-xs"
						weight="bold"
					>
						{budgetStatus}
					</Text>
				</View>
			</View>

			<View className="gap-2">
				<ProgressBar progress={progress} />
				<View className="flex-row justify-between gap-3">
					<Text color="muted" type="body-xs">
						{totalTrackedSpendLabel} spent
					</Text>
					<Text color="muted" type="body-xs">
						{plannedBudgetLabel} budget
					</Text>
				</View>
			</View>

			<View className="flex-row items-stretch gap-4 pt-2">
				<BudgetSnapshotStat
					detail="Logged"
					label="Spent"
					value={totalTrackedSpendLabel}
				/>
				<View className="w-px self-stretch bg-border" />
				<BudgetSnapshotStat label="Daily" value={dailySafeSpendLabel} />
				<View className="w-px self-stretch bg-border" />
				<BudgetSnapshotStat
					align="flex-end"
					label="Budget"
					value={plannedBudgetLabel}
				/>
			</View>

			<Button onPress={onOpenBudgetEditor} size="sm" variant="secondary">
				<Ionicons color={budgetAccentColor} name="create-outline" size={15} />
				<Button.Label>Edit budget</Button.Label>
			</Button>
		</View>
	);
}
```

- [ ] **Step 2: Remove Surface wrapper from budget editor form**

Find the block that starts with:

```tsx
		<Surface className="gap-4 rounded-[26px] border border-border bg-surface p-5">
			<SectionTitle icon="create-outline" title="Trip budget" />
```

and ends with:

```tsx
		</Surface>
```

Replace the opening tag with `<View className="gap-4">` and the closing `</Surface>` with `</View>`. The content inside stays unchanged.

- [ ] **Step 3: Remove Surface wrapper from expense list**

Find:

```tsx
					<Surface className="overflow-hidden rounded-[30px] border border-border bg-surface">
```

Replace with:

```tsx
					<View>
```

And replace the corresponding `</Surface>` closing tag with `</View>`.

- [ ] **Step 4: Update `SectionTitle` icon color to muted**

Find:

```tsx
function SectionTitle({
	icon,
	title,
}: {
	icon: ComponentProps<typeof Ionicons>["name"];
	title: string;
}) {
	return (
		<View className="flex-row items-center gap-2">
			<Ionicons color={budgetAccentColor} name={icon} size={18} />
			<Text.Heading type="h5" weight="semibold">
				{title}
			</Text.Heading>
		</View>
	);
}
```

Replace the icon color:

```tsx
function SectionTitle({
	icon,
	title,
}: {
	icon: ComponentProps<typeof Ionicons>["name"];
	title: string;
}) {
	return (
		<View className="flex-row items-center gap-2">
			<Ionicons color="#71717A" name={icon} size={18} />
			<Text.Heading type="h5" weight="semibold">
				{title}
			</Text.Heading>
		</View>
	);
}
```

- [ ] **Step 6: Check Surface import — remove if no longer used**

```bash
grep -n "Surface" apps/native/src/features/budget/trip-budget-screen.tsx
```

If `Surface` no longer appears in JSX, remove it from the heroui-native import line.

- [ ] **Step 7: Run linter**

```bash
bun x ultracite check apps/native/src/features/budget/trip-budget-screen.tsx
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/native/src/features/budget/trip-budget-screen.tsx
git commit -m "refactor(budget): remove Surface wrappers, clean SectionTitle icon, overview card, expense list"
```

---

## Task 9: Budget ExpenseRow — clean icon badge and add ellipsis menu

**Files:**
- Modify: `apps/native/src/features/budget/trip-budget-screen.tsx`

`Menu` needs to be imported. Check if it is already:

```bash
grep "Menu" apps/native/src/features/budget/trip-budget-screen.tsx | head -3
```

If not present, add `Menu` to the heroui-native import at the top of the file.

- [ ] **Step 1: Add `Menu` to heroui-native imports if missing**

Find the heroui-native import line (it currently includes `BottomSheet, Button, CloseButton, Input, Label, Spinner, Surface, Text, TextField`) and add `, Menu`:

```tsx
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Menu,
	Spinner,
	Text,
	TextField,
} from "heroui-native";
```

- [ ] **Step 2: Replace `ExpenseRow` function**

Replace the entire `ExpenseRow` function:

```tsx
function ExpenseRow({
	bookingLabel,
	deletingExpenseId,
	expense,
	onDelete,
	onEdit,
	onOpenReceipt,
	receiptLabel,
	receiptUrl,
	tripId,
}: {
	bookingLabel?: string;
	deletingExpenseId: Id<"expenses"> | null;
	expense: Doc<"expenses">;
	onDelete: (expenseId: Id<"expenses">) => void;
	onEdit: (expense: Doc<"expenses">) => void;
	onOpenReceipt: (url: string) => void;
	receiptLabel?: string;
	receiptUrl?: string | null;
	tripId: Id<"trips">;
}) {
	const isDeletingThis = deletingExpenseId === expense._id;

	return (
		<View className="flex-row items-start gap-3 border-border border-b px-4 py-3.5 last:border-b-0">
			<View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
				<Ionicons color={budgetAccentColor} name="receipt-outline" size={18} />
			</View>
			<View className="min-w-0 flex-1 gap-0.5">
				<View className="flex-row items-start justify-between gap-3">
					<View className="min-w-0 flex-1">
						<Text numberOfLines={1} type="body-sm" weight="semibold">
							{expense.title}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{formatStatus(expense.category)} · {expense.spentAt}
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<Text type="body-sm" weight="semibold">
							{formatMoney(expense.amount, expense.currency)}
						</Text>
						<Menu>
							<Menu.Trigger asChild={true}>
								<Pressable
									accessibilityLabel="Expense options"
									accessibilityRole="button"
									accessibilityState={{ disabled: isDeletingThis }}
									className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary"
									disabled={isDeletingThis}
									style={({ pressed }) => ({
										opacity: isDeletingThis ? 0.5 : 1,
										transform: [{ scale: pressed ? 0.94 : 1 }],
									})}
								>
									<Ionicons
										color="#71717A"
										name="ellipsis-horizontal"
										size={16}
									/>
								</Pressable>
							</Menu.Trigger>
							<Menu.Portal>
								<Menu.Overlay />
								<Menu.Content
									align="end"
									className="rounded-[24px] border border-border bg-surface p-2"
									offset={8}
									placement="bottom"
									presentation="popover"
									width={200}
								>
									<Menu.Item
										accessibilityLabel="Edit expense"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										onPress={() => onEdit(expense)}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
											<Ionicons color={budgetAccentColor} name="create-outline" size={16} />
										</View>
										<Menu.ItemTitle className="font-semibold text-sm">Edit</Menu.ItemTitle>
									</Menu.Item>
									<View className="mx-2 my-1 h-px bg-border" />
									<Menu.Item
										accessibilityLabel="Delete expense"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										onPress={() => onDelete(expense._id)}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
											<Ionicons color="#FF3B30" name="trash-outline" size={16} />
										</View>
										<Menu.ItemTitle className="font-semibold text-danger text-sm">Delete</Menu.ItemTitle>
									</Menu.Item>
								</Menu.Content>
							</Menu.Portal>
						</Menu>
					</View>
				</View>
				{expense.bookingId || expense.vaultItemId ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{[
							expense.bookingId ? `Booking ${bookingLabel ?? "linked"}` : null,
							expense.vaultItemId
								? `Receipt ${receiptLabel ?? "linked"}`
								: null,
						]
							.filter(Boolean)
							.join(" · ")}
					</Text>
				) : null}
				{expense.bookingId || receiptUrl ? (
					<View className="flex-row flex-wrap gap-2 pt-1">
						{expense.bookingId ? (
							<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
								<Button size="sm" variant="secondary">
									<Ionicons
										color={budgetAccentColor}
										name="ticket-outline"
										size={15}
									/>
									<Button.Label>Open booking</Button.Label>
								</Button>
							</Link>
						) : null}
						{receiptUrl ? (
							<Button
								onPress={() => onOpenReceipt(receiptUrl)}
								size="sm"
								variant="secondary"
							>
								<Ionicons
									color={budgetAccentColor}
									name="document-attach-outline"
									size={15}
								/>
								<Button.Label>Open receipt</Button.Label>
							</Button>
						) : null}
					</View>
				) : null}
			</View>
		</View>
	);
}
```

Note: `Pressable` needs to be in scope. Check the imports at the top of the file — if `Pressable` is not imported from `react-native`, add it.

- [ ] **Step 3: Add Pressable import if missing**

```bash
grep "Pressable" apps/native/src/features/budget/trip-budget-screen.tsx | head -3
```

If not present, add `Pressable` to the `react-native` import.

- [ ] **Step 4: Run linter**

```bash
bun x ultracite check apps/native/src/features/budget/trip-budget-screen.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/native/src/features/budget/trip-budget-screen.tsx
git commit -m "refactor(budget): clean ExpenseRow icon and move edit/delete to ellipsis menu"
```

---

## Task 10: Readiness score card, pills, and add button

**Files:**
- Modify: `apps/native/src/features/readiness/readiness-screen.tsx`

- [ ] **Step 1: Update `ReadinessPill` — add border**

Find:

```tsx
function ReadinessPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full bg-surface px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}
```

Replace with:

```tsx
function ReadinessPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full border border-border bg-white px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}
```

- [ ] **Step 2: Update `ReadinessMetric` — remove card wrapper**

Find:

```tsx
function ReadinessMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[47%] flex-1 gap-1 rounded-[20px] bg-surface p-3">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="bold">
				{value}
			</Text>
		</View>
	);
}
```

Replace with:

```tsx
function ReadinessMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[47%] flex-1 gap-0.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="bold">
				{value}
			</Text>
		</View>
	);
}
```

- [ ] **Step 3: Replace score card Surface with View and clean icon badge**

Find:

```tsx
				<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
```

Replace with:

```tsx
				<View className="gap-4">
```

Find the closing `</Surface>` that corresponds to this block and replace it with `</View>`.

Find the icon inside the score card:

```tsx
						<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
							<Ionicons
								color="#0A84FF"
								name="shield-checkmark-outline"
								size={20}
							/>
						</View>
```

Replace with:

```tsx
						<View className="h-11 w-11 items-center justify-center rounded-full bg-surface-secondary">
							<Ionicons
								color="#0A84FF"
								name="shield-checkmark-outline"
								size={20}
							/>
						</View>
```

- [ ] **Step 4: Add header add button to `TripModuleScreenFrame`**

`NavigationIconButton` is already imported in this file (check — if not, import from `@/src/components/navigation/navigation-icon-button`).

```bash
grep "NavigationIconButton" apps/native/src/features/readiness/readiness-screen.tsx
```

If not present, add the import:

```tsx
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
```

Find:

```tsx
		<TripModuleScreenFrame activeTab="checklist" tripId={tripId}>
```

Replace with:

```tsx
		<TripModuleScreenFrame
			activeTab="checklist"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add readiness task"
					icon="add"
					onPress={openCreateSheet}
				/>
			}
			tripId={tripId}
		>
```

- [ ] **Step 5: Check Surface import — remove if no longer used**

```bash
grep -n "Surface" apps/native/src/features/readiness/readiness-screen.tsx
```

If `Surface` is no longer in JSX, remove it from the heroui-native import.

- [ ] **Step 6: Run linter**

```bash
bun x ultracite check apps/native/src/features/readiness/readiness-screen.tsx
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/native/src/features/readiness/readiness-screen.tsx
git commit -m "refactor(readiness): remove score card Surface, clean pills, add header add button"
```

---

## Task 11: ReadinessItemRow — clean icon badge and ellipsis menu

**Files:**
- Modify: `apps/native/src/features/readiness/readiness-item-row.tsx`

- [ ] **Step 1: Replace `readiness-item-row.tsx` entirely**

```tsx
import { Ionicons } from "@expo/vector-icons";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { type Href, Link } from "expo-router";
import { Button, Menu, Text } from "heroui-native";
import { Pressable, View } from "react-native";

const statusLabels: Record<string, string> = {
	blocked: "Blocked",
	done: "Done",
	ignored: "Ignored",
	inProgress: "In progress",
	todo: "To do",
};

const statusOptions = [
	"todo",
	"inProgress",
	"done",
	"blocked",
	"ignored",
] as const;

function RowPill({ label }: { label: string }) {
	return (
		<View className="rounded-full border border-border bg-white px-2.5 py-1">
			<Text color="muted" type="body-xs" weight="semibold">
				{label}
			</Text>
		</View>
	);
}

interface ReadinessItemRowProps {
	assignedToName?: string;
	categoryHref: Href | null;
	item: Doc<"readinessItems">;
	onDelete: (readinessItemId: Id<"readinessItems">) => void;
	onEdit: (item: Doc<"readinessItems">) => void;
	onStatusChange: (
		readinessItemId: Id<"readinessItems">,
		status: (typeof statusOptions)[number]
	) => void;
	ownerHref: Href | null;
}

export function ReadinessItemRow({
	assignedToName,
	categoryHref,
	item,
	onDelete,
	onEdit,
	ownerHref,
	onStatusChange,
}: ReadinessItemRowProps) {
	return (
		<View className="gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
					<Ionicons color="#5E5CE6" name="checkmark-circle-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<RowPill
							label={
								READINESS_CATEGORY_LABELS[item.category as ReadinessCategory]
							}
						/>
						<RowPill label={PRIORITY_LABELS[item.priority as Priority]} />
						<RowPill label={assignedToName ?? "Unassigned"} />
					</View>
					<Text type="body-sm" weight="bold">
						{item.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{item.description}
					</Text.Paragraph>
					<Text color="muted" type="body-xs">
						Due {item.dueDate}
					</Text>
				</View>
				<Menu>
					<Menu.Trigger asChild={true}>
						<Pressable
							accessibilityLabel="Task options"
							accessibilityRole="button"
							className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons color="#71717A" name="ellipsis-horizontal" size={17} />
						</Pressable>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Overlay />
						<Menu.Content
							align="end"
							className="rounded-[24px] border border-border bg-surface p-2"
							offset={8}
							placement="bottom"
							presentation="popover"
							width={200}
						>
							<Menu.Item
								accessibilityLabel="Edit task"
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								onPress={() => onEdit(item)}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons color="#0A84FF" name="create-outline" size={16} />
								</View>
								<Menu.ItemTitle className="font-semibold text-sm">Edit task</Menu.ItemTitle>
							</Menu.Item>
							<View className="mx-2 my-1 h-px bg-border" />
							<Menu.Item
								accessibilityLabel="Delete task"
								className="flex-row items-center gap-3 rounded-[18px] p-2.5"
								isAnimatedStyleActive={false}
								onPress={() => onDelete(item._id)}
							>
								<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
									<Ionicons color="#FF3B30" name="trash-outline" size={16} />
								</View>
								<Menu.ItemTitle className="font-semibold text-danger text-sm">Delete task</Menu.ItemTitle>
							</Menu.Item>
						</Menu.Content>
					</Menu.Portal>
				</Menu>
			</View>
			<View className="flex-row flex-wrap items-center gap-2">
				<View className="rounded-full border border-border bg-white px-3 py-2">
					<Text type="body-sm" weight="semibold">
						{statusLabels[item.status] ?? item.status}
					</Text>
				</View>
				{item.status === "inProgress" ? null : (
					<Button
						onPress={() => onStatusChange(item._id, "inProgress")}
						size="sm"
						variant="secondary"
					>
						<Button.Label>Start</Button.Label>
					</Button>
				)}
				{item.status === "done" ? null : (
					<Button
						onPress={() => onStatusChange(item._id, "done")}
						size="sm"
						variant="secondary"
					>
						<Button.Label>Done</Button.Label>
					</Button>
				)}
				{item.status === "ignored" ? null : (
					<Button
						onPress={() => onStatusChange(item._id, "ignored")}
						size="sm"
						variant="tertiary"
					>
						<Button.Label>Ignore</Button.Label>
					</Button>
				)}
			</View>
			{categoryHref || ownerHref ? (
				<View className="flex-row flex-wrap gap-2">
					{categoryHref ? (
						<Link asChild href={categoryHref}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="open-outline" size={15} />
								<Button.Label>Open category</Button.Label>
							</Button>
						</Link>
					) : null}
					{ownerHref ? (
						<Link asChild href={ownerHref}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="people-outline" size={15} />
								<Button.Label>Open owner</Button.Label>
							</Button>
						</Link>
					) : null}
				</View>
			) : null}
		</View>
	);
}
```

- [ ] **Step 2: Run linter**

```bash
bun x ultracite check apps/native/src/features/readiness/readiness-item-row.tsx
```

Expected: no errors.

- [ ] **Step 3: Run contract tests for readiness**

```bash
bun test apps/native/src/features/readiness/
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/native/src/features/readiness/readiness-item-row.tsx
git commit -m "refactor(readiness): clean icon badge, add border to pills, move edit/delete to ellipsis"
```

---

## Task 12: VaultPreviewCard — clean icon badge and ellipsis menu

**Files:**
- Modify: `apps/native/src/features/vault/vault-preview-card.tsx`

- [ ] **Step 1: Replace `vault-preview-card.tsx` entirely**

```tsx
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Button, Menu, Text } from "heroui-native";
import { Pressable, View } from "react-native";

import { formatReadableDate } from "@/src/components/date/date-format-utils";

interface VaultPreviewCardProps {
	createdAt: number;
	fileName: string;
	kind: string;
	linkedEntityHref?: Href | null;
	linkedEntityLabel?: string;
	onDelete?: () => void;
	onEdit?: () => void;
	onOpenFile?: () => void;
	title: string;
	url?: string | null;
}

const vaultKindMeta: Record<
	string,
	{
		accent: string;
		icon: keyof typeof Ionicons.glyphMap;
	}
> = {
	booking: { accent: "#FF9F0A", icon: "ticket-outline" },
	document: { accent: "#0A84FF", icon: "document-outline" },
	momentPhoto: { accent: "#AF52DE", icon: "images-outline" },
	receipt: { accent: "#34C759", icon: "receipt-outline" },
};

const formatVaultKindLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

export function VaultPreviewCard({
	createdAt,
	fileName,
	kind,
	linkedEntityHref,
	linkedEntityLabel,
	onDelete,
	onEdit,
	onOpenFile,
	title,
	url,
}: VaultPreviewCardProps) {
	const createdDateLabel = formatReadableDate(createdAt);
	const canOpenFile = Boolean(url && onOpenFile);
	const kindMeta = vaultKindMeta[kind] ?? {
		accent: "#6B7280",
		icon: "document-attach-outline" as const,
	};
	const hasMenu = Boolean(onEdit || onDelete);

	return (
		<View className="gap-3 rounded-[26px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-11 w-11 items-center justify-center rounded-2xl bg-surface-secondary">
					<Ionicons color={kindMeta.accent} name={kindMeta.icon} size={21} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<View className="flex-row items-start justify-between gap-3">
						<View className="min-w-0 flex-1">
							<Text numberOfLines={1} weight="semibold">
								{title}
							</Text>
							<Text color="muted" numberOfLines={1} type="body-xs">
								{fileName}
							</Text>
						</View>
						<Text color="muted" type="body-xs" weight="semibold">
							{formatVaultKindLabel(kind)}
						</Text>
					</View>
					<Text color="muted" type="body-xs">
						{createdDateLabel}
					</Text>
					{linkedEntityLabel ? (
						<Text color="muted" numberOfLines={1} type="body-xs">
							Linked to {linkedEntityLabel}
						</Text>
					) : null}
				</View>
				{hasMenu ? (
					<Menu>
						<Menu.Trigger asChild={true}>
							<Pressable
								accessibilityLabel="File options"
								accessibilityRole="button"
								className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
								style={({ pressed }) => ({
									transform: [{ scale: pressed ? 0.94 : 1 }],
								})}
							>
								<Ionicons color="#71717A" name="ellipsis-horizontal" size={17} />
							</Pressable>
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Overlay />
							<Menu.Content
								align="end"
								className="rounded-[24px] border border-border bg-surface p-2"
								offset={8}
								placement="bottom"
								presentation="popover"
								width={200}
							>
								{onEdit ? (
									<Menu.Item
										accessibilityLabel="Edit file"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										onPress={onEdit}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
											<Ionicons color="#0A84FF" name="create-outline" size={16} />
										</View>
										<Menu.ItemTitle className="font-semibold text-sm">Edit</Menu.ItemTitle>
									</Menu.Item>
								) : null}
								{onEdit && onDelete ? (
									<View className="mx-2 my-1 h-px bg-border" />
								) : null}
								{onDelete ? (
									<Menu.Item
										accessibilityLabel="Delete file"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										onPress={onDelete}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
											<Ionicons color="#FF3B30" name="trash-outline" size={16} />
										</View>
										<Menu.ItemTitle className="font-semibold text-danger text-sm">Delete</Menu.ItemTitle>
									</Menu.Item>
								) : null}
							</Menu.Content>
						</Menu.Portal>
					</Menu>
				) : null}
			</View>
			{canOpenFile || linkedEntityHref ? (
				<View className="flex-row flex-wrap gap-2">
					{canOpenFile ? (
						<Button
							className="flex-1"
							onPress={onOpenFile}
							size="sm"
							variant="primary"
						>
							<Ionicons color="#FFFFFF" name="open-outline" size={16} />
							<Button.Label>Open file</Button.Label>
						</Button>
					) : null}
					{linkedEntityHref ? (
						<Link asChild href={linkedEntityHref}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="git-branch-outline" size={16} />
								<Button.Label>Open linked item</Button.Label>
							</Button>
						</Link>
					) : null}
				</View>
			) : null}
		</View>
	);
}
```

- [ ] **Step 2: Run linter**

```bash
bun x ultracite check apps/native/src/features/vault/vault-preview-card.tsx
```

Expected: no errors.

- [ ] **Step 3: Run vault contract tests**

```bash
bun test apps/native/src/features/vault/
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/native/src/features/vault/vault-preview-card.tsx
git commit -m "refactor(vault): clean icon badge, move edit/delete to ellipsis menu in VaultPreviewCard"
```

---

## Task 13: Vault status block cleanup

**Files:**
- Modify: `apps/native/src/features/vault/trip-vault-screen.tsx`

- [ ] **Step 1: Remove Surface wrapper from upload status block**

Find:

```tsx
							<View className="gap-2 rounded-[24px] bg-surface-secondary p-4">
```

Replace with:

```tsx
							<View className="gap-2">
```

- [ ] **Step 2: Run linter and contract tests**

```bash
bun x ultracite check apps/native/src/features/vault/trip-vault-screen.tsx
bun test apps/native/src/features/vault/
```

Expected: no errors, all pass.

- [ ] **Step 3: Commit**

```bash
git add apps/native/src/features/vault/trip-vault-screen.tsx
git commit -m "refactor(vault): remove Surface wrapper from upload status block"
```

---

## Task 14: Apply rules to remaining module screens

**Files:**
- Modify: any of `apps/native/src/features/trips/trip-bookings-screen.tsx`, `trip-companions-screen.tsx`, `trip-notes-screen.tsx`, `trip-places-screen.tsx`, `trip-moments-screen.tsx`, `trip-risks-screen.tsx`, `trip-travel-mode-screen.tsx` that have violations.

The rules to apply in each file are the same as Tasks 1–13. Scan each screen for:

1. `Surface` wrapping non-clickable/non-repeated content → replace with `View`
2. `border-border border-t` on section separators → remove, use gap spacing
3. `rgba(...)` colored backgrounds on icon badges or chips → replace with `bg-surface-secondary` (icons) or `border border-border bg-white` (chips/labels)
4. Inline edit/delete buttons on row items → replace with `ellipsis-horizontal` `Menu` (same pattern as Tasks 7/9/11)
5. Missing add button in header → add `NavigationIconButton icon="add"` to `TripModuleScreenFrame headerAction`

- [ ] **Step 1: Scan each remaining screen**

```bash
grep -rn "bg-surface-secondary\|rgba(\|border-border border-t\|Surface" \
  apps/native/src/features/trips/trip-bookings-screen.tsx \
  apps/native/src/features/trips/trip-companions-screen.tsx \
  apps/native/src/features/trips/trip-notes-screen.tsx \
  apps/native/src/features/trips/trip-places-screen.tsx \
  apps/native/src/features/trips/trip-moments-screen.tsx \
  2>/dev/null | grep -v "node_modules"
```

- [ ] **Step 2: Apply fixes per file following the same patterns as Tasks 1–13**

For each violation found, apply the matching fix from the relevant earlier task. Commit per file:

```bash
# example per file:
git add apps/native/src/features/trips/trip-bookings-screen.tsx
git commit -m "refactor(bookings): remove colored backgrounds, add header add button"
```

- [ ] **Step 3: Run linter on all modified files**

```bash
bun x ultracite check apps/native/src/features/trips/
```

Expected: no errors.

---

## Final verification

- [ ] **Run full linter across all modified files**

```bash
bun x ultracite check apps/native/src/features/trips/ apps/native/src/features/budget/ apps/native/src/features/readiness/ apps/native/src/features/vault/
```

Expected: no errors.

- [ ] **Run all workspace contract tests**

```bash
bun test apps/native/src/features/trips/ apps/native/src/features/budget/ apps/native/src/features/readiness/ apps/native/src/features/vault/
```

Expected: all pass.
