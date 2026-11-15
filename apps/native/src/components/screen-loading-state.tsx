import { Container } from "@/components/container";
import { LoadingState } from "@/src/components/ui/loading-state";

export function ScreenLoadingState() {
	return (
		<Container className="px-4 pb-28" isScrollable={false}>
			<LoadingState />
		</Container>
	);
}
