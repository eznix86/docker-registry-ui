// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Page } from "@inertiajs/core";
import { createContext, type ReactNode, useContext, useState } from "react";

interface InertiaPagePropsContextType {
	props: Page["props"] | null;
	setPage: (page: Page) => void;
}

const InertiaPagePropsContext = createContext<
	InertiaPagePropsContextType | undefined
>(undefined);

export function InertiaPagePropsProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [props, setProps] = useState<Page["props"] | null>(null);

	const setPage = (page: Page) => {
		setProps(page.props);
	};

	return (
		<InertiaPagePropsContext.Provider value={{ props, setPage }}>
			{children}
		</InertiaPagePropsContext.Provider>
	);
}

export function useInertiaProps() {
	const context = useContext(InertiaPagePropsContext);
	if (context === undefined) {
		throw new Error(
			"useInertiaProps must be used within InertiaPagePropsProvider",
		);
	}
	return context.props;
}

export function useInertiaPageSetter() {
	const context = useContext(InertiaPagePropsContext);
	if (context === undefined) {
		throw new Error(
			"useInertiaPageSetter must be used within InertiaPagePropsProvider",
		);
	}
	return context.setPage;
}
