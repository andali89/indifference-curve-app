<template>
  <div class="indifference-curve-app">
    <!-- Sidebar Toggle Button -->
    <button 
      class="sidebar-toggle"
      :class="{ 'sidebar-toggle--expanded': sidebarVisible }"
      @click="sidebarVisible = !sidebarVisible"
      :title="sidebarVisible ? '隐藏侧边栏' : '显示侧边栏'"
      :style="{ left: '0' }"
    >
      <span v-if="sidebarVisible">◀</span>
      <span v-else>▶</span>
    </button>

    <!-- Left Sidebar Controls -->
    <div class="sidebar" v-show="sidebarVisible" :style="{ width: sidebarWidth + 'px' }">
      <div class="sidebar-header">
        <h2>无差异曲线分析</h2>
        <p class="subtitle">Indifference Curve Analysis</p>
      </div>

      <!-- Utility Function Weights -->
      <div class="control-section">
        <h3>效用函数参数</h3>
        <div class="weight-controls">
          <div class="control-group compact">
            <label for="i-weight">收入权重 (I)</label>
            <input 
              type="number" 
              id="i-weight" 
              v-model.number="iWeight" 
              step="0.1"
              min="0.1"
              @input="onWeightChange"
            />
          </div>
          <div class="control-group compact">
            <label for="h-weight">闲暇权重 (H)</label>
            <input 
              type="number" 
              id="h-weight" 
              v-model.number="hWeight" 
              step="0.1"
              min="0.1"
              @input="onWeightChange"
            />
          </div>
        </div>
        <div class="formula">U = I<sup>{{ iWeight }}</sup> × H<sup>{{ hWeight }}</sup></div>
      </div>

      <!-- Budget Constraint Parameters -->
      <div class="control-section">
        <h3>预算约束参数</h3>
        <div class="control-group">
          <label for="unearned-income">非劳动收入</label>
          <div class="input-with-unit">
            <input 
              type="number" 
              id="unearned-income" 
              v-model.number="unearnedIncome" 
              step="50"
              min="0"
              @input="onBudgetChange"
            />
            <span class="unit">元</span>
          </div>
        </div>
        <div class="control-group">
          <label for="wage-rate">工资率</label>
          <div class="input-with-unit">
            <input 
              type="number" 
              id="wage-rate" 
              v-model.number="wageRate" 
              step="10"
              min="0"
              @input="onBudgetChange"
            />
            <span class="unit">元/小时</span>
          </div>
        </div>
      </div>

      <!-- Utility Level Control -->
      <div class="control-section">
        <h3>效用水平</h3>
        <div class="utility-control">
          <div class="utility-value">
            <input 
              type="number" 
              v-model.number="utility" 
              @input="onUtilityChange"
              class="utility-input"
            />
          </div>
          <input 
            type="range" 
            id="utility-slider" 
            min="100" 
            max="100000" 
            v-model.number="utility" 
            @input="onUtilitySliding"
            class="utility-slider"
          />
          <!-- <div class="lock-control">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="lock" 
                v-model="locked"
                @change="onLockChange"
              />
              <span>锁定效用水平以调整曲线</span>
            </label>
          </div> -->
        </div>
      </div>

      <!-- Hold Feature -->
      <div class="control-section">
        <h3>显示选项</h3>
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="hold"
          />
          <span>保持之前的曲线 (Hold)</span>
        </label>
      </div>

      <!-- Y-Axis Control -->
      <div class="control-section">
        <h3>Y轴范围控制</h3>
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="autoYAxis"
          />
          <span>自动调整Y轴范围</span>
        </label>
        <div v-if="!autoYAxis" class="axis-manual-controls">
          <div class="control-group compact">
            <label for="y-min">Y轴最小值</label>
            <input 
              type="number" 
              id="y-min" 
              v-model.number="manualYMin" 
              step="50"
            />
          </div>
          <div class="control-group compact">
            <label for="y-max">Y轴最大值</label>
            <input 
              type="number" 
              id="y-max" 
              v-model.number="manualYMax" 
              step="50"
            />
          </div>
        </div>
      </div>

      <!-- Chart Area Control -->
      <div class="control-section">
        <h3>图表显示控制</h3>
        
        <!-- Padding Controls -->
        <div class="control-group compact">
          <label for="chart-padding">图表内边距</label>
          <div class="slider-with-value">
            <input 
              type="range" 
              id="chart-padding" 
              v-model.number="chartPadding" 
              min="10"
              max="50"
              step="5"
            />
            <span class="value-display">{{ chartPadding }}px</span>
          </div>
        </div>

        <!-- Zoom Control -->
        

        <!-- View Mode Buttons -->
        <div class="view-mode-controls">
          <button 
            @click="setViewMode('normal')" 
            :class="{ active: viewMode === 'normal' }"
            class="view-mode-btn"
          >
            标准
          </button>
          <button 
            @click="setViewMode('wide')" 
            :class="{ active: viewMode === 'wide' }"
            class="view-mode-btn"
          >
            宽屏
          </button>
          <button 
            @click="toggleFullscreen" 
            class="view-mode-btn"
          >
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </button>
        </div>

        <!-- Reset Button -->
        <button @click="resetChartSettings" class="reset-btn">
          重置图表设置
        </button>

        <!-- Aspect Ratio Controls -->
        <div class="control-group" style="margin-top:16px;">
          <label>图表宽高比</label>
          <select v-model="aspectRatioPreset" @change="applyAspectRatioPreset" style="width:100%; padding:8px; border-radius:6px; border:1px solid #d2d2d7; margin-bottom:8px;">
            <option value="auto">自适应</option>
            <option value="16:9">16:9 (宽屏)</option>
            <option value="4:3">4:3 (标准)</option>
            <option value="1:1">1:1 (正方形)</option>
            <option value="custom">自定义</option>
          </select>
          <div v-if="aspectRatioPreset === 'custom'" style="display:flex; gap:8px; align-items:center;">
            <input type="number" v-model.number="aspectWidth" min="1" style="width:60px; padding:6px; border-radius:6px; border:1px solid #d2d2d7;" />
            <span>:</span>
            <input type="number" v-model.number="aspectHeight" min="1" style="width:60px; padding:6px; border-radius:6px; border:1px solid #d2d2d7;" />
          </div>
        </div>
      </div>

      <!-- Resize Handle -->
      <div 
        class="resize-handle" 
        @mousedown="startResize"
        title="拖动调整侧边栏宽度"
      ></div>
    </div>

    <!-- Main Chart Area -->
    <div class="chart-area" :class="{ 'wide-mode': viewMode === 'wide', 'fullscreen-mode': isFullscreen }">
      <div class="chart-header">
        <h1>闲暇-收入无差异曲线</h1>
        <div class="chart-info">
          <span class="info-item">最大闲暇时间: 16小时</span>
          <span class="info-item">16小时收入: {{ maxIncome.toFixed(0) }}元</span>
          <span class="info-item" v-if="viewMode === 'wide'">宽屏模式</span>
        </div>
      </div>
      <div 
        ref="chartContainer"
        class="chart-container"
      >
        <div 
          class="chart-wrapper"
          :class="{ 'aspect-ratio-mode': aspectRatioPreset !== 'auto' }"
          :style="chartWrapperStyle"
        >
          <v-chart class="chart" :option="chartOption" autoresize />
        </div>
      </div>
    </div>
  </div>
  <Footer />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Footer from '../components/Footer.vue';
