const tripModulesSheetSnapRatio = 0.78;
const tripModulesSheetChromeHeight = 137;
const minimumTripModulesListHeight = 280;
const minimumBottomInset = 18;

export const getTripModulesSheetListMaxHeight = ({
	bottomInset,
	windowHeight,
}: {
	bottomInset: number;
	windowHeight: number;
}) =>
	Math.max(
		minimumTripModulesListHeight,
		Math.floor(windowHeight * tripModulesSheetSnapRatio) -
			Math.max(bottomInset, minimumBottomInset) -
			tripModulesSheetChromeHeight
	);

export const shouldShowTripDashboardFocusSections = () => false;
