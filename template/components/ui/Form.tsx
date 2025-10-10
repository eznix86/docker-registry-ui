import {
	Checkbox as MuiCheckbox,
	FormControlLabel as MuiFormControlLabel,
	MenuItem as MuiMenuItem,
	Select as MuiSelect,
	TextField as MuiTextField,
	styled,
	alpha,
} from "@mui/material";

export const Checkbox = styled(MuiCheckbox)(({ theme }) => ({
	color: theme.palette.text.secondary,
	"&.Mui-checked": {
		color: theme.palette.primary.main,
	},
}));

export const FormControlLabel = styled(MuiFormControlLabel)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	cursor: "pointer",
	"&:hover": {
		backgroundColor: alpha(theme.palette.common.white, 0.04),
	},
}));

export const Select = styled(MuiSelect)(({ theme }) => ({
	"& .MuiSelect-select": {
		fontSize: theme.custom.typography.fontSizes.lg,
	},
	"& .MuiOutlinedInput-notchedOutline": {
		borderColor: theme.palette.divider,
	},
}));

export const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.lg,
}));

export const TextField = styled(MuiTextField)(({ theme }) => ({
	"& .MuiOutlinedInput-root": {
		"& fieldset": {
			borderColor: theme.palette.divider,
		},
	},
}));