// ===== Reactive State =====
const iWeight = ref(1);
const hWeight = ref(1);
const wageRate = ref(10);
const unearnedIncome = ref(0);
const utility = ref(100);
const hold = ref(false);

// Sidebar controls
const sidebarVisible = ref(true);
const sidebarWidth = ref(280);
const isResizing = ref(false);

// Y-axis controls
const autoYAxis = ref(true);
const manualYMin = ref(0);
const manualYMax = ref(1200);

// Chart display controls
const chartPadding = ref(20);
const viewMode = ref('normal'); // 'normal' or 'wide'
const isFullscreen = ref(false);

// Aspect ratio controls
const aspectRatioPreset = ref('auto');
const aspectWidth = ref(16);
const aspectHeight = ref(9);
const isApplyingRatioPreset = ref(false);

// Container size tracking for aspect ratio fit
const containerWidth = ref(0);
const containerHeight = ref(0);
const chartContainer = ref(null);

// Store old curves for hold functionality
const heldCurves = ref([]);
let lastPlottedCurve = null;

// ===== Computed Values =====
const maxIncome = computed(() => {
  return wageRate.value * 16 + unearnedIncome.value;
});

const yAxisMax = computed(() => {
  if (!autoYAxis.value) {
    return manualYMax.value;
  }
  
  // Auto-calculate based on data
  const budgetMax = wageRate.value * 16 + unearnedIncome.value;
  
  // Generate curve data without y-axis limit to calculate proper max
  const points = [];
  const U = utility.value;
  const I_exp = iWeight.value;
  const H_exp = hWeight.value;
  
  for (let h = 0.1; h <= 16; h += 0.1) {
    const income = Math.pow(U / Math.pow(h, H_exp), 1 / I_exp);
    if (income >= 0 && !isNaN(income) && isFinite(income)) {
      points.push(income);
    }
  }
  
  const curveMax = points.length > 0 ? Math.max(...points) : 0;
  
  // Add 10% padding to the max value
  const dataMax = Math.max(budgetMax, curveMax);
  return Math.ceil(dataMax * 1.1 / 100) * 100; // Round up to nearest 100
});

