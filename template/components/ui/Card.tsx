import {
	Card as MuiCard,
	CardActionArea as MuiCardActionArea,
	CardContent as MuiCardContent,
	styled,
} from "@mui/material";

const CardRoot = styled(MuiCard)(({ theme }) => ({
	height: theme.custom.sizes.card.height,
	minHeight: theme.custom.sizes.card.minHeight,
	display: "flex",
	flexDirection: "column",
	backgroundColor: "transparent",
	borderColor: theme.palette.divider,
	transition: `border-color ${theme.custom.animations.transition.fast}, box-shadow ${theme.custom.animations.transition.fast}`,
	willChange: "auto",
	"&:hover": {
		borderColor: theme.palette.primary.main,
		boxShadow: `0 0 0 1px ${theme.custom.colors.primary.dark}`,
	},
	[theme.breakpoints.down("md")]: {
		height: theme.custom.sizes.card.mobileHeight,
	},
	[theme.breakpoints.down("sm")]: {
		height: "auto",
	},
}));

const CardAction = styled(MuiCardActionArea)(({ theme }) => ({
	textDecoration: "none",
	color: "inherit",
	flexGrow: 1,
	display: "flex",
	flexDirection: "column",
	"&:hover": {
		backgroundColor: theme.palette.action.hover,
	},
}));

const CardBody = styled(MuiCardContent)(({ theme }) => ({
	padding: theme.spacing(1.5),
	"&:last-child": {
		paddingBottom: theme.spacing(1.5),
	},
	flexGrow: 1,
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	width: "100%",
}));

export const Card = Object.assign(CardRoot, {
	Action: CardAction,
	Body: CardBody,
});
