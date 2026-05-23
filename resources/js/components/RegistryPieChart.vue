<template>
	<div class="w-full">
		<div class="w-full" :style="{ height: chartHeight }">
			<VChart class="h-full w-full" :option="option" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PieSeriesOption } from "echarts/charts"
import type { LegendComponentOption, TooltipComponentOption } from "echarts/components"
import type { ComposeOption } from "echarts/core"
import { useWindowSize } from "@vueuse/core"
import { PieChart } from "echarts/charts"
import { LegendComponent, TooltipComponent } from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { computed } from "vue"
import VChart from "vue-echarts"
import { useChartTheme } from "~/composables/useChartTheme"

const props = defineProps<RegistryPieChartProps>()

use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer])

type EChartsOption = ComposeOption<
	PieSeriesOption
	| LegendComponentOption
	| TooltipComponentOption
>

interface ChartItem {
	label: string
	value: number
}

interface RegistryPieChartProps {
	items: ChartItem[]
	formatter: (value: number) => string
	maxItems?: number
	aggregateLabel?: string
}

const { width } = useWindowSize()
const chartTheme = useChartTheme()

const isMobile = computed(() => width.value < 640)
const chartHeight = computed(() => (isMobile.value ? "304px" : "408px"))

const option = computed<EChartsOption>(() => {
	const normalized = normalizeItems(props.items, props.maxItems, props.aggregateLabel)
	const showLabels = !isMobile.value || normalized.length <= 4

	return {
		animationDuration: 300,
		tooltip: {
			trigger: "item",
			backgroundColor: "rgba(15, 23, 42, 0.92)",
			borderWidth: 0,
			textStyle: { color: "#f8fafc" },
			formatter: (params) => {
				if (Array.isArray(params)) {
					return ""
				}

				return `<strong>${params.name}</strong><br/>${props.formatter(Number(params.value ?? 0))}`
			},
		},
		legend: {
			bottom: 0,
			left: "center",
			icon: "circle",
			itemWidth: isMobile.value ? 8 : 10,
			itemHeight: isMobile.value ? 8 : 10,
			itemGap: isMobile.value ? 12 : 18,
			textStyle: {
				color: chartTheme.value.mutedForeground,
				fontSize: isMobile.value ? 11 : 12,
			},
		},
		series: [{
			type: "pie",
			radius: isMobile.value ? ["36%", "54%"] : ["40%", "58%"],
			center: isMobile.value ? ["50%", "46%"] : ["50%", "48%"],
			avoidLabelOverlap: true,
			minAngle: 4,
			itemStyle: {
				borderColor: chartTheme.value.background,
				borderWidth: 3,
			},
			label: {
				show: showLabels,
				position: "outside",
				alignTo: "edge",
				edgeDistance: isMobile.value ? 10 : 18,
				bleedMargin: 6,
				formatter: (params) => {
					if (Array.isArray(params)) {
						return ""
					}

					return `${params.name}
${props.formatter(Number(params.value ?? 0))} (${Math.round(params.percent ?? 0)}%)`
				},
				color: chartTheme.value.foreground,
				fontSize: isMobile.value ? 11 : 12,
				fontWeight: 600,
			},
			labelLine: {
				show: showLabels,
				length: isMobile.value ? 10 : 14,
				length2: isMobile.value ? 6 : 10,
				lineStyle: {
					color: chartTheme.value.mutedForeground,
				},
			},
			labelLayout: {
				hideOverlap: true,
				moveOverlap: "shiftY",
			},
			emphasis: {
				scale: true,
				scaleSize: 6,
			},
			data: normalized.map((item, idx) => ({
				name: item.label,
				value: item.value,
				itemStyle: {
					color: chartTheme.value.palette[idx % chartTheme.value.palette.length],
				},
			})),
		}],
	}
})

function normalizeItems(items: ChartItem[], maxItems = items.length, aggregateLabel = "other") {
	if (items.length <= maxItems) {
		return items
	}

	const sorted = [...items].sort((a, b) => b.value - a.value)
	const visible = sorted.slice(0, maxItems - 1)
	const remainder = sorted.slice(maxItems - 1)
	const remainderValue = remainder.reduce((sum, item) => sum + item.value, 0)

	return [
		...visible,
		{ label: aggregateLabel, value: remainderValue },
	]
}
</script>
