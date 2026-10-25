import React, { useState } from 'react';
import { CASE_STUDIES } from '../data/cases';
import { CaseStudy } from '../types/project';
import { BookOpen, ArrowRight, CheckCircle2, ChevronRight, Layers, Sparkles, AlertTriangle } from 'lucide-react';

interface Props {
  currentCaseId: string;
  onSelectCase: (caseStudy: CaseStudy) => void;
}

export const CaseLibraryView: React.FC<Props> = ({ currentCaseId, onSelectCase }) => {
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseStudy>(
    CASE_STUDIES.find((c) => c.id === currentCaseId) || CASE_STUDIES[0]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 05 · 实战案例库
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            六大系统工程项目规划实战案例库
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            涵盖大型基建、载人航天、复杂中台软件、智慧城市、新能源汽车试制与应急破拆特种装备。每个案例均对应系统工程核心规划方法论。
          </p>
        </div>

        <div className="text-xs text-stone-500 self-start md:self-auto">
          当前载入模型: <strong className="text-stone-900">{selectedCaseDetail.title.split('：')[0]}</strong>
        </div>
      </div>

      {/* 6 Case Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CASE_STUDIES.map((cs) => {
          const isCurrentActive = cs.id === currentCaseId;
          const isDetailSelected = cs.id === selectedCaseDetail.id;

          return (
            <div
              key={cs.id}
              onClick={() => setSelectedCaseDetail(cs)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isDetailSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-white hover:border-stone-400 border-stone-200 text-stone-900'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-mono text-[11px] ${
                      isDetailSelected ? 'text-indigo-300' : 'text-indigo-600 font-semibold'
                    }`}
                  >
                    {cs.domain}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      isDetailSelected
                        ? 'bg-stone-800 text-stone-200'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {cs.tag}
                  </span>
                </div>

                <h3
                  className={`text-sm font-bold leading-snug ${
                    isDetailSelected ? 'text-white' : 'text-stone-900'
                  }`}
                >
                  {cs.title}
                </h3>
                <p
                  className={`text-xs line-clamp-2 ${
                    isDetailSelected ? 'text-stone-300' : 'text-stone-600'
                  }`}
                >
                  {cs.description}
                </p>
              </div>

              <div
                className={`pt-3 mt-3 border-t flex items-center justify-between text-xs ${
                  isDetailSelected ? 'border-stone-800' : 'border-stone-100'
                }`}
              >
                <span
                  className={`text-[11px] ${
                    isDetailSelected ? 'text-stone-400' : 'text-stone-500'
                  }`}
                >
                  {cs.activities.length} 个核心活动 · {cs.wbsNodes.length} 个工作包
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCase(cs);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    isCurrentActive
                      ? 'bg-emerald-600 text-white'
                      : isDetailSelected
                      ? 'bg-white text-stone-900 hover:bg-stone-100'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {isCurrentActive ? '✓ 正在实验中' : '载入此模型'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Case Deep-Dive Inspector */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between pb-4 border-b border-stone-200 gap-4">
          <div>
            <div className="text-xs font-mono text-indigo-700 font-semibold uppercase">
              CASE STUDY DEEP-DIVE · 案例切片深度剖析
            </div>
            <h3 className="text-lg font-bold text-stone-900 mt-1">
              {selectedCaseDetail.title}
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              方法论映射：
              <span className="font-semibold text-stone-800 ml-1">
                {selectedCaseDetail.mappedConcept}
              </span>
            </p>
          </div>

          <button
            onClick={() => onSelectCase(selectedCaseDetail)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors shrink-0"
          >
            <span>一键应用到当前工作台</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Narrative & Background */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              工程背景与目标
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              {selectedCaseDetail.background}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              核心系统工程挑战
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-600">
              {selectedCaseDetail.challenges.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              运筹优化策略与解法
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-600">
              {selectedCaseDetail.keyActions.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Activities Preview Table for this case */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-stone-900 mb-3">
            预置活动与逻辑关系拓扑清单 ({selectedCaseDetail.activities.length} 项)
          </h4>
          <div className="border border-stone-200 rounded-lg overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium text-[11px]">
                <tr>
                  <th className="py-2 px-3">活动ID</th>
                  <th className="py-2 px-3">名称</th>
                  <th className="py-2 px-3">工期 D</th>
                  <th className="py-2 px-3">前置依赖关系</th>
                  <th className="py-2 px-3">分配核心资源</th>
                  <th className="py-2 px-3 text-right">正常成本</th>
                  <th className="py-2 px-3 text-right">赶工成本斜率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                {selectedCaseDetail.activities.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50">
                    <td className="py-2 px-3 font-bold text-stone-900">{a.id}</td>
                    <td className="py-2 px-3 font-sans text-stone-800">{a.name}</td>
                    <td className="py-2 px-3 font-bold text-indigo-700">{a.duration} 天</td>
                    <td className="py-2 px-3 text-stone-600">
                      {a.predecessors.length === 0
                        ? '无 (起点)'
                        : a.predecessors
                            .map((p) => `${p.id} (${p.type}${p.lag ? `+${p.lag}d` : ''})`)
                            .join(', ')}
                    </td>
                    <td className="py-2 px-3 font-sans text-stone-600">
                      {a.resourceRole} ({a.resourceDemand} 单/日)
                    </td>
                    <td className="py-2 px-3 text-right text-stone-700">{a.normalCost} 万元</td>
                    <td className="py-2 px-3 text-right text-stone-500">
                      {a.crashCostPerDay ? `${a.crashCostPerDay} 万/天` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
