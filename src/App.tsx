import React, { useState, useMemo } from 'react';
import { CASE_STUDIES } from './data/cases';
import { Activity, WbsNode, CaseStudy } from './types/project';
import { solveCPM } from './utils/cpmSolver';

import { PlanningAlgebraView } from './components/PlanningAlgebraView';
import { WbsBreakdownView } from './components/WbsBreakdownView';
import { NetworkScheduleView } from './components/NetworkScheduleView';
import { CpmPertCalculatorView } from './components/CpmPertCalculatorView';
import { CaseLibraryView } from './components/CaseLibraryView';
import { PythonCodeEngineView } from './components/PythonCodeEngineView';
import { AiConsultantFloating } from './components/AiConsultantFloating';
import { FullWorkflowWizardView } from './components/FullWorkflowWizardView';
import { ReportExportView } from './components/ReportExportView';
import { PlanningElementsKnowledgeView } from './components/PlanningElementsKnowledgeView';

import {
  Compass,
  FolderTree,
  GitBranch,
  Calculator,
  Briefcase,
  Code2,
  Bot,
  Route,
  FileDown,
  BookMarked,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [currentCase, setCurrentCase] = useState<CaseStudy>(CASE_STUDIES[0]);
  const [activities, setActivities] = useState<Activity[]>(CASE_STUDIES[0].activities);
  const [wbsNodes, setWbsNodes] = useState<WbsNode[]>(CASE_STUDIES[0].wbsNodes);
  const [calcMode, setCalcMode] = useState<'cpm' | 'pert'>('cpm');
  const [activeModule, setActiveModule] = useState<
    | 'algebra'
    | 'wbs'
    | 'network'
    | 'cpm_pert'
    | 'cases'
    | 'code'
    | 'wizard'
    | 'report'
    | 'knowledge'
  >('cpm_pert');
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Recalculate CPM / PERT whenever activities, calcMode, or limits change
  const { activities: computedActivities, result: calcResult } = useMemo(() => {
    return solveCPM(activities, calcMode, undefined, currentCase.resourceLimits);
  }, [activities, calcMode, currentCase]);

  // Handle case selection
  const handleSelectCase = (caseStudy: CaseStudy) => {
    setCurrentCase(caseStudy);
    setActivities(caseStudy.activities);
    setWbsNodes(caseStudy.wbsNodes);
  };

  // Update a single activity
  const handleUpdateActivity = (updatedAct: Activity) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === updatedAct.id ? updatedAct : a))
    );
  };

  // Modules list definition (strictly 10 modules)
  const modulesList = [
    { id: 'algebra', num: '01', name: '规划代数', icon: Compass },
    { id: 'wbs', num: '02', name: 'WBS分解', icon: FolderTree },
    { id: 'network', num: '03', name: '网络计划', icon: GitBranch },
    { id: 'cpm_pert', num: '04', name: 'CPM/PERT计算', icon: Calculator },
    { id: 'cases', num: '05', name: '六大案例', icon: Briefcase },
    { id: 'code', num: '06', name: '代码引擎', icon: Code2 },
    { id: 'wizard', num: '08', name: '全流程导引', icon: Route },
    { id: 'report', num: '09', name: '报告导出', icon: FileDown },
    { id: 'knowledge', num: '10', name: '规划要素', icon: BookMarked },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col selection:bg-indigo-100">
      {/* Top Bar: Aligned with the center interface boundary (max-w-7xl) */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Wordmark: 系统工程项目规划实验室 (Aligned to left boundary) */}
          <a
            href="#"
            className="text-base font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded bg-stone-900 text-white flex items-center justify-center font-mono text-xs font-bold">
              SE
            </div>
            <span>系统工程项目规划实验室</span>
          </a>

          {/* Zone 2: 10 Module Navigation Switcher */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto text-xs font-medium text-stone-600">
            {modulesList.map((m) => {
              const Icon = m.icon;
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-stone-100 text-stone-900 font-semibold'
                      : 'hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-stone-400'}`} />
                  <span>{m.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: AI Consultant Icon Button (Retains functionality, text removed per user request) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAiOpen(true)}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shrink-0 shadow-xs flex items-center justify-center"
              title="AI 规划随诊"
              aria-label="AI 规划随诊"
            >
              <Bot className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Sub Header: Aligned with the center interface boundary (max-w-7xl) */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
          {/* Mobile Module Selector */}
          <div className="flex lg:hidden items-center gap-2 overflow-x-auto py-1 max-w-full">
            {modulesList.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id as any)}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap shrink-0 ${
                  activeModule === m.id
                    ? 'bg-stone-900 text-white font-medium'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* Active Project Info Strip: 当前实战模型 (Aligned to left boundary) */}
          <div className="hidden sm:flex items-center gap-2 text-stone-500">
            <span>当前实战模型:</span>
            <strong className="text-stone-800">{currentCase.title.split('：')[0]}</strong>
            <span aria-hidden="true">·</span>
            <span>工期:</span>
            <strong className="text-rose-600 font-mono tabular-nums">{calcResult.projectDuration} 天</strong>
            <span aria-hidden="true">·</span>
            <span>关键活动:</span>
            <strong className="text-stone-800 font-mono">{calcResult.criticalPathIds.length} 项</strong>
            <span aria-hidden="true">·</span>
            <span>模式:</span>
            <span className="font-semibold text-stone-700">{calcMode === 'cpm' ? 'CPM 确定性' : 'PERT 概率估计'}</span>
          </div>

          {/* Quick Case Switcher Dropdown: 快速载入案例 (Aligned to right boundary) */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-stone-500 hidden md:inline">快速载入案例：</span>
            <select
              value={currentCase.id}
              onChange={(e) => {
                const selected = CASE_STUDIES.find((c) => c.id === e.target.value);
                if (selected) handleSelectCase(selected);
              }}
              className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              {CASE_STUDIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Standard Center Boundary max-w-7xl */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Module 1: Planning Algebra */}
        {activeModule === 'algebra' && (
          <PlanningAlgebraView activities={computedActivities} />
        )}

        {/* Module 2: WBS Breakdown */}
        {activeModule === 'wbs' && (
          <WbsBreakdownView
            wbsNodes={wbsNodes}
            onUpdateWbs={(nodes) => setWbsNodes(nodes)}
          />
        )}

        {/* Module 3: Network Schedule AON */}
        {activeModule === 'network' && (
          <NetworkScheduleView
            activities={computedActivities}
            hasCycle={calcResult.hasCycle}
            cycleNodes={calcResult.cycleNodes}
            onUpdateActivities={(acts) => setActivities(acts)}
          />
        )}

        {/* Module 4: CPM / PERT Calculator */}
        {activeModule === 'cpm_pert' && (
          <CpmPertCalculatorView
            activities={computedActivities}
            calcResult={calcResult}
            calcMode={calcMode}
            onToggleCalcMode={(m) => setCalcMode(m)}
            onUpdateActivity={handleUpdateActivity}
          />
        )}

        {/* Module 5: Case Library */}
        {activeModule === 'cases' && (
          <CaseLibraryView
            currentCaseId={currentCase.id}
            onSelectCase={handleSelectCase}
          />
        )}

        {/* Module 6: Python / NetworkX Code Engine */}
        {activeModule === 'code' && (
          <PythonCodeEngineView
            activities={computedActivities}
            calcResult={calcResult}
          />
        )}

        {/* Module 8: Full Workflow Wizard */}
        {activeModule === 'wizard' && (
          <FullWorkflowWizardView
            activities={computedActivities}
            wbsNodes={wbsNodes}
            calcResult={calcResult}
            onJumpToModule={(mod) => setActiveModule(mod as any)}
            onUpdateActivity={handleUpdateActivity}
          />
        )}

        {/* Module 9: Report & Dataset Export */}
        {activeModule === 'report' && (
          <ReportExportView
            activities={computedActivities}
            wbsNodes={wbsNodes}
            calcResult={calcResult}
            currentCase={currentCase}
          />
        )}

        {/* Module 10: Planning Elements & Knowledge Slices */}
        {activeModule === 'knowledge' && (
          <PlanningElementsKnowledgeView />
        )}
      </main>

      {/* Module 7: AI Consultant Floating Drawer / Dialog */}
      <AiConsultantFloating
        activities={computedActivities}
        calcResult={calcResult}
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {/* Floating AI Button at Bottom Right: Constrained within the center boundary (max-w-7xl) */}
      {!isAiOpen && (
        <div className="fixed bottom-6 inset-x-0 pointer-events-none z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <button
              onClick={() => setIsAiOpen(true)}
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-full shadow-lg hover:bg-stone-800 transition-transform active:scale-95 text-xs font-semibold"
            >
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>AI 规划随诊</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer: Aligned with the center interface boundary (max-w-7xl) */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">系统工程项目规划实验室</span>
            <span aria-hidden="true">·</span>
            <span>WBS 分解 · 单代号网络计划 (AON) · CPM/PERT 求解 · 资源调平与优化</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <span>十核心模块完备集成</span>
            <span aria-hidden="true">·</span>
            <span>符合 INCOSE 与 PMP 系统工程规范</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
