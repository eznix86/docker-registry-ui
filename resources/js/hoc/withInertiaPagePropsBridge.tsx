// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { ComponentType } from "react";
import { InertiaPagePropsBridge } from "~/components/InertiaPagePropsBridge";

export function withInertiaPagePropsBridge<P extends object>(
	Component: ComponentType<P>,
) {
	return function WrappedComponent(props: P) {
		return (
			<>
				<InertiaPagePropsBridge />
				<Component {...props} />
			</>
		);
	};
}
