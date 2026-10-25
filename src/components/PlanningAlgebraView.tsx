import React, { useState } from 'react';
import { Activity } from '../types/project';
import { generateGraphMatrices } from '../utils/cpmSolver';
import { Network, Grid, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

interface Props {
  activities: Activity[];
}

export const PlanningAlgebraView: React.FC<Props> = ({ activities }) => {
  const [activeTab, setActiveTab] = useState<'formulas' | 'adjMatrix' | 'reachMatrix' | 'graphTheory'>('formulas');

  const { labels, names, adjMatrix, reachabilityMatrix } = generateGraphMatrices(activities);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 01 · 代数推导与图论建模
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            项目网络代数与有向无环图 (DAG) 形式化
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            项目网络本质上是有向无环图 $G=(V, E)$，其中节点 $V$ 代表工作活动，有向边 $E$ 代表技术与逻辑时序约束。
            本模块呈现网络计划的严格代数递推公式与状态转移矩阵表示。
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'formulas' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            递推代数公式
          </button>
          <button
            onClick={() => setActiveTab('adjMatrix')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'adjMatrix' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            邻接矩阵 A
          </button>
          <button
            onClick={() => setActiveTab('reachMatrix')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'reachMatrix' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            可达矩阵 R
          </button>
          <button
            onClick={() => setActiveTab('graphTheory')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'graphTheory' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            图论拓扑定理
          </button>
        </div>
      </div>

      {/* Tab 1: Algebraic Formulas */}
      {activeTab === 'formulas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forward Pass */}
          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                FORWARD PASS / 顺推算法
              </span>
              <span className="text-xs text-stone-500">拓扑正序求解</span>
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              最早开始时间 (ES) 与 最早完成时间 (EF)
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              自项目起始节点沿拓扑排序正向递推。活动的早开始时间受限于所有直接前驱活动的完成约束（以 FS 关系为例）：
            </p>
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg font-mono text-xs text-stone-800 space-y-1">
              <p className="font-semibold text-stone-900">公式 1-1 (最早开始时间 ES):</p>
              <p className="text-indigo-800">
                {'ES_j = max_{i ∈ Pred(j)} ( EF_i + Lag_{ij} ),   ES_{start} = 0'}
              </p>
              <p className="font-semibold text-stone-900 pt-1">公式 1-2 (最早完成时间 EF):</p>
              <p className="text-indigo-800">
                {'EF_j = ES_j + D_j'}
              </p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>总项目基准工期：</strong> {'T_{proj} = max_{k ∈ V} (EF_k)'}。
              当存在 SS、FF、SF 复杂关系时，递推约束转化为多不等式交集的右端极值点。
            </p>
          </div>

          {/* Backward Pass */}
          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                BACKWARD PASS / 逆推算法
              </span>
              <span className="text-xs text-stone-500">逆拓扑序求解</span>
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              最迟完成时间 (LF) 与 最迟开始时间 (LS)
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              以项目总工期 {'T_{proj}'} 为终点基准，沿拓扑反向逆推。活动的最迟完成时间不得延误任一后继活动的最迟开始：
            </p>
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg font-mono text-xs text-stone-800 space-y-1">
              <p className="font-semibold text-stone-900">公式 1-3 (最迟完成时间 LF):</p>
              <p className="text-amber-800">
                {'LF_i = min_{j ∈ Succ(i)} ( LS_j - Lag_{ij} ),   LF_{end} = T_{proj}'}
              </p>
              <p className="font-semibold text-stone-900 pt-1">公式 1-4 (最迟开始时间 LS):</p>
              <p className="text-amber-800">
                {'LS_i = LF_i - D_i'}
              </p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              逆推揭示了每个任务在不拖延整体项目交付日期的底线边界时间。
            </p>
          </div>

          {/* Float Theory */}
          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                FLOAT ALGEBRA / 时差代数空间
              </span>
              <span className="text-xs text-stone-500">缓冲容限度量</span>
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              总时差 (Total Float) 与 自由时差 (Free Float)
            </h3>
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg font-mono text-xs text-stone-800 space-y-1">
              <p className="font-semibold text-stone-900">公式 1-5 (总时差 TF):</p>
              <p className="text-emerald-800">
                {'TF_i = LS_i - ES_i = LF_i - EF_i'}
              </p>
              <p className="font-semibold text-stone-900 pt-1">公式 1-6 (自由时差 FF):</p>
              <p className="text-emerald-800">
                {'FF_i = min_{j ∈ Succ(i)} ( ES_j - Lag_{ij} ) - EF_i'}
              </p>
            </div>
            <div className="text-xs text-stone-600 space-y-1">
              <p>• <strong>TF = 0 的活动</strong>构成关键活动（Critical Activity），不可发生任何延误；</p>
              <p>• <strong>FF</strong> 是该活动可在不影响任何直接后续活动最早开始的前提下推迟的时间；满足 {'0 ≤ FF_i ≤ TF_i'}。</p>
            </div>
          </div>

          {/* PERT Uncertainty */}
          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                PERT STATISTICAL ALGEBRA / 概率统计
              </span>
              <span className="text-xs text-stone-500">三点估计与中心极限</span>
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              Beta 分布三点估计与方差加法定理
            </h3>
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg font-mono text-xs text-stone-800 space-y-1">
              <p className="font-semibold text-stone-900">公式 1-7 (期望工期与方差):</p>
              <p className="text-purple-800">
                {'T_e = (a + 4m + b) / 6,   σ² = ((b - a) / 6)²'}
              </p>
              <p className="font-semibold text-stone-900 pt-1">公式 1-8 (关键路径总方差与 Z 统计量):</p>
              <p className="text-purple-800">
                {'Σ² = ∑_{i ∈ CP} σ_i²,   Z = (T_{target} - T_{proj}) / √(Σ²)'}
              </p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              根据中心极限定理，大量独立随机变量之和渐进服从正态分布。由此可通过标准正态累积分布函数 {'Φ(Z)'} 算出任意承诺工期的准时置信度。
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Adjacency Matrix */}
      {activeTab === 'adjMatrix' && (
        <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                当前项目网络邻接矩阵 A ∈ {'{0, 1}'}ⁿˣⁿ
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                行 i 指向列 j：若 A_ij = 1 表示存在直接前驱依赖关系 i → j
              </p>
            </div>
            <div className="text-xs text-stone-500 font-mono">
              节点维度: {labels.length} × {labels.length}
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-lg">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700">
                  <th className="p-2 border-r border-stone-200 text-left font-sans text-xs">活动节点</th>
                  {labels.map((lbl, idx) => (
                    <th key={lbl} className="p-2 min-w-10 border-r border-stone-200 font-medium">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjMatrix.map((row, i) => (
                  <tr key={labels[i]} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="p-2 border-r border-stone-200 text-left font-sans text-stone-800 bg-stone-50/50">
                      <span className="font-bold text-stone-900">{labels[i]}</span>
                      <span className="text-stone-500 ml-1.5 hidden sm:inline text-xs">{names[i]}</span>
                    </td>
                    {row.map((val, j) => (
                      <td
                        key={j}
                        className={`p-2 border-r border-stone-100 tabular-nums ${
                          val === 1
                            ? 'bg-indigo-50 font-bold text-indigo-700'
                            : 'text-stone-300'
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-500">
            注：邻接矩阵的主对角线全部为 0（无自环）；如果重新按拓扑次序重排节点，邻接矩阵必定为严格上三角矩阵。
          </p>
        </div>
      )}

      {/* Tab 3: Reachability Matrix */}
      {activeTab === 'reachMatrix' && (
        <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                可达矩阵 R = (I + A)ⁿ⁻¹ (传递闭包 Transitive Closure)
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                R_ij = 1 表示从活动 i 出发经过一条或多条路径能够连通到达活动 j（包含自反性 i = j）
              </p>
            </div>
            <div className="text-xs text-stone-500 font-mono">
              算法: Floyd-Warshall 传递闭包
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-lg">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-700">
                  <th className="p-2 border-r border-stone-200 text-left font-sans text-xs">活动节点</th>
                  {labels.map((lbl) => (
                    <th key={lbl} className="p-2 min-w-10 border-r border-stone-200 font-medium">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reachabilityMatrix.map((row, i) => (
                  <tr key={labels[i]} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="p-2 border-r border-stone-200 text-left font-sans text-stone-800 bg-stone-50/50">
                      <span className="font-bold text-stone-900">{labels[i]}</span>
                      <span className="text-stone-500 ml-1.5 hidden sm:inline text-xs">{names[i]}</span>
                    </td>
                    {row.map((val, j) => (
                      <td
                        key={j}
                        className={`p-2 border-r border-stone-100 tabular-nums ${
                          val === 1
                            ? i === j
                              ? 'bg-stone-100 text-stone-500'
                              : 'bg-emerald-50 font-bold text-emerald-700'
                            : 'text-stone-200'
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-500">
            可达矩阵可直接用于确定活动的先行集 {'P(i) = {j | R_ji = 1}'} 和后继集 {'S(i) = {j | R_ij = 1}'}，是系统工程中开展网络分级与层叠分解的核心数学工具。
          </p>
        </div>
      )}

      {/* Tab 4: Graph Theory Theorems */}
      {activeTab === 'graphTheory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-3">
            <div className="text-xs font-mono text-indigo-700">THEORETICAL THEOREM 1</div>
            <h3 className="text-sm font-semibold text-stone-900">有向无环图 (DAG) 拓扑排序存在性定理</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>定理：</strong> 一个有限有向图 G=(V, E) 拥有拓扑排序当且仅当它是无环的（DAG）。
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>工程推论：</strong> 若工程网络编制中存在前置依赖回路（如 A 依赖 B，B 依赖 C，C 依赖 A），则顺推递推公式将陷入无限循环，无法定义起始与结束时间。系统必须在计算前执行拓扑检验。
            </p>
          </div>

          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-3">
            <div className="text-xs font-mono text-indigo-700">THEORETICAL THEOREM 2</div>
            <h3 className="text-sm font-semibold text-stone-900">关键路径唯一性与多重性定理</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>定理：</strong> 在 DAG 中，从源节点到汇节点的最长加权路径可能并非唯一。当存在多条长度相同的最长路径时，它们均为关键路径。
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>工程推论：</strong> 缩短一条关键路径的工期并不一定会缩短整个项目工期，因为平行存在的多重关键路径仍将成为新的时间瓶颈。因此工期赶工必须对并行的多条关键路径实施协同压缩。
            </p>
          </div>

          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-3">
            <div className="text-xs font-mono text-indigo-700">THEORETICAL THEOREM 3</div>
            <h3 className="text-sm font-semibold text-stone-900">时差传递性与链条守恒</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>定理：</strong> 一条非关键链路上多个串联活动共享该链条上的总时差 TF。任一活动的消耗将等量减少后续活动的可用总时差。
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>工程推论：</strong> 自由时差 {'FF ≤ TF'}。自由时差属于当前活动独享，而总时差属于整个活动路径共享。随意占用总时差将剥夺后继任务的风险缓冲。
            </p>
          </div>

          <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-3">
            <div className="text-xs font-mono text-indigo-700">THEORETICAL THEOREM 4</div>
            <h3 className="text-sm font-semibold text-stone-900">最长路径等价于对偶线性规划 (LP)</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>定理：</strong> CPM 顺推求解本质上等价于求解线性规划：{'min (t_end - t_start)'} 满足 {'t_j - t_i ≥ D_i + Lag_ij'} 对所有边 (i, j) ∈ E。
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong>工程推论：</strong> 其对偶问题是网络最大流问题，影子价格 (Shadow Price) 即对应各工序对总工期的边际贡献，为赶工成本权衡提供了直接的运筹学优化基础。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
