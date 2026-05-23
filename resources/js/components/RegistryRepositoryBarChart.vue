<template>
	<div class="w-full">
		<div class="h-[360px] w-full">
			<VChart class="h-full w-full" :option="option" />
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

const props = defineProps<RegistryRepositoryBarChartProps>()

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

type EChartsOption = ComposeOption<
	BarSeriesOption
	| GridComponentOption
	| TooltipComponentOption
>

interface ChartItem {
	label: string
	value: number
}

interface RegistryRepositoryBarChartProps {
	items: ChartItem[]
	formatter: (value: number) => string
	maxItems?: number
	aggregateLabel?: string
}

const chartTheme = useChartTheme()

const option = computed<EChartsOption>(() => {
	const normalized = normalizeItems(props.items, props.maxItems, props.aggregateLabel)
	const labels = normalized.map(item => item.label)
	const values = normalized.map(item => item.value)

	return {
		animationDuration: 300,
		grid: {
			left: 0,
			right: 72,
			top: 8,
			bottom: 8,
		},
		tooltip: {
			trigger: "axis",
			axisPointer: { type: "shadow" },
			backgroundColor: "rgba(15, 23, 42, 0.92)",
			borderWidth: 0,
			textStyle: { color: "#f8fafc" },
			formatter(params) {
				const point = Array.isArray(params) ? params[0] : params
				if (!point)
					return ""
				return `<strong>${point.name}</strong><br/>${props.formatter(Number(point.value ?? 0))}`
			},
		},
		xAxis: {
			type: "value",
			splitLine: { show: false },
			axisLabel: { show: false },
			axisTick: { show: false },
			axisLine: { show: false },
		},
		yAxis: {
			type: "category",
			data: labels,
			inverse: true,
			axisTick: { show: false },
			axisLine: { show: false },
			axisLabel: {
				color: chartTheme.value.mutedForeground,
				fontSize: 12,
				fontWeight: 600,
				margin: 14,
				width: 180,
				overflow: "truncate",
			},
		},
		series: [{
			data: values,
			type: "bar",
			barWidth: 18,
			barCategoryGap: "36%",
			showBackground: true,
			backgroundStyle: {
				color: chartTheme.value.background,
				borderRadius: 999,
			},
			itemStyle: {
				borderRadius: 999,
				color: params => chartTheme.value.palette[params.dataIndex % chartTheme.value.palette.length] || chartTheme.value.primary,
			},
			label: {
				show: true,
				position: "right",
				color: chartTheme.value.mutedForeground,
				fontSize: 12,
				fontWeight: 600,
				formatter: ({ value }) => props.formatter(Number(value ?? 0)),
				distance: 10,
			},
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
