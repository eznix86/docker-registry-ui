// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package handlers

import "net/http"

func Explore(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("explore"))
}
