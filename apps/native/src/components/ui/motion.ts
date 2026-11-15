import { useCallback, useEffect, useRef } from "react";
import {
	Easing,
	FadeIn,
	FadeInDown,
	FadeOut,
	LinearTransition,
	ReduceMotion,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withSpring,
	withTiming,
} from "react-native-reanimated";

import { motion } from "./tokens";

export const pressSpring = motion.spring.press;
export const layoutSpring = motion.spring.layout;

const skeletonRestingOpacity = 0.55;
const skeletonPulseMs = 900;

/** Fade for content swaps (status lines, errors, inline panels). */
export const fadeIn = FadeIn.duration(motion.duration.normal).reduceMotion(
	ReduceMotion.System
);
export const fadeOut = FadeOut.duration(motion.duration.fast).reduceMotion(
	ReduceMotion.System
);

/**
 * Entering preset: fade plus an 8pt rise on the layout spring. Falls back to a
 * plain fade under Reduce Motion. `index` staggers the first few list items.
 */
export function enterRise(index = 0, reduced = false) {
	if (reduced) {
		return fadeIn;
	}
	const delay = Math.min(index, motion.stagger.maxItems) * motion.stagger.max;
	return FadeInDown.springify()
		.damping(motion.spring.layout.damping)
		.stiffness(motion.spring.layout.stiffness)
		.mass(motion.spring.layout.mass)
		.withInitialValues({
			opacity: 0,
			transform: [{ translateY: motion.riseDistance }],
		})
		.delay(delay)
		.reduceMotion(ReduceMotion.System);
}

/** Layout spring for a numeric value (progress width, indicator position). */
export function useLayoutSpring() {
	const reduced = useReducedMotion();
	return (to: number) =>
		reduced
			? withTiming(to, { duration: motion.duration.fast })
			: withSpring(to, motion.spring.layout);
}

/** Shared skeleton pulse: the only looping animation, loading states only. */
export function useSkeletonPulse() {
	const reduced = useReducedMotion();
	const opacity = useSharedValue(reduced ? 1 : skeletonRestingOpacity);

	useEffect(() => {
		if (reduced) {
			opacity.value = skeletonRestingOpacity;
			return;
		}
		opacity.value = withRepeat(
			withTiming(1, {
				duration: skeletonPulseMs,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true
		);
	}, [opacity, reduced]);

	return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

/**
 * Entrance for list rows on the first mount of the calling screen only.
 * Rows that mount later (pagination, search, new data) get no animation.
 */
export function useListEntrance() {
	const reduced = useReducedMotion();
	const firstCommit = useRef(true);

	useEffect(() => {
		firstCommit.current = false;
	}, []);

	return useCallback(
		(index: number) =>
			firstCommit.current ? enterRise(index, reduced) : undefined,
		[reduced]
	);
}

/** Reflow siblings when a row is added or removed. Pair with `exiting={fadeOut}`. */
export const layoutReflow = LinearTransition.springify()
	.stiffness(motion.spring.layout.stiffness)
	.damping(motion.spring.layout.damping)
	.mass(motion.spring.layout.mass)
	.reduceMotion(ReduceMotion.System);

/** Press spring for custom pressables that cannot use PressableScale. */
export function usePressScale(scaleTo: number = motion.pressScale) {
	const reduced = useReducedMotion();
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	return {
		animatedStyle,
		onPressIn: () => {
			scale.value = reduced ? 1 : withSpring(scaleTo, pressSpring);
		},
		onPressOut: () => {
			scale.value = reduced ? 1 : withSpring(1, pressSpring);
		},
	};
}
