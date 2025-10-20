import { computed, unref } from 'vue';

export function useChartOptions(seriesInput, yAxisInput, sharedInput, axisLabelsInput) {
  return computed(() => {
    const series = unref(seriesInput) ?? [];
    const yAxis = normalizeAxis(unref(yAxisInput));
    const shared = normalizeShared(unref(sharedInput));
    const axisLabels = unref(axisLabelsInput) || {
      xLabel: '闲暇时间 (小时)',
      yLabel: '收入 (元)',
    };
    
    const legendData = series
      .map((s) => s?.name)
      .filter(Boolean);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!Array.isArray(params)) {
            return '';
          }
          return params
            .map((param) => {
              const datum = param?.data ?? [];
              const xValue = Array.isArray(datum) ? datum[0] : undefined;
              const yValue = Array.isArray(datum) ? datum[1] : undefined;
              // Extract label text without units for generic display
              const xLabelText = axisLabels.xLabel.split(' ')[0] || 'X';
              const yLabelText = axisLabels.yLabel.split(' ')[0] || 'Y';
              return `${param.seriesName}<br/>${xLabelText}: ${formatNumber(xValue)}<br/>${yLabelText}: ${formatNumber(yValue)}`;
            })
            .join('<br/>');
        },
      },
      legend: {
        data: legendData,
        top: 10,
        textStyle: {
          fontSize: 16,
        },
      },
      grid: {
        left: 60,
        right: 40,
        bottom: 60,
        top: 60,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: axisLabels.xLabel,
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
        min: 0,
        max: 16,
        interval: 1,
        axisLine: {
          lineStyle: {
            color: '#333',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: axisLabels.yLabel,
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
        min: yAxis.min,
        max: yAxis.max,
        axisLine: {
          lineStyle: {
            color: '#333',
          },
        },
      },
      series,
    };
  });
}

function normalizeAxis(axis) {
  if (!axis || typeof axis !== 'object') {
    return { min: 0, max: 1200 };
  }
  const min = Number.isFinite(axis.min) ? axis.min : 0;
  const max = Number.isFinite(axis.max) ? axis.max : Math.max(min + 100, 1200);
  return { min, max: Math.max(max, min + 100) };
}

function normalizeShared(shared) {
  if (!shared || typeof shared !== 'object') {
    return {};
  }
  return shared;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return Number(value).toFixed(2);
}
