package utils

import (
	"strconv"
)

func FormatBytes(bytes int64) string {
	if bytes == 0 {
		return "0 B"
	}

	units := []string{"B", "KB", "MB", "GB", "TB"}
	size := float64(bytes)
	unitIndex := 0

	for size >= 1024 && unitIndex < len(units)-1 {
		size /= 1024
		unitIndex++
	}

	if unitIndex == 0 {
		return strconv.FormatInt(int64(size), 10) + " " + units[unitIndex]
	}

	return strconv.FormatFloat(size, 'f', 1, 64) + " " + units[unitIndex]
}
