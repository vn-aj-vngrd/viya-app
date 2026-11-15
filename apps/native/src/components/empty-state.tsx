import {
	type EmptyStateProps,
	EmptyState as UIEmptyState,
} from "@/src/components/ui/empty-state";

/** Kept for existing imports; implementation lives in ui/empty-state. */
export function EmptyState(props: EmptyStateProps) {
	return <UIEmptyState {...props} />;
}
