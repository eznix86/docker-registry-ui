// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { usePage } from "@inertiajs/react";
import { useEffect } from "react";
import { useInertiaPageSetter } from "~/contexts/InertiaPagePropsContext";

export function InertiaPagePropsBridge() {
	const page = usePage();
	const setPage = useInertiaPageSetter();

	useEffect(() => {
		setPage(page);
	}, [page, setPage]);

	return null;
}