const yAxisMin = computed(() => {
  return autoYAxis.value ? 0 : manualYMin.value;
});

// Computed aspect ratio for chart wrapper
const chartAspectRatio = computed(() => {
  if (aspectRatioPreset.value === 'auto') {
    return null;
  }
  if (aspectWidth.value > 0 && aspectHeight.value > 0) {
    return `${aspectWidth.value} / ${aspectHeight.value}`;
  }
  return null;
});

// Calculate optimal size to fit container while maintaining aspect ratio
const chartDimensions = computed(() => {
  if (aspectRatioPreset.value === 'auto') {
    return null;
  }

  const minWidth = 400;  // 最小宽度
  const minHeight = 300; // 最小高度
  const padding = chartPadding.value * 2; // 两侧的 padding
  
  // 可用空间（扣除 padding）
  const availableWidth = containerWidth.value - padding;
  const availableHeight = containerHeight.value - padding;
  
  // 目标宽高比
  const targetRatio = aspectWidth.value / aspectHeight.value;
  
  // 根据宽度计算高度
  let width = availableWidth;
  let height = width / targetRatio;
  
  // 如果高度超出，则根据高度计算宽度
  if (height > availableHeight) {
    height = availableHeight;
    width = height * targetRatio;
  }
  
  // 确保不小于最小尺寸
  if (width < minWidth) {
    width = minWidth;
    height = width / targetRatio;
  }
  if (height < minHeight) {
    height = minHeight;
    width = height * targetRatio;
  }
  
  return {
    width: Math.floor(width),
    height: Math.floor(height)
  };
});

const chartWrapperStyle = computed(() => {
  const baseStyle = {
    padding: `${chartPadding.value}px`,
    boxSizing: 'border-box',
    transformOrigin: 'center center'
  };

  if (aspectRatioPreset.value !== 'auto' && chartDimensions.value) {
    return {
      ...baseStyle,
      width: `${chartDimensions.value.width}px`,
      height: `${chartDimensions.value.height}px`,
      maxWidth: '100%',
      maxHeight: '100%',
      margin: 'auto',
      flexShrink: 0
    };
  }

  return {
    ...baseStyle,
    flex: '1 1 auto',
    height: '100%',
    width: '100%'
  };
});

// ===== Generate Data Points =====
function generateBudgetLine() {
  const points = [];
  for (let h = 0; h <= 16; h += 0.1) {
    const income = wageRate.value * (16 - h) + unearnedIncome.value;
    points.push([h, income]);
  }
  return points;
}

function generateIndifferenceCurve() {
  const points = [];
  const U = utility.value;
  const I_exp = iWeight.value;
  const H_exp = hWeight.value;
  
  for (let h = 0.1; h <= 16; h += 0.01) {
    // From U = I^a * H^b, we get I = (U / H^b)^(1/a)
    const income = Math.pow(U / Math.pow(h, H_exp), 1 / I_exp);
    
    // Only add points within reasonable bounds
    if (income >= 0 && income <= yAxisMax.value && !isNaN(income)) {
      points.push([h, income]);
    }
  }
  return points;
}

