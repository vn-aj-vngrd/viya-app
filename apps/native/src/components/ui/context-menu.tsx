import { type Href, Link } from "expo-router";
import type { SFSymbol } from "expo-symbols";
import type { ReactElement } from "react";
import { Platform } from "react-native";

export interface ContextMenuAction {
	destructive?: boolean;
	key: string;
	onPress: () => void;
	sfSymbol: SFSymbol;
	title: string;
}

export interface ContextMenuProps {
	actions: ContextMenuAction[];
	/** The pressable row. It must not navigate itself; the Link does. */
	children: ReactElement;
	href: Href;
}

/** Native iOS context menu on long press; plain Link elsewhere. */
export function ContextMenu({ actions, children, href }: ContextMenuProps) {
	if (Platform.OS !== "ios") {
		return (
			<Link asChild={true} href={href}>
				{children}
			</Link>
		);
	}

	return (
		<Link asChild={true} href={href}>
			<Link.Trigger>{children}</Link.Trigger>
			<Link.Menu>
				{actions.map((action) => (
					<Link.MenuAction
						destructive={action.destructive}
						icon={action.sfSymbol}
						key={action.key}
						onPress={action.onPress}
						title={action.title}
					/>
				))}
			</Link.Menu>
		</Link>
	);
}
