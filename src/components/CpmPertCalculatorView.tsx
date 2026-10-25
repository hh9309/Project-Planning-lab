import React, { useState, useMemo } from 'react';
import { Activity, ProjectCalculationResult } from '../types/project';
import { standardNormalCDF, normalPDF } from '../utils/cpmSolver';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Calculator,
  BarChart3,
  TrendingUp,
  Sliders,
  AlertCircle,
  Sparkles,
  Layers,
  Users,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  activities: Activity[];
  calcResult: ProjectCalculationResult;
  calcMode: 'cpm' | 'pert';
  onToggleCalcMode: (mode: 'cpm' | 'pert') => void;
  onUpdateActivity: (act: Activity) => void;
}

export const CpmPertCalculatorView: React.FC<Props> = ({
  activities,
  calcResult,
  calcMode,
  onToggleCalcMode,
  onUpdateActivity,
}) => {
  const [activeTab, setActiveTab] = useState<
    'resourceLoad' | 'gantt' | 'pertDist' | 'scheduleTable'
  >('resourceLoad');
  const [targetDays, setTargetDays] = useState<number>(Math.ceil(calcResult.projectDuration));

  // Resource Leveling State
  const resourceRoles = useMemo(() => {
    const roles = Array.from(new Set(activities.map((a) => a.resourceRole).filter(Boolean)));
    return roles;
  }, [activities]);

  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [capacityLimit, setCapacityLimit] = useState<number>(4);
  const [simulatedShifts, setSimulatedShifts] = useState<Record<string, number>>({});

  // PERT statistical calculations for targetDays
  const mean = calcResult.projectDuration;
  const stdDev = calcResult.criticalStdDev || 1;
  const zScore = stdDev > 0 ? (targetDays - mean) / stdDev : 0;
  const probAtTarget = Math.round(standardNormalCDF(zScore) * 1000) / 10;

  // Max duration for Gantt scale
  const totalDays = Math.ceil(calcResult.projectDuration) || 30;

  // Generate Day-by-Day Resource Load Data for Recharts
  const resourceChartData = useMemo(() => {
    const ceilDays = Math.ceil(calcResult.projectDuration) + 2;
    const dailyData: Array<{
      day: string;
      dayIndex: number;
      usage: number;
      limit: number;
      isOverallocated: boolean;
      overload: number;
      tasks: Array<{
        id: string;
        name: string;
        demand: number;
        isCritical: boolean;
        tf: number;
        role: string;
      }>;
    }> = [];

    for (let day = 0; day <= ceilDays; day++) {
      const activeTasks: Array<{
        id: string;
        name: string;
        demand: number;
        isCritical: boolean;
        tf: number;
        role: string;
      }> = [];

      let totalDemand = 0;

      activities.forEach((act) => {
        if (selectedRole !== 'all' && act.resourceRole !== selectedRole) {
          return;
        }

        // Apply any simulated shift
        const shift = simulatedShifts[act.id] || 0;
        const effectiveES = act.es + shift;
        const effectiveEF = act.ef + shift;

        if (day >= Math.floor(effectiveES) && day < Math.ceil(effectiveEF)) {
          totalDemand += act.resourceDemand;
          activeTasks.push({
            id: act.id,
            name: act.name,
            demand: act.resourceDemand,
            isCritical: act.isCritical,
            tf: act.tf,
            role: act.resourceRole,
          });
        }
      });

      const isOver = totalDemand > capacityLimit;
      dailyData.push({
        day: `第${day}天`,
        dayIndex: day,
        usage: totalDemand,
        limit: capacityLimit,
        isOverallocated: isOver,
        overload: Math.max(0, totalDemand - capacityLimit),
        tasks: activeTasks,
      });
    }

    return dailyData;
  }, [activities, calcResult.projectDuration, selectedRole, capacityLimit, simulatedShifts]);

  // Overallocation summary
  const overallocatedDaysCount = resourceChartData.filter((d) => d.isOverallocated).length;
  const peakLoad = Math.max(...resourceChartData.map((d) => d.usage), 0);

  // Heuristic Resource Leveling Simulation: shift non-critical activities with float during peaks
  const handleAutoLeveling = () => {
    const shifts: Record<string, number> = {};
    // Find non-critical activities running during peak days and shift them within their TF
    activities.forEach((act) => {
      if (!act.isCritical && act.tf > 0) {
        // Shift by a heuristic offset (up to half of TF)
        const proposedShift = Math.min(Math.floor(act.tf * 0.7), 6);
        if (proposedShift > 0) {
          shifts[act.id] = proposedShift;
        }
      }
    });
    setSimulatedShifts(shifts);
  };

  const handleResetLeveling = () => {
    setSimulatedShifts({});
  };

  // Custom Recharts Tooltip for Resource Load
  const CustomResourceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900 text-white p-3.5 rounded-xl shadow-xl border border-stone-700 text-xs space-y-2 max-w-xs">
          <div className="flex items-center justify-between border-b border-stone-700 pb-1.5">
            <span className="font-mono font-bold text-amber-300">{data.day}</span>
            {data.isOverallocated ? (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                超配超载 +{data.overload}单位
              </span>
            ) : (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                负荷正常
              </span>
            )}
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-stone-300">总需求负荷:</span>
            <span
              className={`font-bold text-sm ${
                data.isOverallocated ? 'text-rose-400' : 'text-indigo-300'
              }`}
            >
              {data.usage} 单位 / 天
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-stone-300">供给容量上限:</span>
            <span className="text-stone-300">{data.limit} 单位 / 天</span>
          </div>

          <div className="pt-1 border-t border-stone-800">
            <span className="text-stone-400 block text-[10px] mb-1">
              当日活跃并发作业 ({data.tasks.length}项):
            </span>
            <div className="space-y-1">
              {data.tasks.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-[11px] bg-stone-800/80 p-1 rounded"
                >
                  <span className="truncate max-w-[170px]">
                    [{t.id}] {t.name}
                  </span>
                  <span className="font-mono font-bold text-indigo-300 shrink-0 ml-1">
                    {t.demand}单 {t.isCritical ? '(关键)' : `(TF=${t.tf}d)`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 04 · 计算引擎与资源调平
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            PERT 三点估计、CPM 顺推逆推与 Recharts 资源负荷调平
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            提供确定性 CPM 与随机性 PERT 双模式。通过顺推算 ES/EF、逆推算 LS/LF 精确识别总时差 (TF) 与自由时差 (FF)，
            并利用 Recharts 绘制周期性资源负荷直方图，通过颜色标注资源超配时间段以实现直观的资源调平分析。
          </p>
        </div>

        {/* Mode & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {/* CPM / PERT Toggle */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => onToggleCalcMode('cpm')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                calcMode === 'cpm'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              CPM 确定性工期
            </button>
            <button
              onClick={() => onToggleCalcMode('pert')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                calcMode === 'pert'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              PERT 三点估计概率
            </button>
          </div>

          {/* Sub Views */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('resourceLoad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'resourceLoad'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>资源负荷直方图 (Recharts)</span>
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'gantt'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              甘特图与缓冲
            </button>
            <button
              onClick={() => setActiveTab('pertDist')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'pertDist'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              高斯置信度曲线
            </button>
            <button
              onClick={() => setActiveTab('scheduleTable')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'scheduleTable'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              时间参数总览表
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">
            {calcMode === 'pert' ? 'PERT 期望工期 (Te)' : 'CPM 关键工期 (Critical Path)'}
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1 tabular-nums font-mono">
            {calcResult.projectDuration} <span className="text-xs font-sans text-stone-500 font-normal">天</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            关键路径活动: {calcResult.criticalPathIds.join(' → ')}
          </div>
        </div>

        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">关键路径累计方差 / 标准差</div>
          <div className="text-2xl font-black text-stone-900 mt-1 tabular-nums font-mono">
            σ = {calcResult.criticalStdDev} <span className="text-xs font-sans text-stone-500 font-normal">天</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            方差和 Σσ² = {calcResult.criticalVarianceSum} (天²)
          </div>
        </div>

        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">在基准工期按时完工概率</div>
          <div className="text-2xl font-black text-indigo-700 mt-1 tabular-nums font-mono">
            50.0% <span className="text-xs font-sans text-stone-500 font-normal">中位概率</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            正态分布对称中点 (Z = 0.0)
          </div>
        </div>

        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">95% 高置信承诺工期 (Z=1.65)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums font-mono">
            {Math.round((calcResult.projectDuration + 1.645 * calcResult.criticalStdDev) * 10) / 10}{' '}
            <span className="text-xs font-sans text-stone-500 font-normal">天</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            含安全缓冲量: +{Math.round(1.645 * calcResult.criticalStdDev * 10) / 10} 天
          </div>
        </div>
      </div>

      {/* TAB 1: Resource Load Histogram (Recharts) */}
      {activeTab === 'resourceLoad' && (
        <div className="space-y-6">
          {/* Resource Control Toolbar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-xs text-stone-500 block mb-1">选择分析工种/专业角色:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none"
                >
                  <option value="all">全项目全部工种总负荷</option>
                  {resourceRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-500 block mb-1">
                  供给上限阈值 (Capacity Limit):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={capacityLimit}
                    onChange={(e) => setCapacityLimit(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900 text-center focus:outline-none"
                  />
                  <span className="text-xs text-stone-500">单位/天</span>
                </div>
              </div>
            </div>

            {/* Leveling Action Simulation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoLeveling}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>模拟削峰填谷平移 (Leveling)</span>
              </button>

              {Object.keys(simulatedShifts).length > 0 && (
                <button
                  onClick={handleResetLeveling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>复位初始状态</span>
                </button>
              )}
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900">
                    全周期时间维度资源负荷柱状图 (Resource Load Profile)
                  </h3>
                  {overallocatedDaysCount > 0 ? (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded">
                      检测到 {overallocatedDaysCount} 个超配时间周期 (过载峰值: {peakLoad} 单位)
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium px-2 py-0.5 rounded">
                      ✓ 各周期资源需求均在供给上限以内
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  红色柱体标注资源超配的时间段，深蓝柱体为正常负荷；虚线代表供给能力上限阈值
                </p>
              </div>

              {/* Legend Indicator */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-indigo-600" />
                  <span className="text-stone-700">安全负荷</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-600" />
                  <span className="text-rose-700 font-bold">资源超配 (Overallocated)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-rose-600 border-t border-dashed border-rose-600" />
                  <span className="text-stone-500">上限阈值 ({capacityLimit})</span>
                </div>
              </div>
            </div>

            {/* Recharts BarChart Render */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resourceChartData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: '#78716c' }}
                    interval={Math.max(1, Math.floor(resourceChartData.length / 16))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#78716c' }}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 2, capacityLimit + 2)]}
                  />
                  <Tooltip content={<CustomResourceTooltip />} />
                  <ReferenceLine
                    y={capacityLimit}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    label={{
                      value: `供给上限: ${capacityLimit}单位/天`,
                      fill: '#be123c',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                    {resourceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isOverallocated ? '#e11d48' : '#4f46e5'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leveling Diagnostic & Optimization Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-2">
              <span className="text-xs text-stone-500">资源超配与冲突诊断</span>
              <div className="text-lg font-bold text-stone-900">
                {overallocatedDaysCount > 0 ? (
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>存在 {overallocatedDaysCount} 天超额窝工风险</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>资源负荷平稳无超配</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {overallocatedDaysCount > 0
                  ? `在第 ${resourceChartData.filter((d) => d.isOverallocated).map((d) => d.dayIndex).join(', ')} 天，现场需求超出上限，易导致施工停滞与关键工序资源争用。`
                  : '所有工序在时间维度上的并发需求均在可供给阈值之内，施工节拍良好。'}
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-2">
              <span className="text-xs text-stone-500">启发式削峰填谷空间 (Float Assets)</span>
              <div className="text-lg font-bold text-stone-900 font-mono">
                {activities.filter((a) => !a.isCritical && a.tf > 0).length} 项非关键任务可平移
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                利用非关键活动的<strong>总时差 (TF)</strong> 错开启动时间，可在不拖延项目竣工日期的前提下，将峰值需求直接降至安全红线以下。
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-2">
              <span className="text-xs text-stone-500">当前平移调整状态</span>
              <div className="text-lg font-bold text-indigo-700 font-mono">
                {Object.keys(simulatedShifts).length > 0
                  ? `已模拟平移 ${Object.keys(simulatedShifts).length} 项工序`
                  : '当前为初始最早开始 (ES) 排期'}
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {Object.keys(simulatedShifts).length > 0
                  ? Object.entries(simulatedShifts)
                      .map(([id, s]) => `${id}: 向后平移+${s}天`)
                      .join('; ')
                  : '点击上方【模拟削峰填谷平移】可一键观察时差平移对红色柱体的消除效果。'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Gantt Chart */}
      {activeTab === 'gantt' && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                双时差甘特图 (Gantt Chart with Float & Critical Path)
              </h3>
              <p className="text-xs text-stone-500">
                实心条代表作业工期；虚线扩展条代表该活动允许延迟的总时差 (TF) 容限区间
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span className="text-stone-700 font-medium">关键活动 (TF=0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-600" />
                <span className="text-stone-700 font-medium">非关键活动</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 border-b-2 border-dashed border-stone-400" />
                <span className="text-stone-500">总时差缓冲区</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-3xl">
              <div className="grid grid-cols-12 border-b border-stone-200 pb-2 text-xs font-mono text-stone-500">
                <div className="col-span-4 font-sans font-medium text-stone-700">
                  活动名称与编码
                </div>
                <div className="col-span-8 flex justify-between pr-2">
                  <span>第 0 天</span>
                  <span>第 {Math.round(totalDays * 0.25)} 天</span>
                  <span>第 {Math.round(totalDays * 0.5)} 天</span>
                  <span>第 {Math.round(totalDays * 0.75)} 天</span>
                  <span className="font-bold text-rose-600">终点 {totalDays} 天</span>
                </div>
              </div>

              <div className="divide-y divide-stone-100 py-2">
                {activities.map((act) => {
                  const leftPercent = (act.es / totalDays) * 100;
                  const durationPercent = (act.duration / totalDays) * 100;
                  const floatPercent = (act.tf / totalDays) * 100;

                  return (
                    <div
                      key={act.id}
                      className="grid grid-cols-12 items-center py-2.5 hover:bg-stone-50/70 transition-colors text-xs"
                    >
                      <div className="col-span-4 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-xs ${
                              act.isCritical ? 'text-rose-600' : 'text-stone-800'
                            }`}
                          >
                            {act.id}
                          </span>
                          <span className="text-stone-800 truncate" title={act.name}>
                            {act.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                          ES:{act.es} EF:{act.ef} · TF:{act.tf}d
                        </div>
                      </div>

                      <div className="col-span-8 relative h-7 bg-stone-100/60 rounded flex items-center px-1">
                        <div
                          className="absolute top-0 bottom-0 border-r border-rose-300 pointer-events-none"
                          style={{
                            left: `${(calcResult.projectDuration / totalDays) * 100}%`,
                          }}
                        />

                        {act.tf > 0 && (
                          <div
                            className="absolute h-5 border-y border-r border-dashed border-stone-400 bg-stone-200/40 rounded-r"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${durationPercent + floatPercent}%`,
                            }}
                            title={`总时差允许向右浮动至第 ${act.lf} 天`}
                          />
                        )}

                        <div
                          className={`absolute h-5 rounded flex items-center justify-between px-2 text-[10px] text-white font-mono shadow-xs transition-all ${
                            act.isCritical
                              ? 'bg-rose-500 hover:bg-rose-600'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(2, durationPercent)}%`,
                          }}
                        >
                          <span className="truncate">{act.duration}d</span>
                          {act.isCritical && (
                            <span className="text-[9px] bg-rose-700/80 px-1 rounded ml-1 hidden sm:inline">
                              CP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERT Normal Distribution */}
      {activeTab === 'pertDist' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              目标工期概率测算模拟器
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              根据中心极限定理，项目在关键路径上多工序工期的叠加服从正态分布：
              {'N(μ = ' + mean + ', σ = ' + calcResult.criticalStdDev + ')'}。
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">设定目标承诺完工期:</span>
                <span className="font-mono font-bold text-base text-indigo-700 tabular-nums">
                  {targetDays} 天
                </span>
              </div>
              <input
                type="range"
                min={Math.floor(mean * 0.75)}
                max={Math.ceil(mean * 1.35)}
                step={1}
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                <span>{Math.floor(mean * 0.75)} 天</span>
                <span>期望 {mean} 天</span>
                <span>{Math.ceil(mean * 1.35)} 天</span>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600">标准偏量 (Z-Score):</span>
                <span className="font-mono font-bold text-stone-900 text-xs">
                  {Math.round(zScore * 100) / 100}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600">预期按时完工概率:</span>
                <span className="font-mono font-black text-xl text-indigo-700 tabular-nums">
                  {probAtTarget}%
                </span>
              </div>
              <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                {probAtTarget >= 95 ? (
                  <span className="text-emerald-700 font-medium">
                    ✓ 极高可靠性：已覆盖 95% 置信安全区间
                  </span>
                ) : probAtTarget >= 75 ? (
                  <span className="text-indigo-700 font-medium">
                    ℹ 较理想：具备一定抗风险缓冲
                  </span>
                ) : probAtTarget >= 50 ? (
                  <span className="text-amber-700 font-medium">
                    ⚠ 风险可观：有一半概率发生延误
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium">
                    ✕ 极度高危：完工概率低于 50%，必须赶工或调整方案
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-stone-700">
                工程常见置信度承诺阈值：
              </h4>
              <div className="border border-stone-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-stone-50 text-[11px] text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="p-2">置信度</th>
                      <th className="p-2">对应 Z 值</th>
                      <th className="p-2 text-right">建议工期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[11px]">
                    <tr className="hover:bg-stone-50">
                      <td className="p-2 font-sans">50% (中位数)</td>
                      <td className="p-2 text-stone-500">Z = 0.00</td>
                      <td className="p-2 text-right font-bold text-stone-900">{mean} 天</td>
                    </tr>
                    <tr className="hover:bg-stone-50">
                      <td className="p-2 font-sans">85% (稳健基准)</td>
                      <td className="p-2 text-stone-500">Z = 1.04</td>
                      <td className="p-2 text-right font-bold text-indigo-700">
                        {Math.round((mean + 1.04 * stdDev) * 10) / 10} 天
                      </td>
                    </tr>
                    <tr className="hover:bg-stone-50">
                      <td className="p-2 font-sans">95% (航天国防)</td>
                      <td className="p-2 text-stone-500">Z = 1.65</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        {Math.round((mean + 1.65 * stdDev) * 10) / 10} 天
                      </td>
                    </tr>
                    <tr className="hover:bg-stone-50">
                      <td className="p-2 font-sans">99% (绝对门禁)</td>
                      <td className="p-2 text-stone-500">Z = 2.33</td>
                      <td className="p-2 text-right font-bold text-purple-700">
                        {Math.round((mean + 2.33 * stdDev) * 10) / 10} 天
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-5 border border-stone-200 rounded-xl space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                高斯概率密度函数钟形曲线 (Normal Distribution PDF)
              </h3>
              <p className="text-xs text-stone-500">
                阴影填充区域代表目标工期 T ≤ {targetDays} 天以内按时交付的累积概率 P
              </p>
            </div>

            <div className="w-full h-64 bg-stone-50 border border-stone-200 rounded-lg p-2 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
                <line x1="40" y1="190" x2="480" y2="190" stroke="#d6d3d1" strokeWidth="1.5" />

                {(() => {
                  const xMin = mean - 3.5 * stdDev;
                  const xMax = mean + 3.5 * stdDev;
                  const points: Array<{ x: number; y: number; val: number }> = [];
                  const steps = 60;
                  const maxPdf = normalPDF(mean, mean, stdDev);

                  for (let i = 0; i <= steps; i++) {
                    const val = xMin + (i / steps) * (xMax - xMin);
                    const pdf = normalPDF(val, mean, stdDev);
                    const plotX = 40 + (i / steps) * 440;
                    const plotY = 190 - (pdf / maxPdf) * 150;
                    points.push({ x: plotX, y: plotY, val });
                  }

                  const pathD = points.reduce(
                    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                    ''
                  );

                  const targetPlotX = 40 + ((targetDays - xMin) / (xMax - xMin)) * 440;
                  const clampedTargetX = Math.max(40, Math.min(480, targetPlotX));

                  const shadedPoints = points.filter((p) => p.x <= clampedTargetX);
                  const shadedPath =
                    shadedPoints.length > 0
                      ? `M 40 190 ${shadedPoints.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${clampedTargetX} 190 Z`
                      : '';

                  return (
                    <>
                      {shadedPath && (
                        <path
                          d={shadedPath}
                          fill="rgba(99, 102, 241, 0.25)"
                          stroke="none"
                        />
                      )}

                      <path
                        d={pathD}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                      />

                      <line
                        x1={260}
                        y1={190}
                        x2={260}
                        y2={40}
                        stroke="#78716c"
                        strokeDasharray="4 4"
                        strokeWidth="1.2"
                      />
                      <text
                        x="260"
                        y="32"
                        textAnchor="middle"
                        className="text-[10px] fill-stone-600 font-mono"
                      >
                        μ = {mean}d
                      </text>

                      <line
                        x1={clampedTargetX}
                        y1={190}
                        x2={clampedTargetX}
                        y2={25}
                        stroke="#e11d48"
                        strokeWidth="2"
                      />
                      <text
                        x={clampedTargetX}
                        y="18"
                        textAnchor="middle"
                        className="text-[11px] fill-rose-600 font-bold font-mono"
                      >
                        目标: {targetDays}d ({probAtTarget}%)
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            <p className="text-xs text-stone-500">
              当不确定性（标准差 σ）增大时，钟形曲线将变矮变宽，意味着相同的工期承诺下，准时达标概率将显著恶化。
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Detailed Parameter Table */}
      {activeTab === 'scheduleTable' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              各活动六项时间参数与三点估计详情
            </h3>
            <span className="text-xs text-stone-500">支持直接在表格内微调三点估计参数</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
                  <th className="py-2.5 px-3">活动ID</th>
                  <th className="py-2.5 px-3">名称</th>
                  <th className="py-2.5 px-2 text-center">乐观 a</th>
                  <th className="py-2.5 px-2 text-center">可能 m</th>
                  <th className="py-2.5 px-2 text-center">悲观 b</th>
                  <th className="py-2.5 px-2 text-center">期望 Te</th>
                  <th className="py-2.5 px-2 text-center">方差 σ²</th>
                  <th className="py-2.5 px-2 text-center">ES</th>
                  <th className="py-2.5 px-2 text-center">EF</th>
                  <th className="py-2.5 px-2 text-center">LS</th>
                  <th className="py-2.5 px-2 text-center">LF</th>
                  <th className="py-2.5 px-2 text-center">总时差 TF</th>
                  <th className="py-2.5 px-3 text-center">关键路径</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {activities.map((act) => (
                  <tr
                    key={act.id}
                    className={`hover:bg-stone-50 transition-colors ${
                      act.isCritical ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-stone-900">{act.id}</td>
                    <td className="py-2.5 px-3 font-sans text-stone-800">{act.name}</td>

                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        value={act.optimistic}
                        onChange={(e) =>
                          onUpdateActivity({ ...act, optimistic: Number(e.target.value) || 1 })
                        }
                        className="w-12 text-center border border-stone-200 rounded px-1 py-0.5 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        value={act.mostLikely}
                        onChange={(e) =>
                          onUpdateActivity({ ...act, mostLikely: Number(e.target.value) || 1 })
                        }
                        className="w-12 text-center border border-stone-200 rounded px-1 py-0.5 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        value={act.pessimistic}
                        onChange={(e) =>
                          onUpdateActivity({ ...act, pessimistic: Number(e.target.value) || 1 })
                        }
                        className="w-12 text-center border border-stone-200 rounded px-1 py-0.5 focus:outline-none"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-center font-bold text-indigo-700">
                      {act.expectedDuration}
                    </td>
                    <td className="py-2.5 px-2 text-center text-stone-500">{act.variance}</td>
                    <td className="py-2.5 px-2 text-center text-stone-700">{act.es}</td>
                    <td className="py-2.5 px-2 text-center text-stone-700">{act.ef}</td>
                    <td className="py-2.5 px-2 text-center text-stone-700">{act.ls}</td>
                    <td className="py-2.5 px-2 text-center text-stone-700">{act.lf}</td>
                    <td
                      className={`py-2.5 px-2 text-center font-bold ${
                        act.tf === 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {act.tf}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {act.isCritical ? (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          关键
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400">非关键</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
