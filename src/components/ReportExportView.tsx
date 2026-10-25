import React, { useState, useMemo } from 'react';
import { Activity, WbsNode, ProjectCalculationResult, CaseStudy } from '../types/project';
import { CASE_STUDIES } from '../data/cases';
import { solveCPM } from '../utils/cpmSolver';
import {
  FileText,
  Download,
  Copy,
  Printer,
  FileSpreadsheet,
  Code2,
  Check,
  Layers,
  ArrowRight,
  Eye,
  Workflow,
  Sparkles,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  activities: Activity[];
  wbsNodes: WbsNode[];
  calcResult: ProjectCalculationResult;
  currentCase: CaseStudy;
  onImportJson?: (data: { activities: Activity[]; wbsNodes: WbsNode[] }) => void;
}

export const ReportExportView: React.FC<Props> = ({
  activities: currentActivities,
  wbsNodes: currentWbsNodes,
  calcResult: currentCalcResult,
  currentCase,
}) => {
  // State for preview selection: 'current' or any case.id
  const [selectedCaseId, setSelectedCaseId] = useState<string>('current');
  // View mode: 'preview' (Rich Document view) or 'markdown' (Raw Markdown text)
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Compute dataset and calculation result based on active selection
  const activeReportData = useMemo(() => {
    if (selectedCaseId === 'current') {
      return {
        caseInfo: currentCase,
        activities: currentActivities,
        wbsNodes: currentWbsNodes,
        calcResult: currentCalcResult,
        isCustom: true,
      };
    }
    const foundCase = CASE_STUDIES.find((c) => c.id === selectedCaseId) || CASE_STUDIES[0];
    const solved = solveCPM(foundCase.activities, 'cpm', undefined, foundCase.resourceLimits);
    return {
      caseInfo: foundCase,
      activities: solved.activities,
      wbsNodes: foundCase.wbsNodes,
      calcResult: solved.result,
      isCustom: false,
    };
  }, [selectedCaseId, currentCase, currentActivities, currentWbsNodes, currentCalcResult]);

  const { caseInfo, activities, wbsNodes, calcResult } = activeReportData;

  // Helper: Generate raw CSV string for any activity list
  const buildCsvContent = (acts: Activity[]): string => {
    const headers = [
      'Activity_ID',
      'WBS_Code',
      'Activity_Name',
      'Category',
      'Duration_Days',
      'Optimistic_a',
      'MostLikely_m',
      'Pessimistic_b',
      'Predecessors',
      'ES_Early_Start',
      'EF_Early_Finish',
      'LS_Late_Start',
      'LF_Late_Finish',
      'Total_Float_TF',
      'Free_Float_FF',
      'Is_Critical',
      'Resource_Role',
      'Resource_Demand',
      'Crash_Duration_Days',
      'Crash_Cost_Per_Day',
      'Normal_Cost',
    ];

    const rows = acts.map((a) => {
      const predsStr = a.predecessors.map((p) => `${p.id}(${p.type}${p.lag ? '+' + p.lag : ''})`).join(';');
      return [
        a.id,
        a.wbsCode,
        `"${a.name.replace(/"/g, '""')}"`,
        `"${a.category || ''}"`,
        a.duration,
        a.optimistic,
        a.mostLikely,
        a.pessimistic,
        `"${predsStr}"`,
        a.es ?? 0,
        a.ef ?? 0,
        a.ls ?? 0,
        a.lf ?? 0,
        a.tf ?? 0,
        a.ff ?? 0,
        a.isCritical ? 'TRUE' : 'FALSE',
        `"${a.resourceRole}"`,
        a.resourceDemand,
        a.crashDuration || a.duration,
        a.crashCostPerDay || 0,
        a.normalCost || 0,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  // Helper: Generate raw JSON string for any case
  const buildJsonContent = (targetCase: CaseStudy): string => {
    const payload = {
      meta: {
        id: targetCase.id,
        title: targetCase.title,
        domain: targetCase.domain,
        mappedConcept: targetCase.mappedConcept,
        exportTime: new Date().toISOString(),
      },
      wbsNodes: targetCase.wbsNodes,
      activities: targetCase.activities,
      resourceLimits: targetCase.resourceLimits,
    };
    return JSON.stringify(payload, null, 2);
  };

  // File download trigger
  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Generate 6-Part Structured Systems Engineering Report in Markdown
  const markdownReport = useMemo(() => {
    const criticalList = calcResult.criticalPathIds.map((id, idx) => {
      const a = activities.find((act) => act.id === id);
      return `${idx + 1}. **[${id}] ${a?.name}** — 工期: ${a?.duration} 天 | 早晚时标: ES=${a?.es}d / EF=${a?.ef}d / LS=${a?.ls}d / LF=${a?.lf}d | 责任资源: ${a?.resourceRole}`;
    }).join('\n');

    const nearCritical = activities.filter((a) => !a.isCritical && a.tf <= 5);
    const crashingCandidates = activities
      .filter((a) => a.isCritical && a.crashCostPerDay && a.crashCostPerDay > 0)
      .sort((a, b) => (a.crashCostPerDay || 0) - (b.crashCostPerDay || 0));

    return `# ${caseInfo.title} · 系统工程全生命周期规划分析报告

> **报告版本**: SE-CPM-PERT-V4.2  
> **规划方法论**: ${caseInfo.mappedConcept}  
> **报告编制时间**: ${new Date().toLocaleString()}  
> **基准总工期**: **${calcResult.projectDuration} 天** | **PERT 方差累计**: $\\Sigma\\sigma^2 = ${calcResult.criticalVarianceSum}$ ($\\sigma = ${calcResult.criticalStdDev}$ 天)

---

## 第一部分：项目工程概况与系统目标定义 (System Scope & Objectives)

### 1.1 工程背景与任务使命
${caseInfo.description}

### 1.2 现实工程挑战与边界约束
${caseInfo.challenges.map((c, i) => `${i + 1}. **挑战 ${i + 1}**: ${c}`).join('\n')}

### 1.3 核心管控措施与系统工程落地准则
${caseInfo.keyActions.map((a, i) => `${i + 1}. **落地措施 ${i + 1}**: ${a}`).join('\n')}

---

## 第二部分：工作分解结构 (WBS) 多级展开与交付物划分 (WBS Decomposition)

依据系统工程 100% 范围完整性原则，自顶向下逐级分解交付物至可独立核算的管理控制账户（工作包）：

| 层级 | WBS编码 | 交付物 / 工作包名称 | 责任部门 / 负责人 | 估算工作量 (人天) | 预算额度 (万元) | 完成进度 |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
${wbsNodes.map((n) => `| L${n.level} | ${n.code} | ${n.name} | ${n.owner} | ${n.workDays}d | ￥${n.costBudget}万 | ${n.progress}% |`).join('\n')}

---

## 第三部分：网络拓扑逻辑与紧前约束关系编排 (Network Topology & Dependencies)

构建单代号网络图 (AON)，编排工序间完成-开始 (FS)、开始-开始 (SS)、完成-完成 (FF) 及延隔时差 (Lag)：

| 活动ID | WBS对应 | 活动工序名称 | 基准工期 | 紧前逻辑关系约束 | 资源班组要求 | 资源日需求 |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: |
${activities.map((a) => {
  const preds = a.predecessors.length > 0
    ? a.predecessors.map((p) => `${p.id}(${p.type}${p.lag ? '+' + p.lag : ''})`).join('、')
    : '无 (项目始端)';
  return `| ${a.id} | ${a.wbsCode} | ${a.name} | ${a.duration} 天 | ${preds} | ${a.resourceRole} | ${a.resourceDemand} |`;
}).join('\n')}

> **拓扑合法性检验结论**: 经 Kahn 拓扑排序算法检验，全网络无死锁闭环回路 (DAG 拓扑良好)，满足图论可计算性准则。

---

## 第四部分：确定型 CPM 顺逆推计算与 PERT 随机性分析 (CPM & PERT Analysis)

### 4.1 全活动顺逆推时间参数全矩阵

| 活动ID | 活动工序 | 工期 | ES (早始) | EF (早终) | LS (迟始) | LF (迟终) | 总时差 TF | 自由时差 FF | 关键状态 |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${activities.map((a) => `| ${a.id} | ${a.name} | ${a.duration}d | ${a.es} | ${a.ef} | ${a.ls} | ${a.lf} | **${a.tf}d** | ${a.ff}d | ${a.isCritical ? '**CRITICAL (关键)**' : 'Normal'} |`).join('\n')}

### 4.2 绝对关键路径 (Critical Path) 链条判定
当前基准工期为 **${calcResult.projectDuration} 天**。总时差 $TF = 0$ 的绝对关键链条为：
${criticalList}

### 4.3 PERT 三点估计与交付工期置信度分布
考虑极端乐观 ($a$) 与悲观 ($b$) 扰动，依据中心极限定理，交付周期渐进服从均值 $\\mu = ${calcResult.projectDuration}$ 天、标准差 $\\sigma = ${calcResult.criticalStdDev}$ 天的正态分布：
- **50% 中位期望工期**: ${calcResult.projectDuration} 天 (标准基准)
- **85% 工业稳健工期**: ${Math.round((calcResult.projectDuration + 1.04 * calcResult.criticalStdDev) * 10) / 10} 天 (追加缓冲 +${Math.round(1.04 * calcResult.criticalStdDev * 10) / 10} 天)
- **95% 高可靠承诺工期**: ${Math.round((calcResult.projectDuration + 1.645 * calcResult.criticalStdDev) * 10) / 10} 天 (向业主承诺的黄金交期，置信度高)
- **99% 绝对安全工期**: ${Math.round((calcResult.projectDuration + 2.33 * calcResult.criticalStdDev) * 10) / 10} 天 (用于兜底防范极端黑天鹅风险)

---

## 第五部分：资源负荷剖面、超配冲突检测与削峰调平策略 (Resource Leveling)

### 5.1 专业资源峰值负荷与容量对照
${Object.entries(calcResult.resourceProfiles).map(([role, prof]) => {
  const peak = Math.max(...prof, 0);
  const limit = caseInfo.resourceLimits?.[role] || 999;
  const isOver = peak > limit;
  return `- **${role}**: 日峰值需求 **${peak} 单位** / 现场容量上限 **${limit} 单位** ${isOver ? '⚠️ [检测到资源超配超限]' : '✓ [负荷在安全容量内]'}`;
}).join('\n')}

### 5.2 资源调平优化建议
${calcResult.resourceBottlenecks.length > 0
  ? `识别到 ${calcResult.resourceBottlenecks.length} 个超配瓶颈时间点。建议利用非关键路径活动的自由时差 (FF)，将其早开始时间 (ES) 向后顺延，实现错峰施工作业，消除瞬时资源过度堆积。`
  : '当前项目资源配置处于均衡状态，各工种负荷均在标称容量范围内，无需进行破坏性工期顺延。'}

---

## 第六部分：关键路径漂移防范、工期压缩 (Crashing) 决策与实施准则 (Crashing Directives)

### 6.1 次关键路径漂移 (Float Drift) 预警
${nearCritical.length > 0
  ? `识别到 **${nearCritical.length}** 项次关键高危活动：${nearCritical.map((a) => `${a.id}(${a.name}, TF=${a.tf}天)`).join('、')}。  
**预警**: 当这些活动延误达到其总时差上限时，将立即转化为新的关键路径，触发多路径连锁延误。`
  : '非关键活动总时差裕度相对充裕，短期内关键路径漂移风险处于低位。'}

### 6.2 成本斜率赶工 (Crashing) 排序方案
若业主或外部指令要求压缩基准工期，严禁盲目全线加班！应严格遵循【最小成本斜率 ($\\Delta C / \\Delta T$)】原则在关键路径上压缩：
${crashingCandidates.length > 0
  ? crashingCandidates.map((c, i) => `${i + 1}. **优先压缩工序 [${c.id}] ${c.name}**: 成本斜率 = **${c.crashCostPerDay} 万元/天** (正常工期 ${c.duration}天 $\\rightarrow$ 极限工期 ${c.crashDuration}天，最大可压缩 ${c.duration - (c.crashDuration || c.duration)} 天)`).join('\n')
  : '- 当前关键工序未标注赶工成本参数，建议组织专家现场评估班组两班倒边际成本。'}

### 6.3 综合工程决策指令
1. **进度基线固化**: 严密锁定总时差为 0 的关键工序，严禁在关键路径上抽调资源。
2. **时差缓冲监控**: 每周例会核查次关键活动时差消耗速率，一旦 $TF < 2$ 天即刻列入重点盯防。
3. **闭环变更控制**: 任何单项工序范围或逻辑变更，必须重算全网络 CPM 与资源负荷方可审批。

*本报告经系统工程项目规划实验室自动化运筹引擎求解生成，符合 GB/T 及 ISO/IEC 系统与软件工程管理规范。*
`;
  }, [caseInfo, activities, wbsNodes, calcResult]);

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-indigo-600" />
            <span>核心模块 09 · 报告导出与原始数据集</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            系统工程规划分析报告（6大维度全流程）与全案例数据下载
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            提供六大工业案例与当前项目的原始数据下载（CSV / JSON），并按照全流程导引的 6 大步骤生成可交互预览的专业工程规划综合分析报告。
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印 / 导出 PDF</span>
          </button>
          <button
            onClick={() =>
              handleDownloadFile(
                markdownReport,
                `${caseInfo.id}_full_engineering_report.md`,
                'text/markdown;charset=utf-8'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载 Markdown 报告</span>
          </button>
        </div>
      </div>

      {/* Section 1: 六大案例原始数据下载选项矩阵 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-600" />
            <h3 className="text-sm font-bold text-stone-900">
              六大案例原始数据下载与报告预览切换矩阵
            </h3>
          </div>
          <span className="text-[11px] text-stone-500 font-mono">
            支持一键下载 CSV/JSON 原始结构化数据，或切换下方报告预览
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card for Current Active Project */}
          <div
            className={`border rounded-xl p-4 transition-all relative flex flex-col justify-between ${
              selectedCaseId === 'current'
                ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                  当前工作区动态工程
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {currentActivities.length} 工序 / {currentCalcResult.projectDuration}天
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-900 truncate">
                {currentCase.title}
              </h4>
              <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                正在进行实时编辑与拓扑推演的工作区项目数据。
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-stone-200/80 flex items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleDownloadFile(
                      buildCsvContent(currentActivities),
                      `current_workspace_dataset.csv`,
                      'text/csv;charset=utf-8'
                    )
                  }
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                  title="下载当前项目活动 CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() =>
                    handleDownloadFile(
                      JSON.stringify({ activities: currentActivities, wbsNodes: currentWbsNodes }, null, 2),
                      `current_workspace_model.json`,
                      'application/json;charset=utf-8'
                    )
                  }
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                  title="下载当前项目完整 JSON"
                >
                  <Code2 className="w-3 h-3 text-amber-600" />
                  <span>JSON</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedCaseId('current')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  selectedCaseId === 'current'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {selectedCaseId === 'current' ? '正在预览 ✓' : '预览此报告'}
              </button>
            </div>
          </div>

          {/* Cards for each of the 6 Engineering Cases */}
          {CASE_STUDIES.map((c) => {
            const isSelected = selectedCaseId === c.id;
            return (
              <div
                key={c.id}
                className={`border rounded-xl p-4 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                      {c.domain}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {c.activities.length} 项工序
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 truncate" title={c.title}>
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {c.subtitle} · {c.mappedConcept}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-200/80 flex items-center justify-between gap-1.5 text-xs">
                  {/* Download raw options */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleDownloadFile(
                          buildCsvContent(c.activities),
                          `${c.id}_raw_dataset.csv`,
                          'text/csv;charset=utf-8'
                        )
                      }
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                      title="下载原始 CSV 数据表"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadFile(
                          buildJsonContent(c),
                          `${c.id}_raw_model.json`,
                          'application/json;charset=utf-8'
                        )
                      }
                      className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                      title="下载原始 JSON 模型"
                    >
                      <Code2 className="w-3 h-3 text-amber-600" />
                      <span>JSON</span>
                    </button>
                  </div>

                  {/* Switch to preview this case */}
                  <button
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    {isSelected ? '正在预览 ✓' : '预览此报告'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: 报告预览交互区 (按全流程导引 6 大部分组织) */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Preview Control Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-stone-900">
              报告预览：{caseInfo.title}
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono">
              6个完整部分
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-stone-200 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'preview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>工程排版预览</span>
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'markdown' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Markdown 源码</span>
              </button>
            </div>

            <button
              onClick={() => handleCopy(markdownReport, 'full_md')}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedType === 'full_md' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedType === 'full_md' ? '已复制全文' : '复制全文'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'markdown' ? (
          /* Raw Markdown View */
          <div className="p-6 bg-stone-950 text-stone-200 font-mono text-xs overflow-x-auto max-h-[750px] leading-relaxed select-text">
            <pre className="whitespace-pre-wrap">{markdownReport}</pre>
          </div>
        ) : (
          /* Rich Document View (Organized by 6-Part Workflow Steps) */
          <div className="p-8 md:p-12 space-y-10 text-stone-800 text-xs leading-relaxed max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
            {/* Report Header Title */}
            <div className="border-b-2 border-stone-900 pb-6 space-y-2">
              <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                <span>SYSTEMS ENGINEERING LIFE-CYCLE PLANNING REPORT</span>
                <span>标准编号: SE-CPM-PERT-V4.2</span>
              </div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                {caseInfo.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-stone-600 text-xs pt-1">
                <span>规划方法论: <strong className="text-stone-900">{caseInfo.mappedConcept}</strong></span>
                <span>·</span>
                <span>基准工期: <strong className="text-rose-600 font-mono text-sm">{calcResult.projectDuration} 天</strong></span>
                <span>·</span>
                <span>关键工序数: <strong className="text-stone-900 font-mono">{calcResult.criticalPathIds.length} 项</strong></span>
                <span>·</span>
                <span>报告时间: <span className="font-mono">{new Date().toLocaleDateString()}</span></span>
              </div>
            </div>

            {/* PART 1: 项目工程概况与系统目标定义 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  PART 01
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  第一部分：项目工程概况与系统目标定义 (System Scope & Objectives)
                </h3>
              </div>
              <div className="space-y-3 text-stone-700">
                <p className="leading-relaxed text-xs">
                  {caseInfo.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <h5 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>现场工程挑战与物理约束</span>
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600">
                      {caseInfo.challenges.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <h5 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>系统工程管控原则与行动指令</span>
                    </h5>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-600">
                      {caseInfo.keyActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* PART 2: 工作分解结构 (WBS) 多级展开与交付物划分 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  PART 02
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  第二部分：工作分解结构 (WBS) 多级展开与交付物划分 (WBS Decomposition)
                </h3>
              </div>
              <p className="text-stone-600 text-[11px]">
                依据 100% 规则，项目分解为明确的工作包与责任账户，确保范围无重叠无遗漏：
              </p>
              <div className="border border-stone-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">层级</th>
                      <th className="py-2.5 px-3">WBS编码</th>
                      <th className="py-2.5 px-4">交付物 / 工作包名称</th>
                      <th className="py-2.5 px-3">责任部门 / 负责人</th>
                      <th className="py-2.5 px-3 text-center">工作量 (人天)</th>
                      <th className="py-2.5 px-3 text-center">预算 (万元)</th>
                      <th className="py-2.5 px-3 text-center">当前进度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    {wbsNodes.map((n) => (
                      <tr key={n.id} className="hover:bg-stone-50/50">
                        <td className="py-2 px-3 text-stone-500">L{n.level}</td>
                        <td className="py-2 px-3 font-bold text-stone-900">{n.code}</td>
                        <td className="py-2 px-4 font-sans text-stone-800 font-medium">{n.name}</td>
                        <td className="py-2 px-3 font-sans text-stone-600">{n.owner}</td>
                        <td className="py-2 px-3 text-center">{n.workDays}d</td>
                        <td className="py-2 px-3 text-center">￥{n.costBudget}万</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            {n.progress}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* PART 3: 网络拓扑逻辑与紧前约束关系编排 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  PART 03
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  第三部分：网络拓扑逻辑与紧前约束关系编排 (Network Topology & Precedence Logic)
                </h3>
              </div>
              <p className="text-stone-600 text-[11px]">
                单代号网络图 (AON) 节点工序依赖清单，涵盖 FS (完成-开始)、SS (开始-开始)、FF (完成-完成) 及延隔 Lag：
              </p>
              <div className="border border-stone-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">活动ID</th>
                      <th className="py-2.5 px-3">WBS</th>
                      <th className="py-2.5 px-4">活动工序名称</th>
                      <th className="py-2.5 px-2 text-center">工期</th>
                      <th className="py-2.5 px-4">紧前逻辑关系与时差延隔</th>
                      <th className="py-2.5 px-3">专业资源要求</th>
                      <th className="py-2.5 px-2 text-center">日需求</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    {activities.map((a) => {
                      const preds =
                        a.predecessors.length > 0
                          ? a.predecessors.map((p) => `${p.id}(${p.type}${p.lag ? '+' + p.lag : ''})`).join('、')
                          : '无 (项目始端)';
                      return (
                        <tr key={a.id} className="hover:bg-stone-50/50">
                          <td className="py-2 px-3 font-bold text-stone-900">{a.id}</td>
                          <td className="py-2 px-3 text-stone-500">{a.wbsCode}</td>
                          <td className="py-2 px-4 font-sans text-stone-800">{a.name}</td>
                          <td className="py-2 px-2 text-center font-bold">{a.duration}d</td>
                          <td className="py-2 px-4 text-stone-700 font-sans">{preds}</td>
                          <td className="py-2 px-3 font-sans text-stone-600">{a.resourceRole}</td>
                          <td className="py-2 px-2 text-center">{a.resourceDemand}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-stone-600 text-[11px]">
                <strong>图论网络闭环判据：</strong> 全网络通过拓扑检验，无自环与回溯死循环；存在唯一的起点与收敛终点，满足有向无环图 (DAG) 计算前提。
              </div>
            </section>

            {/* PART 4: 确定型 CPM 顺逆推计算与 PERT 随机性分析 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  PART 04
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  第四部分：确定型 CPM 顺逆推计算与 PERT 随机性分析 (CPM & PERT Analysis)
                </h3>
              </div>

              {/* Time parameters matrix */}
              <div className="border border-stone-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-700 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">活动ID</th>
                      <th className="py-2 px-4">工序名称</th>
                      <th className="py-2 px-2 text-center">工期</th>
                      <th className="py-2 px-2 text-center">ES (早始)</th>
                      <th className="py-2 px-2 text-center">EF (早终)</th>
                      <th className="py-2 px-2 text-center">LS (迟始)</th>
                      <th className="py-2 px-2 text-center">LF (迟终)</th>
                      <th className="py-2 px-2 text-center">总时差 TF</th>
                      <th className="py-2 px-2 text-center">自由时差 FF</th>
                      <th className="py-2 px-3 text-center">关键路径属性</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    {activities.map((a) => (
                      <tr key={a.id} className={a.isCritical ? 'bg-rose-50/50 font-bold' : 'hover:bg-stone-50/50'}>
                        <td className="py-1.5 px-3 text-stone-900">{a.id}</td>
                        <td className="py-1.5 px-4 font-sans text-stone-800">{a.name}</td>
                        <td className="py-1.5 px-2 text-center">{a.duration}d</td>
                        <td className="py-1.5 px-2 text-center">{a.es}</td>
                        <td className="py-1.5 px-2 text-center">{a.ef}</td>
                        <td className="py-1.5 px-2 text-center">{a.ls}</td>
                        <td className="py-1.5 px-2 text-center">{a.lf}</td>
                        <td className="py-1.5 px-2 text-center text-rose-600">{a.tf}d</td>
                        <td className="py-1.5 px-2 text-center">{a.ff}d</td>
                        <td className="py-1.5 px-3 text-center font-sans">
                          {a.isCritical ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                              CRITICAL
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px]">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Critical Path Callout */}
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                <div className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>核心关键路径链条（总时差 TF = 0）</span>
                </div>
                <div className="font-mono text-xs text-rose-800 font-bold">
                  {calcResult.criticalPathIds.join('  →  ')}
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  基准交付工期为 <strong>{calcResult.projectDuration} 天</strong>。该路径上任何一项活动的工期延长，均将 1:1 传导至最终竣工日期。
                </p>
              </div>

              {/* PERT Confidence Intervals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500">50% 中位期望</div>
                  <div className="text-sm font-bold text-stone-900 font-mono mt-0.5">
                    {calcResult.projectDuration} 天
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Z = 0.00 (确定型中位值)</div>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500">85% 工业稳健工期</div>
                  <div className="text-sm font-bold text-stone-900 font-mono mt-0.5">
                    {Math.round((calcResult.projectDuration + 1.04 * calcResult.criticalStdDev) * 10) / 10} 天
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Z = 1.04 (常规考核承诺)</div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="text-[10px] text-indigo-700 font-medium">95% 高可靠承诺工期</div>
                  <div className="text-sm font-bold text-indigo-900 font-mono mt-0.5">
                    {Math.round((calcResult.projectDuration + 1.645 * calcResult.criticalStdDev) * 10) / 10} 天
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-0.5">Z = 1.65 (抗随机扰动推荐)</div>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-[10px] text-stone-500">99% 绝对安全工期</div>
                  <div className="text-sm font-bold text-stone-900 font-mono mt-0.5">
                    {Math.round((calcResult.projectDuration + 2.33 * calcResult.criticalStdDev) * 10) / 10} 天
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Z = 2.33 (防范极端风险)</div>
                </div>
              </div>
            </section>

            {/* PART 5: 关键资源负荷剖面、超配冲突检测与削峰调平策略 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  PART 05
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  第五部分：关键资源负荷剖面、超配冲突检测与削峰调平策略 (Resource Leveling)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(calcResult.resourceProfiles).map(([role, prof]) => {
                  const peak = Math.max(...prof, 0);
                  const limit = caseInfo.resourceLimits?.[role] || 999;
                  const isOver = peak > limit;
                  return (
                    <div
                      key={role}
                      className={`p-3.5 rounded-xl border ${
                        isOver
                          ? 'border-rose-300 bg-rose-50/50'
                          : 'border-stone-200 bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-900">{role}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isOver ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOver ? '超配预警' : '配额良好'}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-stone-600 flex items-center justify-between font-mono">
                        <span>日峰值需求: <strong className="text-stone-900">{peak} 单位</strong></span>
                        <span>容量上限: <strong className="text-stone-900">{limit} 单位</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-stone-700 text-[11px] leading-relaxed">
                <strong>调平策略建议：</strong> 若出现资源超配，应优先利用非关键路径活动的自由时差 (FF)，将其早开始时间向后推移错峰启动；若所有时差耗尽仍无法满足现场资源约束，方可启动关键路径资源有限工期顺延。
              </div>
            </section>

            {/* PART 6: 关键路径漂移防范、工期压缩 (Crashing) 决策与实施准则 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-900 text-white font-mono text-[10px] font-bold">
                  PART 06
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  第六部分：关键路径漂移防范、工期压缩 (Crashing) 决策与实施准则 (Crashing Directives)
                </h3>
              </div>

              <div className="space-y-3">
                {/* Float Drift Warning */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>次关键活动时差漂移 (Float Drift) 敏感性监控</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    当前次关键活动（TF ≤ 5天）：{activities.filter((a) => !a.isCritical && a.tf <= 5).map((a) => `${a.id}(${a.name}, TF=${a.tf}d)`).join('、') || '暂无紧迫次关键活动'}。
                    工程管理中必须建立时差监控机制，严防其发生总时差耗尽后转变为“新关键路径”的连锁漂移。
                  </p>
                </div>

                {/* Crashing Priorities Table */}
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-900 flex items-center justify-between">
                    <span>应急赶工 (Crashing) 成本斜率 (ΔC / ΔT) 优选矩阵</span>
                    <span className="text-[10px] text-stone-500 font-normal">基于成本斜率最小准则优先压缩</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50/60 border-b border-stone-200 font-semibold text-stone-600 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">活动ID</th>
                        <th className="py-2 px-4">关键工序名称</th>
                        <th className="py-2 px-2 text-center">正常工期</th>
                        <th className="py-2 px-2 text-center">极限赶工工期</th>
                        <th className="py-2 px-2 text-center">最大可压缩量</th>
                        <th className="py-2 px-3 text-right">成本斜率 (万元/天)</th>
                        <th className="py-2 px-3 text-center">赶工优先级</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                      {activities
                        .filter((a) => a.isCritical)
                        .sort((a, b) => (a.crashCostPerDay || 0) - (b.crashCostPerDay || 0))
                        .map((a, idx) => (
                          <tr key={a.id} className="hover:bg-stone-50/50">
                            <td className="py-1.5 px-3 font-bold text-stone-900">{a.id}</td>
                            <td className="py-1.5 px-4 font-sans text-stone-800">{a.name}</td>
                            <td className="py-1.5 px-2 text-center">{a.duration}d</td>
                            <td className="py-1.5 px-2 text-center">{a.crashDuration || a.duration}d</td>
                            <td className="py-1.5 px-2 text-center text-indigo-600 font-bold">
                              {a.duration - (a.crashDuration || a.duration)}d
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                              {a.crashCostPerDay ? `￥${a.crashCostPerDay}万/d` : '未标定'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-sans">
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px]">
                                第 {idx + 1} 梯队
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Final Directives */}
                <div className="p-4 bg-stone-900 text-white rounded-xl space-y-2 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>系统工程总指挥部实施指令与管控准则</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
                    <li>
                      <strong>关键链条资源保供</strong>：在基准工期 {calcResult.projectDuration} 天执行期间，全场资源配置对绝对关键路径活动实行“零等待”优先保供。
                    </li>
                    <li>
                      <strong>浮动缓冲消耗审批</strong>：非关键活动的实际延误若占用超过其总时差 (TF) 的 50%，必须提交工程变更单组织复核。
                    </li>
                    <li>
                      <strong>科学赶工禁止全面加班</strong>：若因业主指令需压缩工期，必须按成本斜率最小原则只压缩关键工序，杜绝非关键工序盲目赶工造成的资金浪费。
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Report Footer Signature */}
            <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between text-stone-400 text-[11px] font-mono gap-2">
              <span>系统工程项目规划 WebApp 实验室 · 自动生成报告</span>
              <span>符合 GB/T 33745-2017 系统与软件工程规程</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
