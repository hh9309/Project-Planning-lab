import React, { useState } from 'react';
import { Layers, AlertTriangle, Compass, BookOpen, ChevronRight, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';

export const PlanningElementsKnowledgeView: React.FC = () => {
  const [activeSlice, setActiveSlice] = useState<'slice1' | 'slice2' | 'slice3' | 'slice4'>('slice1');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 10 · 规划要素与多维切片
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            系统项目规划基本要素与多维切片知识导引
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            系统工程视角下项目规划的公理化要素拓扑解构、CPM 与 PERT 本质差异辨析、三大致命规划陷阱与时差漂移误区警示。
          </p>
        </div>

        {/* Slice Navigation */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveSlice('slice1')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSlice === 'slice1'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            切片一：拓扑解构
          </button>
          <button
            onClick={() => setActiveSlice('slice2')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSlice === 'slice2'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            切片二：CPM vs PERT
          </button>
          <button
            onClick={() => setActiveSlice('slice3')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSlice === 'slice3'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            切片三：三大致命陷阱
          </button>
          <button
            onClick={() => setActiveSlice('slice4')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSlice === 'slice4'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            切片四：路径漂移警示
          </button>
        </div>
      </div>

      {/* Slice 1 */}
      {activeSlice === 'slice1' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-xs font-mono text-indigo-700 font-semibold">
              KNOWLEDGE SLICE 01 · 拓扑解构
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-1">
              【切片一：项目规划基本要素的拓扑解构】
            </h3>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            系统工程项目规划由<strong>工作包（Work Packages）</strong>、<strong>逻辑依赖（Precedence Relationships）</strong>与<strong>资源配置（Resources）</strong>三大基本要素交织构成。
            WBS 实现了从宏观目标到微观任务的层级解构，网络图与甘特图则将静态结构投影至动态时间与资源拓扑空间。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="border border-stone-200 p-4 rounded-xl bg-stone-50 space-y-2">
              <div className="text-xs font-mono font-bold text-indigo-700">要素 1 · 实体层</div>
              <h4 className="text-sm font-bold text-stone-900">工作包 (Work Packages)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                WBS 底层的最小可控单元。满足“8/80 规则”，具备明确的责任人 (Owner)、作业工期 (Duration)、估算工作量与成果验收标准 (Acceptance Criteria)。
              </p>
            </div>

            <div className="border border-stone-200 p-4 rounded-xl bg-stone-50 space-y-2">
              <div className="text-xs font-mono font-bold text-indigo-700">要素 2 · 关系层</div>
              <h4 className="text-sm font-bold text-stone-900">逻辑依赖 (Precedence)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                有向边集 $E$。分为硬逻辑（Mandatory Dependencies，如物理/施工规律）与软逻辑（Discretionary Dependencies，如组织偏好）。由 FS, SS, FF, SF 与 Lag 定义。
              </p>
            </div>

            <div className="border border-stone-200 p-4 rounded-xl bg-stone-50 space-y-2">
              <div className="text-xs font-mono font-bold text-indigo-700">要素 3 · 约束层</div>
              <h4 className="text-sm font-bold text-stone-900">资源配置 (Resources)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                工时、专家人员、测试台架与昂贵工装的供应上限。资源约束往往打破纯时间最短路径，迫使多任务串行化。
              </p>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl text-xs text-stone-700 space-y-2">
            <div className="font-bold text-stone-900">系统论公理化模型：</div>
            <p className="font-mono text-indigo-900">
              {'Project = ⟨ WBS_Tree, G(V, E)_Network, R(t)_ResourceAllocation ⟩'}
            </p>
            <p className="text-stone-600">
              静态分解是树，动态流转是图，资源争用是约束。三者闭环方成项目规划。
            </p>
          </div>
        </div>
      )}

      {/* Slice 2 */}
      {activeSlice === 'slice2' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-xs font-mono text-indigo-700 font-semibold">
              KNOWLEDGE SLICE 02 · 核心差异
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-1">
              【切片二：CPM 与 PERT 核心差异与适用边界】
            </h3>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            CPM（关键路径法）适用于确定性工期，关注时间与成本权衡；PERT（计划评审技术）适用于不确定性工期，基于概率分布评估项目按时完成概率。
          </p>

          <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold">
                <tr>
                  <th className="p-3 w-36">比较维度</th>
                  <th className="p-3">CPM (关键路径法)</th>
                  <th className="p-3">PERT (计划评审技术)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">工期确定性假设</td>
                  <td className="p-3 text-stone-700">确定性单一数值（基于历史同类工程标尺）</td>
                  <td className="p-3 text-indigo-800 font-medium">随机变量，服从三点估计与 Beta 分布</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">典型适用场景</td>
                  <td className="p-3 text-stone-700">大型土木建造、成熟产线批量装配、例行运维</td>
                  <td className="p-3 text-indigo-800 font-medium">前沿科研、航天器研制、重大应急攻关</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">运筹学优化目标</td>
                  <td className="p-3 text-stone-700">工期-成本折衷（寻找成本斜率最小赶工解）</td>
                  <td className="p-3 text-indigo-800 font-medium">完工概率评估（计算在给定窗口内的置信度）</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">网络导向重点</td>
                  <td className="p-3 text-stone-700">活动导向 (Activity Oriented)</td>
                  <td className="p-3 text-indigo-800 font-medium">事件导向与里程碑门禁 (Event Oriented)</td>
                </tr>
                <tr className="hover:bg-stone-50">
                  <td className="p-3 font-semibold text-stone-900">时差安全度</td>
                  <td className="p-3 text-stone-700">静态总时差 TF</td>
                  <td className="p-3 text-indigo-800 font-medium">标准偏量 Z 分数与多路径近关键敏感度</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slice 3 */}
      {activeSlice === 'slice3' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-xs font-mono text-rose-600 font-semibold">
              KNOWLEDGE SLICE 03 · 陷阱防范
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-1">
              【切片三：系统工程项目三大致命规划陷阱】
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-rose-200 bg-rose-50/30 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-700 text-xs font-bold font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>TRAP 01 · 逻辑断裂</span>
              </div>
              <h4 className="text-sm font-bold text-stone-900">漏掉关键前置任务导致网络断裂塌陷</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                规划者常因主观乐观，忽略了“隐性门禁”（如消防审批、材料第三方复验、工装定制交期）。
                这些外部依赖一旦漏网，将在后期直接造成现场全线停工等待。
              </p>
            </div>

            <div className="border border-amber-200 bg-amber-50/30 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-bold font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>TRAP 02 · 盲目压缩</span>
              </div>
              <h4 className="text-sm font-bold text-stone-900">忽视资源约束盲目压缩关键路径导致资源超载</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                为了在图纸上满足上级苛刻工期，强行将工序并联或压缩。结果导致同一天需要 6 名稀缺算法总师或大型起重机，现场引发极度窝工与管理失控。
              </p>
            </div>

            <div className="border border-stone-200 bg-stone-50 p-5 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-stone-700 text-xs font-bold font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>TRAP 03 · 缓冲归零</span>
              </div>
              <h4 className="text-sm font-bold text-stone-900">未预留总时差缓冲导致项目抗风险能力为零</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                在确定工期时按极端乐观估计编排，把非关键路径的时差提前消耗殆尽，全网所有任务时差均为 0。此时系统失去任何弹性能量，风吹草动即造成总工期崩盘。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slice 4 */}
      {activeSlice === 'slice4' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-xs font-mono text-amber-700 font-semibold">
              KNOWLEDGE SLICE 04 · 误区诊断
            </span>
            <h3 className="text-base font-bold text-stone-900 mt-1">
              【切片四：误区警示与“非关键路径永远安全”的致命诊断陷阱】
            </h3>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>警惕关键路径漂移 (Critical Path Drift)</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              项目经理往往只紧盯标注为红色的关键活动，而对绿色的“非关键活动”放松监管。
              <strong>核心定理：当非关键活动的延误时间 {'Δt > TF'}（总时差）时，该活动会瞬间转化为新的关键路径！</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-700 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-bold text-stone-900">次关键活动 (Near-Critical Activities) 的高敏感性</h4>
              <p>
                如果一条支路上活动的总时差仅有 1~2 天（例如在总工期 120 天的航天项目中），它的风险等级绝不亚于关键路径本身。
                轻微的物料延迟或天气波动即可使其时差耗尽，成为主导项目交付的新瓶颈。
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-stone-900">科学监控对策：时差消耗预警机制</h4>
              <p>
                现代系统工程采用时差消耗速率比（Float Consumption Ratio, FCR）：
                当实际消耗的时差超过计划时差的 50% 而物理进度未达标时，触发橙色预警，启动前置纠偏。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
