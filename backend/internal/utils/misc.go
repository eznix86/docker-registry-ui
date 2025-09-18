package utils

import (
	"os"

	"github.com/spf13/cast"
)

func DebugModeEnabled() bool {
	return cast.ToBool(os.Getenv("DEBUG"))
}