// ===== Chart Configuration =====
const chartOption = computed(() => {
  const series = [];
  
  // Budget constraint line
  series.push({
    name: '预算约束线',
    type: 'line',
    data: generateBudgetLine(),
    lineStyle: {
      color: '#0066cc',
      width: 3
    },
    symbol: 'none',
    smooth: false
  });
  
  // Current indifference curve
  series.push({
    name: '无差异曲线',
    type: 'line',
    data: generateIndifferenceCurve(),
    lineStyle: {
      color: '#ff6b6b',
      width: 3
    },
    symbol: 'none',
    smooth: true
  });
  
  // Add held curves
  heldCurves.value.forEach((curve, index) => {
    series.push({
      name: `无差异曲线 ${index + 1}`,
      type: 'line',
      data: curve,
      lineStyle: {
        color: '#cccccc',
        width: 2,
        type: 'dashed'
      },
      symbol: 'none',
      smooth: true
    });
  });
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = '';
        params.forEach(param => {
          const [leisure, income] = param.data;
          result += `${param.seriesName}<br/>闲暇: ${leisure.toFixed(2)}小时<br/>收入: ${income.toFixed(2)}元<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['预算约束线', '无差异曲线'],
      top: 10,
      textStyle: {
        fontSize: 24
      }
    },
    grid: {
      left: '60',
      right: '40',
      bottom: '60',
      top: '60',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '闲暇 (小时)',
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: {
        fontSize: 24,
        fontWeight: 'bold'
      },
      min: 0,
      max: 16,
      interval: 1,
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '收入 (元)',
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: {
        fontSize: 24,
        fontWeight: 'bold'
      },
      min: 0,
      max: yAxisMax.value,
      axisLine: {
        lineStyle: {
          color: '#333'
        }
      }
    },
    series: series
  };
});

// ===== Sidebar Resize Handlers =====
function startResize(e) {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
}

function handleResize(e) {
  if (isResizing.value) {
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 600) {
      sidebarWidth.value = newWidth;
    }
  }
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
}

// ===== Chart Display Controls =====
function applyAspectRatioPreset() {
  isApplyingRatioPreset.value = true;
  switch (aspectRatioPreset.value) {
    case '16:9':
      aspectWidth.value = 16;
      aspectHeight.value = 9;
      break;
    case '4:3':
      aspectWidth.value = 4;
      aspectHeight.value = 3;
      break;
    case '1:1':
      aspectWidth.value = 1;
      aspectHeight.value = 1;
      break;
    case 'auto':
      aspectWidth.value = 16;
      aspectHeight.value = 9;
      break;
    default:
      // 'custom' keeps user-provided values
      break;
  }
  isApplyingRatioPreset.value = false;
}

function setViewMode(mode) {
  viewMode.value = mode;
  if (mode === 'wide') {
    chartPadding.value = 30;
  } else {
    chartPadding.value = 20;
  }
}

function toggleFullscreen() {
  if (!isFullscreen.value) {
    // Enter fullscreen
    const chartArea = document.querySelector('.chart-area');
    if (chartArea.requestFullscreen) {
      chartArea.requestFullscreen();
    } else if (chartArea.webkitRequestFullscreen) {
      chartArea.webkitRequestFullscreen();
    } else if (chartArea.msRequestFullscreen) {
      chartArea.msRequestFullscreen();
    }
    isFullscreen.value = true;
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    isFullscreen.value = false;
  }
}

function resetChartSettings() {
  chartPadding.value = 20;
  viewMode.value = 'normal';
  aspectRatioPreset.value = 'auto';
  aspectWidth.value = 16;
  aspectHeight.value = 9;
  if (isFullscreen.value) {
    toggleFullscreen();
  }
}

// Listen for fullscreen changes
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  document.addEventListener('webkitfullscreenchange', () => {
    isFullscreen.value = !!document.webkitFullscreenElement;
  });
}

// ===== Event Handlers =====
function onWeightChange() {
  if (!hold.value) {
    heldCurves.value = [];
  }
  refreshChart();
}

function onBudgetChange() {
  if (!hold.value) {
    heldCurves.value = [];
  }
  refreshChart();
}

function onUtilityChange() {
  if (utility.value < 100) {
    utility.value = 100;
  }
  refreshChart();
}

function onUtilitySliding() {
  // When sliding, remove the last curve to show smooth animation
  if (lastPlottedCurve) {
    // Remove the last dynamically added curve
  }
  refreshChart();
}

// function onLockChange() {
//   if (!locked.value && !hold.value) {
//     heldCurves.value = [];
//   }
//   refreshChart();
// }

function refreshChart() {
  // Store current curve if hold is enabled
  if (hold.value) {
    const currentCurve = generateIndifferenceCurve();
    lastPlottedCurve = currentCurve;
  }
}

// Watch for hold changes
watch(hold, (newVal) => {
  if (!newVal) {
    heldCurves.value = [];
  }
});

// Watch utility changes when locked
watch(utility, (newVal, oldVal) => {
  if (hold.value && Math.abs(newVal - oldVal) > 100) {
    // Add the old curve to held curves when utility changes significantly
    heldCurves.value.push(generateIndifferenceCurveWithUtility(oldVal));
  }
});

watch([aspectWidth, aspectHeight], () => {
  if (!isApplyingRatioPreset.value && aspectRatioPreset.value !== 'auto' && aspectRatioPreset.value !== 'custom') {
    aspectRatioPreset.value = 'custom';
  }
});

function generateIndifferenceCurveWithUtility(U) {
  const points = [];
  const I_exp = iWeight.value;
  const H_exp = hWeight.value;
  
  for (let h = 0.1; h <= 16; h += 0.01) {
    const income = Math.pow(U / Math.pow(h, H_exp), 1 / I_exp);
    if (income >= 0 && income <= yAxisMax.value && !isNaN(income)) {
      points.push([h, income]);
    }
  }
  return points;
}

// ===== Container Size Observer =====
let resizeObserver = null;

function updateContainerSize() {
  if (chartContainer.value) {
    const rect = chartContainer.value.getBoundingClientRect();
    containerWidth.value = rect.width;
    containerHeight.value = rect.height;
  }
}

onMounted(() => {
  nextTick(() => {
    updateContainerSize();
    
    // 使用 ResizeObserver 监听容器大小变化
    if (chartContainer.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateContainerSize();
      });
      resizeObserver.observe(chartContainer.value);
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateContainerSize);
  });
});

onUnmounted(() => {
  if (resizeObserver && chartContainer.value) {
    resizeObserver.unobserve(chartContainer.value);
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', updateContainerSize);
});
</script>

<style scoped>
.indifference-curve-app {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e0f2fe 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
}

/* ===== Sidebar Toggle Button ===== */
.sidebar-toggle {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translate(0, -50%);
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #d2d2d7;
  border-left: none;
  border-radius: 0 8px 8px 0;
  padding: 12px 8px;
  cursor: pointer;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  font-size: 14px;
  color: #1d1d1f;
}

.sidebar-toggle:hover {
  background: white;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.15);
}

.sidebar-toggle--expanded {
  transform: translate(-12px, -50%);
}

/* ===== Sidebar Styles ===== */
.sidebar {
  min-width: 200px;
  max-width: 600px;
  background: white;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s ease;
  padding-left: 0px;
}

.sidebar-header {
  /* Apple-style clean gradient: light gray to white */
  background: linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%);
  color: #1d1d1f;
  padding: 30px 25px 30px 36px;
  text-align: center;
  border-bottom: 1px solid #d2d2d7;
}

.sidebar-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1d1d1f;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  opacity: 0.7;
  font-weight: 400;
  color: #86868b;
}

/* ===== Resize Handle ===== */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: rgba(14, 165, 164, 0.12);
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 40px;
  background: #d2d2d7;
  border-radius: 2px;
}

.control-section {
  padding: 20px 25px 20px 36px;
  border-bottom: 1px solid #e8e8e8;
}

.control-section h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.weight-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.control-group {
  margin-bottom: 12px;
}

.control-group.compact {
  margin-bottom: 0;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.control-group input[type="number"] {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.control-group input[type="number"]:focus {
  outline: none;
  border-color: #0ea5a4;
  box-shadow: 0 0 0 6px rgba(14, 165, 164, 0.06);
}

.control-group input[type="number"]:disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-with-unit input {
  flex: 1;
}

.unit {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  min-width: 50px;
}

.formula {
  background: linear-gradient(135deg, #89c0c0 0%, #89c0c0 100%);
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 16px;
  color: #333;
  font-weight: 900;
  font-family: 'Times New Roman', serif;
}

/* ===== Utility Control ===== */
.utility-control {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.utility-value {
  display: flex;
  justify-content: center;
}

.utility-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e8efee;
  border-radius: 10px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  color: #0ea5a4;
  background: linear-gradient(180deg, #fbfffe 0%, #f7fffd 100%);
  transition: all 0.25s ease;
}

.utility-input:focus {
  outline: none;
  border-color: #0ea5a4;
  box-shadow: 0 0 0 8px rgba(14, 165, 164, 0.06);
}

.utility-input:disabled {
  background-color: #f5f5f5;
  color: #999;
}

.utility-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.utility-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5a4 0%, #057d75 100%);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(6, 128, 116, 0.12);
}

.utility-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5a4 0%, #057d75 100%);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(6, 128, 116, 0.12);
  border: none;
}

.utility-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lock-control {
  margin-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  gap: 8px;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #0ea5a4;
}

.checkbox-label span {
  user-select: none;
}

/* ===== Axis Manual Controls ===== */
.axis-manual-controls {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

/* ===== Chart Display Controls ===== */
.slider-with-value {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-with-value input[type="range"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider-with-value input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(180deg, #0ea5a4, #057d75);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(6, 128, 116, 0.12);
}

.slider-with-value input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(180deg, #0ea5a4, #057d75);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(6, 128, 116, 0.12);
  border: none;
}

.value-display {
  min-width: 50px;
  text-align: right;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.view-mode-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

.view-mode-btn {
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #1d1d1f;
  transition: all 0.2s ease;
}

.view-mode-btn:hover {
  background: #f3f9f8;
  border-color: #0ea5a4;
}

.view-mode-btn.active {
  background: #0ea5a4;
  color: white;
  border-color: #0ea5a4;
}

.reset-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid #d2d2d7;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #1d1d1f;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #f6fffd;
  border-color: rgba(14,165,164,0.12);
}

/* ===== Chart Area ===== */
.chart-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 30px;
  overflow: auto;
  transition: all 0.3s ease;
  min-height: 0;
  min-width: 0;
}

.chart-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  margin-bottom: 20px;
}

.chart-area.wide-mode {
  padding: 20px 50px;
}

.chart-area.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #f5f7fa 0%, #e0f2fe 100%);
  padding: 40px;
}

.chart-header {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.fullscreen-mode .chart-header h1 {
  font-size: 40px;
}

.chart-header h1 {
  margin: 0 0 12px 0;
  font-size: 32px;
  color: #333;
  font-weight: 700;
}

.chart-info {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.info-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: linear-gradient(180deg, #fbfffe 0%, #f0fffb 100%);
  border-radius: 16px;
  font-size: 20px;
  color: #0b6b63;
  box-shadow: 0 6px 18px rgba(6, 128, 116, 0.06);
  border: 1px solid rgba(6,128,116,0.06);
}

.chart-wrapper {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  transform-origin: center center;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Auto mode: fill available space */
.chart-wrapper:not(.aspect-ratio-mode) {
  flex: 1 1 auto;
  height: 100%;
  width: 100%;
}

/* Aspect ratio mode: fixed size calculated by script */
.chart-wrapper.aspect-ratio-mode {
  flex: 0 0 auto;
}

.chart {
  width: 100%;
  height: 100%;
  display: block;
  flex: 1;
  min-height: 300px;
}

.wide-mode .chart-wrapper {
  border-radius: 20px;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.15);
}

.fullscreen-mode .chart-wrapper {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
}

/* ===== Scrollbar ===== */
.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #cfeae6, #9ee0d8);
  border-radius: 8px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #b6e0da, #86d7c9);
}

/* ===== Responsive Design ===== */
@media (max-width: 1200px) {
  .sidebar {
    min-width: 200px;
  }
}

@media (max-width: 900px) {
  .indifference-curve-app {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100% !important;
    max-height: 50vh;
    min-width: 100%;
  }
  
  .chart-area {
    padding: 20px;
  }
  
  .resize-handle {
    display: none;
  }
  
}

</style>
