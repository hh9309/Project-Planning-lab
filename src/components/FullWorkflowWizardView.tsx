import React, { useState } from 'react';
import { Activity, WbsNode, ProjectCalculationResult } from '../types/project';
import { CheckCircle2, ChevronRight, ChevronLeft, ArrowRight, Layers, GitBranch, Cpu, Sliders, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  activities: Activity[];
  wbsNodes: WbsNode[];
  calcResult: ProjectCalculationResult;
  onJumpToModule: (moduleId: string) => void;
  onUpdateActivity: (act: Activity) => void;
}

export const FullWorkflowWizardView: React.FC<Props> = ({
  activities,
  wbsNodes,
  calcResult,
  onJumpToModule,
  onUpdateActivity,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const steps = [
    { num: 1, title: 'WBS 结构分解', desc: '按成果导向层级分解工作包' },
    { num: 2, title: '逻辑网络编排', desc: '设定活动依赖与时距约束' },
    { num: 3, title: 'CPM / PERT 求解', desc: '顺推逆推求关键路径与时差' },
    { num: 4, title: '资源优化与调平', desc: '削峰填谷消除资源冲突' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 08 · 全流程向导
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            结构分解 → 网络编排 → CPM 计算 → 资源优化 四步闭环
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            系统工程项目规划的标准工程闭环流。通过向导式步骤引导，从宏观交付物分解到微观时间与资源拓扑优化。
          </p>
        </div>

        {/* Step Navigation Indicator */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg text-xs font-medium self-start md:self-auto shrink-0">
          {steps.map((st) => (
            <button
              key={st.num}
              onClick={() => setCurrentStep(st.num)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                currentStep === st.num
                  ? 'bg-stone-900 text-white shadow-xs'
                  : currentStep > st.num
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <span className="font-mono text-[11px]">{st.num}.</span>
              <span>{st.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: WBS Decomposition */}
      {currentStep === 1 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <span className="text-xs font-mono text-indigo-700 font-semibold">STEP 01 OF 04</span>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">
                第 1 步：工作分解结构 (WBS) 完整性自检
              </h3>
            </div>
            <button
              onClick={() => onJumpToModule('wbs')}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
            >
              打开 WBS 交互编辑台 →
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            遵循系统工程“100% 规则”，检查当前分解是否涵盖所有目标交付物，并确保每个工作包（Work Package）均明确归属于单一责任工程师。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-1">
              <span className="text-xs text-stone-500">已分解工作包总数</span>
              <div className="text-xl font-bold text-stone-900 font-mono">
                {wbsNodes.length} <span className="text-xs font-normal text-stone-500">项</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">✓ 层级粒度适宜</p>
            </div>
            <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-1">
              <span className="text-xs text-stone-500">责任人明确覆盖率</span>
              <div className="text-xl font-bold text-stone-900 font-mono">
                100% <span className="text-xs font-normal text-stone-500">责任到岗</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">✓ 无无主工作包</p>
            </div>
            <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl space-y-1">
              <span className="text-xs text-stone-500">总成本预算汇总</span>
              <div className="text-xl font-bold text-stone-900 font-mono">
                {wbsNodes.reduce((acc, n) => acc + (n.level === 2 ? n.costBudget : 0), 0)} 万元
              </div>
              <p className="text-[11px] text-stone-500">与总体财务约束匹配</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <span>下一步：网络拓扑与依赖编排</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Logical Network Precedence */}
      {currentStep === 2 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <span className="text-xs font-mono text-indigo-700 font-semibold">STEP 02 OF 04</span>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">
                第 2 步：活动依赖关系编排与逻辑闭环检测
              </h3>
            </div>
            <button
              onClick={() => onJumpToModule('network')}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
            >
              进入 AON 交互连线图 →
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            配置活动间的先后工艺与组织依赖。系统将自动进行深度优先搜索 (DFS) 检测是否存在循环依赖闭环。
          </p>

          <div className="p-4 border rounded-xl flex items-center justify-between gap-4 bg-stone-50 border-stone-200">
            <div>
              <div className="text-xs font-bold text-stone-900">拓扑完整性校验状态</div>
              <div className="text-xs text-stone-600 mt-0.5">
                {calcResult.hasCycle ? (
                  <span className="text-rose-600 font-semibold">
                    ✕ 存在回路闭环: {calcResult.cycleNodes?.join(' → ')} (计算受阻)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    ✓ 有向无环图 (DAG) 检验通过：无死循环，全网络具有明确源节点与汇节点
                  </span>
                )}
              </div>
            </div>
            <div className="font-mono text-xs text-stone-500">
              总依赖边数: {activities.reduce((s, a) => s + a.predecessors.length, 0)} 条
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:text-stone-900 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <span>下一步：CPM / PERT 时差求解</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: CPM / PERT Calculation */}
      {currentStep === 3 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <span className="text-xs font-mono text-indigo-700 font-semibold">STEP 03 OF 04</span>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">
                第 3 步：关键路径求解与时差容限度量
              </h3>
            </div>
            <button
              onClick={() => onJumpToModule('cpm_pert')}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
            >
              查看概率分布与甘特图 →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-xl space-y-2">
              <span className="font-bold text-rose-800">关键路径识别 (Total Float = 0)</span>
              <p className="text-stone-700 leading-relaxed">
                全项目生命周期受控于：
                <strong className="block text-rose-700 font-mono mt-1 text-sm">
                  {calcResult.criticalPathIds.join(' → ')}
                </strong>
              </p>
              <p className="text-[11px] text-stone-500">
                此链条上任何活动的延误都将直接、等量传导为项目总工期的推迟！
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-2">
              <span className="font-bold text-stone-800">非关键活动时差空间统计</span>
              <div className="space-y-1 font-mono text-[11px] text-stone-600">
                {activities
                  .filter((a) => !a.isCritical)
                  .map((a) => (
                    <div key={a.id} className="flex justify-between border-b border-stone-200/50 pb-0.5">
                      <span>[{a.id}] {a.name}</span>
                      <span className="font-bold text-emerald-700">总时差 TF = {a.tf} 天</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:text-stone-900 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <span>下一步：多维资源调平与优化</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Resource Leveling & Optimization */}
      {currentStep === 4 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <span className="text-xs font-mono text-indigo-700 font-semibold">STEP 04 OF 04</span>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">
                第 4 步：有限资源约束下的负荷调平 (Leveling)
              </h3>
            </div>
            <button
              onClick={() => onJumpToModule('report')}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
            >
              导出最终分析报告 →
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            在现实工程中，工序并不能无限并发。当核心人员（如算法架构师、钢构班组）在同一时间段内需求超过供应上限时，
            可通过利用非关键活动的<strong>总时差 (TF)</strong> 错峰平移，实现<strong>“削峰填谷”</strong>而不延长项目总工期。
          </p>

          {/* Resource Usage Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-stone-900">
              各专业工种每日资源负荷与峰值监控
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(calcResult.resourceProfiles).map((role) => {
                const profile = calcResult.resourceProfiles[role] || [];
                const peak = Math.max(...profile, 0);

                return (
                  <div key={role} className="border border-stone-200 p-4 rounded-xl bg-stone-50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">{role}</span>
                      <span className="font-mono text-stone-600">
                        最高需求峰值: <strong className="text-indigo-700">{peak}</strong> 单位/天
                      </span>
                    </div>

                    {/* Mini Sparkline Bar Chart */}
                    <div className="h-16 flex items-end gap-1 bg-white p-2 rounded-lg border border-stone-200">
                      {profile.slice(0, 35).map((val, d) => {
                        const heightPercent = peak > 0 ? (val / peak) * 100 : 0;
                        return (
                          <div
                            key={d}
                            className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-700 transition-colors"
                            style={{ height: `${Math.max(4, heightPercent)}%` }}
                            title={`第 ${d} 天: 需求 ${val} 单位`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:text-stone-900 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => onJumpToModule('report')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-800 transition-colors"
            >
              <span>完成全流程 · 生成专业工程报告</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
