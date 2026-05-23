<template>
	<div class="w-full space-y-1.5">
		<div class="h-[72px] w-full">
			<VChart class="h-full w-full" :option="option" />
		</div>

		<div class="flex flex-wrap gap-x-3 gap-y-1.5">
			<div
				v-for="(item, index) in normalizedItems"
				:key="item.label"
				class="flex items-center gap-1.5 text-xs"
			>
				<span
					class="h-2 w-2 rounded-full"
					:style="{ backgroundColor: colorAt(index) }"
				/>
				<span class="text-foreground font-medium">{{ item.label }}</span>
				<span class="text-muted-foreground">{{ formatter(item.value) }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { BarSeriesOption } from "echarts/charts"
import type { GridComponentOption, TooltipComponentOption } from "echarts/components"
import type { ComposeOption } from "echarts/core"
import { BarChart } from "echarts/charts"
import { GridComponent, TooltipComponent } from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { computed } from "vue"
import VChart from "vue-echarts"
import { useChartTheme } from "~/composables/useChartTheme"

type EChartsOption = ComposeOption<
	BarSeriesOption
	| GridComponentOption
	| TooltipComponentOption
>

interface ChartItem {
	label: string
	value: number
}

interface SegmentedHorizontalBarChartProps {
	items: ChartItem[]
	formatter: (value: number) => string
	maxItems?: number
	aggregateLabel?: string
}

const props = defineProps<SegmentedHorizontalBarChartProps>()

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const chartTheme = useChartTheme()

const normalizedItems = computed(() =>
	normalizeItems(props.items, props.maxItems, props.aggregateLabel),
)

const total = computed(() =>
	normalizedItems.value.reduce((sum, item) => sum + item.value, 0),
)

const option = computed<EChartsOption>(() => ({
	animationDuration: 300,
	grid: {
		left: 0,
		right: 0,
		top: 8,
		bottom: 8,
	},
	tooltip: {
		trigger: "item",
		backgroundColor: "rgba(15, 23, 42, 0.92)",
		borderWidth: 0,
		textStyle: { color: "#f8fafc" },
		formatter: (params) => {
			if (Array.isArray(params)) {
				return ""
			}

			const value = Number(params.value ?? 0)
			const percent = total.value > 0 ? Math.round((value / total.value) * 100) : 0

			return `<strong>${params.seriesName}</strong><br/>${props.formatter(value)} (${percent}%)`
		},
	},
	xAxis: {
		type: "value",
		show: false,
		max: total.value || 1,
	},
	yAxis: {
		type: "category",
		data: [""],
		show: false,
	},
	series: normalizedItems.value.map((item, index) => ({
		name: item.label,
		type: "bar",
		stack: "total",
		barWidth: 18,
		data: [item.value],
		emphasis: { focus: "series" },
		itemStyle: {
			color: colorAt(index),
			borderColor: chartTheme.value.background,
			borderWidth: 1.5,
			borderRadius: segmentRadius(),
		},
	})),
}))

function colorAt(index: number): string {
	return chartTheme.value.palette[index % chartTheme.value.palette.length] || chartTheme.value.primary
}

function segmentRadius(): number[] {
	return [0, 0, 0, 0]
}

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
