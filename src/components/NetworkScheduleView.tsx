import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Activity, Dependency, DependencyType } from '../types/project';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Network,
  Info,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Layers,
  Focus,
} from 'lucide-react';

interface Props {
  activities: Activity[];
  hasCycle: boolean;
  cycleNodes?: string[];
  onUpdateActivities: (activities: Activity[]) => void;
}

export const NetworkScheduleView: React.FC<Props> = ({
  activities,
  hasCycle,
  cycleNodes = [],
  onUpdateActivities,
}) => {
  // Main view switcher in Module 3: AON Network vs Interactive Gantt
  const [subView, setSubView] = useState<'aon' | 'gantt'>('aon');

  // AON Network Graph state
  const [selectedActId, setSelectedActId] = useState<string | null>(activities[0]?.id || null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Layout mode: 'auto' (smart 2-row when >= 6 activities or maxDepth >= 4) vs 'single'
  const [layoutMode, setLayoutMode] = useState<'auto' | 'single'>('auto');
  const canvasRef = useRef<HTMLDivElement>(null);

  // New dependency modal state
  const [isAddingDep, setIsAddingDep] = useState(false);
  const [newDepPredId, setNewDepPredId] = useState(activities[0]?.id || '');
  const [newDepSuccId, setNewDepSuccId] = useState(activities[1]?.id || '');
  const [newDepType, setNewDepType] = useState<DependencyType>('FS');
  const [newDepLag, setNewDepLag] = useState<number>(0);

  // Gantt Chart State in Module 3
  const [ganttFilter, setGanttFilter] = useState<'all' | 'critical' | 'nearCritical'>('all');
  const [hoveredTask, setHoveredTask] = useState<{
    activity: Activity;
    x: number;
    y: number;
  } | null>(null);
  const [ganttDayWidth, setGanttDayWidth] = useState<number>(24); // px per day

  const nodeWidth = 180;
  const nodeHeight = 84;

  // Center Graph Function (calculates bounding box & centers viewport)
  const centerGraph = useCallback((customPos?: Record<string, { x: number; y: number }>) => {
    const pos = customPos || positionsRef.current;
    const actIds = Object.keys(pos);
    if (actIds.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    actIds.forEach((id) => {
      const p = pos[id];
      if (p) {
        if (p.x < minX) minX = p.x;
        if (p.x + nodeWidth > maxX) maxX = p.x + nodeWidth;
        if (p.y < minY) minY = p.y;
        if (p.y + nodeHeight > maxY) maxY = p.y + nodeHeight;
      }
    });

    const graphW = Math.max(maxX - minX, 100);
    const graphH = Math.max(maxY - minY, 100);

    const containerW = canvasRef.current?.clientWidth || 1050;
    const containerH = canvasRef.current?.clientHeight || 540;

    const pad = 60;
    const scaleX = (containerW - pad * 2) / graphW;
    const scaleY = (containerH - pad * 2) / graphH;
    const targetZoom = Math.max(0.65, Math.min(1.0, Math.min(scaleX, scaleY)));

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const targetPanX = Math.round(containerW / 2 - graphCenterX * targetZoom);
    const targetPanY = Math.round(containerH / 2 - graphCenterY * targetZoom);

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
  }, []);

  // Stable topology key: only recompute layout when graph topology changes
  const topologyKey = activities
    .map((a) => `${a.id}:${a.predecessors.map((p) => `${p.id}-${p.type}-${p.lag || 0}`).join(',')}`)
    .join('|');

  // Auto layout algorithm for AON DAG (supports 2-row layout if many activities)
  useEffect(() => {
    const actMap = new Map<string, Activity>();
    activities.forEach((a) => actMap.set(a.id, a));

    const depths = new Map<string, number>();
    function getDepth(id: string, visited: Set<string>): number {
      if (depths.has(id)) return depths.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const act = actMap.get(id);
      if (!act || act.predecessors.length === 0) {
        depths.set(id, 0);
        return 0;
      }

      let maxPredDepth = -1;
      for (const pred of act.predecessors) {
        const d = getDepth(pred.id, new Set(visited));
        if (d > maxPredDepth) maxPredDepth = d;
      }

      const currentDepth = maxPredDepth + 1;
      depths.set(id, currentDepth);
      return currentDepth;
    }

    activities.forEach((a) => getDepth(a.id, new Set()));

    let maxDepth = 0;
    depths.forEach((d) => {
      if (d > maxDepth) maxDepth = d;
    });

    const levels: Record<number, string[]> = {};
    depths.forEach((depth, id) => {
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(id);
    });

    const newPositions: Record<string, { x: number; y: number }> = {};
    const colWidth = 240;

    // Use 2-row layout if activities count >= 6 or max sequential depth >= 4
    const useTwoRows = layoutMode === 'auto' && (activities.length >= 6 || maxDepth >= 4);

    if (useTwoRows) {
      const splitDepth = Math.max(2, Math.ceil((maxDepth + 1) / 2));

      Object.keys(levels).forEach((lvlStr) => {
        const lvl = Number(lvlStr);
        const nodeIds = levels[lvl];
        const isBottomRow = lvl >= splitDepth;
        const colIdx = isBottomRow ? lvl - splitDepth : lvl;
        const baseY = isBottomRow ? 260 : 45;

        nodeIds.forEach((id, rowIdx) => {
          newPositions[id] = {
            x: 50 + colIdx * colWidth,
            y: baseY + rowIdx * 105,
          };
        });
      });
    } else {
      const rowHeight = 135;
      Object.keys(levels).forEach((lvlStr) => {
        const lvl = Number(lvlStr);
        const nodeIds = levels[lvl];
        nodeIds.forEach((id, rowIdx) => {
          newPositions[id] = {
            x: 50 + lvl * colWidth,
            y: 75 + rowIdx * rowHeight,
          };
        });
      });
    }

    positionsRef.current = newPositions;
    setPositions(newPositions);

    // Initial position centering
    const timer = setTimeout(() => {
      centerGraph(newPositions);
    }, 50);

    return () => clearTimeout(timer);
  }, [topologyKey, layoutMode, centerGraph]);

  const selectedActivity = activities.find((a) => a.id === selectedActId) || activities[0];

  // Dragging AON Canvas
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'network-bg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggingNodeId) {
      const newPos = {
        x: (e.clientX - pan.x) / zoom - 90,
        y: (e.clientY - pan.y) / zoom - 45,
      };
      positionsRef.current[draggingNodeId] = newPos;
      setPositions((prev) => ({
        ...prev,
        [draggingNodeId]: newPos,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleAddDependency = () => {
    if (newDepPredId === newDepSuccId) return;
    const succ = activities.find((a) => a.id === newDepSuccId);
    if (!succ) return;

    if (succ.predecessors.some((p) => p.id === newDepPredId)) return;

    const updated = activities.map((a) => {
      if (a.id === newDepSuccId) {
        return {
          ...a,
          predecessors: [
            ...a.predecessors,
            { id: newDepPredId, type: newDepType, lag: newDepLag },
          ],
        };
      }
      return a;
    });

    onUpdateActivities(updated);
    setIsAddingDep(false);
  };

  const handleRemoveDependency = (succId: string, predId: string) => {
    const updated = activities.map((a) => {
      if (a.id === succId) {
        return {
          ...a,
          predecessors: a.predecessors.filter((p) => p.id !== predId),
        };
      }
      return a;
    });
    onUpdateActivities(updated);
  };

  // Max duration for Gantt timeline
  const maxProjectDuration = Math.max(...activities.map((a) => a.ef), 10);
  const totalGanttDays = Math.ceil(maxProjectDuration) + 4;

  // Filtered activities for Gantt
  const filteredActivities = activities.filter((act) => {
    if (ganttFilter === 'critical') return act.isCritical;
    if (ganttFilter === 'nearCritical') return !act.isCritical && act.tf <= 6;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 03 · 网络计划
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            活动依赖关系与网络计划编制 (AON 拓扑与时标甘特图)
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            集成 FS、SS、FF、SF 四类时序逻辑约束。提供单代号网络图 (AON) 节点拓扑与交互式时标甘特图，
            动态绘制各活动的起始时间 (ES)、持续时间 (D) 以及总时差 (TF) 容限区间，鼠标悬停即刻检视详细参数。
          </p>
        </div>

        {/* View Switcher: AON Network vs Interactive Gantt */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSubView('aon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subView === 'aon'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>单代号网络图 (AON)</span>
            </button>
            <button
              onClick={() => setSubView('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                subView === 'gantt'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>时标甘特图 (带总时差)</span>
            </button>
          </div>

          {subView === 'aon' ? (
            <button
              onClick={() => setIsAddingDep(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加依赖关系</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setGanttDayWidth((w) => Math.max(16, w - 4))}
                className="px-2 py-1 text-stone-600 hover:text-stone-900 rounded"
                title="缩小日宽"
              >
                紧凑
              </button>
              <button
                onClick={() => setGanttDayWidth(24)}
                className="px-2 py-1 text-stone-600 hover:text-stone-900 rounded font-medium"
                title="标准日宽"
              >
                适中
              </button>
              <button
                onClick={() => setGanttDayWidth((w) => Math.min(48, w + 6))}
                className="px-2 py-1 text-stone-600 hover:text-stone-900 rounded"
                title="放大日宽"
              >
                宽阔
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cycle Alert Banner */}
      {hasCycle && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-900">
              检测到逻辑回路死循环 (Circular Dependency)
            </h4>
            <p className="text-xs text-rose-700">
              前置关系构成闭环：{cycleNodes.join(' → ')}。在 DAG 网络中回路将导致拓扑排序崩溃，请在下方删除回路连线。
            </p>
          </div>
        </div>
      )}

      {/* SUB-VIEW 1: Interactive Gantt Chart with Float & Tooltip */}
      {subView === 'gantt' && (
        <div className="space-y-4">
          {/* Gantt Filter & Legend Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-stone-500 mr-2 font-medium">视图过滤:</span>
              <button
                onClick={() => setGanttFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  ganttFilter === 'all'
                    ? 'bg-stone-900 text-white font-medium'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                全部活动 ({activities.length})
              </button>
              <button
                onClick={() => setGanttFilter('critical')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  ganttFilter === 'critical'
                    ? 'bg-rose-600 text-white font-medium'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                仅看关键路径 ({activities.filter((a) => a.isCritical).length})
              </button>
              <button
                onClick={() => setGanttFilter('nearCritical')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  ganttFilter === 'nearCritical'
                    ? 'bg-amber-600 text-white font-medium'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                次关键活动 TF≤6d ({activities.filter((a) => !a.isCritical && a.tf <= 6).length})
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-stone-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded bg-rose-500 shadow-2xs" />
                <span>关键任务 (TF = 0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded bg-indigo-600 shadow-2xs" />
                <span>非关键作业 (ES~EF)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-2.5 border border-dashed border-stone-400 bg-stone-200/50 rounded-xs" />
                <span>总时差浮动区间 (EF~LF)</span>
              </div>
            </div>
          </div>

          {/* SVG Gantt Canvas with Tooltip */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs relative">
            <div className="overflow-x-auto">
              <div
                style={{
                  minWidth: `${320 + totalGanttDays * ganttDayWidth}px`,
                }}
                className="select-none"
              >
                {/* Timeline Header Row */}
                <div className="flex border-b border-stone-200 bg-stone-50 text-[11px] font-mono text-stone-600 font-medium">
                  {/* Left Column Header */}
                  <div className="w-80 shrink-0 px-4 py-2.5 border-r border-stone-200 font-sans text-stone-800 font-bold">
                    活动名称与时间参数
                  </div>

                  {/* Day Ticks */}
                  <div className="flex-1 flex">
                    {Array.from({ length: totalGanttDays }, (_, d) => (
                      <div
                        key={d}
                        style={{ width: `${ganttDayWidth}px` }}
                        className={`text-center py-2.5 border-r border-stone-100 shrink-0 tabular-nums ${
                          d === Math.ceil(maxProjectDuration)
                            ? 'bg-rose-50 text-rose-700 font-bold'
                            : d % 5 === 0
                            ? 'text-stone-900 font-bold bg-stone-100/40'
                            : 'text-stone-400'
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Rows */}
                <div className="divide-y divide-stone-100 text-xs">
                  {filteredActivities.map((act) => {
                    const isCrit = act.isCritical;
                    const isSelected = act.id === selectedActId;

                    return (
                      <div
                        key={act.id}
                        onClick={() => setSelectedActId(act.id)}
                        className={`flex items-center hover:bg-stone-50/80 transition-colors ${
                          isSelected ? 'bg-indigo-50/30' : ''
                        }`}
                        style={{ height: '44px' }}
                      >
                        {/* Left Info Column */}
                        <div className="w-80 shrink-0 px-4 flex items-center justify-between border-r border-stone-200">
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-bold text-xs ${
                                  isCrit ? 'text-rose-600' : 'text-stone-900'
                                }`}
                              >
                                {act.id}
                              </span>
                              <span className="text-stone-700 truncate" title={act.name}>
                                {act.name}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                              {act.wbsCode} · {act.resourceRole}
                            </div>
                          </div>

                          <div className="text-right font-mono text-[11px] shrink-0 text-stone-500">
                            <span className="text-stone-800 font-semibold">{act.duration}d</span>
                            <span className="text-stone-400 ml-1.5">
                              TF:{act.tf}d
                            </span>
                          </div>
                        </div>

                        {/* Right Timeline Canvas */}
                        <div className="flex-1 relative h-full flex items-center">
                          {/* Vertical Grid Day Lines */}
                          {Array.from({ length: totalGanttDays }, (_, d) => (
                            <div
                              key={d}
                              style={{
                                left: `${d * ganttDayWidth}px`,
                                width: `${ganttDayWidth}px`,
                              }}
                              className={`absolute top-0 bottom-0 border-r border-stone-100 pointer-events-none ${
                                d === Math.ceil(maxProjectDuration)
                                  ? 'border-r-2 border-rose-300 bg-rose-50/20'
                                  : ''
                              }`}
                            />
                          ))}

                          {/* Total Float Extension Band (Dashed Border from EF to LF) */}
                          {act.tf > 0 && (
                            <div
                              style={{
                                left: `${act.ef * ganttDayWidth}px`,
                                width: `${act.tf * ganttDayWidth}px`,
                              }}
                              className="absolute h-5 border-y border-r border-dashed border-stone-400 bg-stone-200/50 rounded-r-xs flex items-center justify-center text-[10px] text-stone-600 font-mono"
                              title={`总时差允许向右浮动至第 ${act.lf} 天`}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredTask({ activity: act, x: rect.right, y: rect.top });
                              }}
                              onMouseLeave={() => setHoveredTask(null)}
                            >
                              <span className="opacity-75">+{act.tf}d 缓冲</span>
                            </div>
                          )}

                          {/* Work Duration Bar */}
                          <div
                            style={{
                              left: `${act.es * ganttDayWidth}px`,
                              width: `${Math.max(6, act.duration * ganttDayWidth)}px`,
                            }}
                            className={`absolute h-6 rounded flex items-center justify-between px-2 text-[10px] text-white font-mono shadow-xs cursor-pointer transition-transform hover:scale-[1.02] ${
                              isCrit
                                ? 'bg-rose-500 hover:bg-rose-600'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredTask({ activity: act, x: rect.right, y: rect.top });
                            }}
                            onMouseLeave={() => setHoveredTask(null)}
                          >
                            <span className="truncate">{act.duration}天</span>
                            {isCrit && (
                              <span className="text-[9px] bg-rose-700/90 px-1 py-0.2 rounded ml-1 hidden sm:inline">
                                关键
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

            {/* Hover Floating Tooltip Card */}
            {hoveredTask && (
              <div
                style={{
                  position: 'fixed',
                  top: Math.min(window.innerHeight - 240, hoveredTask.y - 40),
                  left: Math.min(window.innerWidth - 300, hoveredTask.x + 12),
                }}
                className="z-50 w-72 bg-stone-900 text-white p-3.5 rounded-xl shadow-xl border border-stone-700 pointer-events-none text-xs space-y-2 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between border-b border-stone-700 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-amber-400">
                      [{hoveredTask.activity.id}]
                    </span>
                    <span className="font-bold truncate max-w-[150px]">
                      {hoveredTask.activity.name}
                    </span>
                  </div>
                  {hoveredTask.activity.isCritical ? (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      关键路径
                    </span>
                  ) : (
                    <span className="bg-stone-700 text-stone-300 text-[9px] px-1.5 py-0.5 rounded">
                      非关键
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="text-stone-300">
                    早开始 ES: <strong className="text-indigo-300">{hoveredTask.activity.es} 天</strong>
                  </div>
                  <div className="text-stone-300">
                    早完成 EF: <strong className="text-indigo-300">{hoveredTask.activity.ef} 天</strong>
                  </div>
                  <div className="text-stone-300">
                    迟开始 LS: <strong className="text-amber-300">{hoveredTask.activity.ls} 天</strong>
                  </div>
                  <div className="text-stone-300">
                    迟完成 LF: <strong className="text-amber-300">{hoveredTask.activity.lf} 天</strong>
                  </div>
                </div>

                <div className="pt-1 border-t border-stone-800 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">
                    总时差 TF: <strong className={hoveredTask.activity.tf === 0 ? 'text-rose-400' : 'text-emerald-400'}>{hoveredTask.activity.tf} 天</strong>
                  </span>
                  <span className="text-stone-400">
                    自由时差 FF: <strong className="text-emerald-400">{hoveredTask.activity.ff} 天</strong>
                  </span>
                </div>

                <div className="text-[10px] text-stone-400 pt-0.5">
                  资源: {hoveredTask.activity.resourceRole} ({hoveredTask.activity.resourceDemand} 单位/日)
                  <br />
                  前置: {hoveredTask.activity.predecessors.map((p) => `${p.id}(${p.type}+${p.lag}d)`).join(', ') || '无'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: AON Network Graph */}
      {subView === 'aon' && (
        <div className="space-y-4">
          {/* Legend & Guide Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-stone-600 bg-white p-3 border border-stone-200 rounded-xl gap-4">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600" />
                <span>关键节点 (TF = 0)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-stone-100 border border-stone-300" />
                <span>非关键节点 (有浮动缓冲)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 bg-rose-500" />
                <span>关键路径传导边</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 bg-stone-400" />
                <span>常规约束边</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Row Layout Toggle: 自动双行 vs 单行 */}
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setLayoutMode('auto')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    layoutMode === 'auto'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="工序较多时自动排布为上下两行"
                >
                  自动两行
                </button>
                <button
                  onClick={() => setLayoutMode('single')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    layoutMode === 'single'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="强制单行向右延展排布"
                >
                  单行排布
                </button>
              </div>

              {/* Zoom & Centering Controls Panel */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
                  className="p-1.5 text-stone-600 hover:text-stone-900 rounded transition-colors"
                  title="放大视口 (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                  className="p-1.5 text-stone-600 hover:text-stone-900 rounded transition-colors"
                  title="缩小视口 (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                {/* 居中图标 */}
                <button
                  onClick={() => centerGraph()}
                  className="p-1.5 text-stone-600 hover:text-indigo-600 hover:bg-stone-200/80 rounded transition-colors"
                  title="居中对齐网络图 (Center Graph)"
                >
                  <Focus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    centerGraph();
                  }}
                  className="p-1.5 text-stone-600 hover:text-stone-900 rounded transition-colors"
                  title="复位视口与居中 (Reset View)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* SVG Interactive Canvas */}
          <div
            ref={canvasRef}
            className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden relative shadow-xs"
            style={{ height: '540px', cursor: isDraggingCanvas ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <svg
              id="network-bg"
              className="w-full h-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <marker
                  id="arrow-normal"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#78716c" />
                </marker>
                <marker
                  id="arrow-critical"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#e11d48" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Dependency Edges */}
                {activities.map((act) => {
                  const toPos = positions[act.id];
                  if (!toPos) return null;

                  return act.predecessors.map((pred) => {
                    const fromPos = positions[pred.id];
                    const fromAct = activities.find((a) => a.id === pred.id);
                    if (!fromPos || !fromAct) return null;

                    const isCritEdge =
                      fromAct.isCritical &&
                      act.isCritical &&
                      fromAct.ef === act.es - (pred.lag || 0);

                    const startX = fromPos.x + nodeWidth;
                    const startY = fromPos.y + nodeHeight / 2;
                    const endX = toPos.x;
                    const endY = toPos.y + nodeHeight / 2;

                    const dx = endX - startX;
                    const isWrapping = endX < startX;

                    let pathData = '';
                    let midX = 0;
                    let midY = 0;

                    if (!isWrapping) {
                      const ctrl1X = startX + Math.max(30, dx * 0.45);
                      const ctrl1Y = startY;
                      const ctrl2X = endX - Math.max(30, dx * 0.45);
                      const ctrl2Y = endY;
                      pathData = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`;
                      midX = (startX + endX) / 2;
                      midY = (startY + endY) / 2;
                    } else {
                      // Smooth wrap-around path between upper row and lower row
                      const sweepX = startX + 45;
                      const enterX = Math.max(15, endX - 35);
                      const transitY = (startY + endY) / 2;
                      pathData = `M ${startX} ${startY} C ${sweepX} ${startY}, ${sweepX} ${transitY}, ${(startX + enterX) / 2} ${transitY} C ${enterX} ${transitY}, ${enterX} ${endY}, ${endX} ${endY}`;
                      midX = (startX + enterX) / 2;
                      midY = transitY;
                    }

                    return (
                      <g key={`${pred.id}-${act.id}`} className="group">
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isCritEdge ? '#e11d48' : '#a8a29e'}
                          strokeWidth={isCritEdge ? '2.5' : '1.5'}
                          markerEnd={isCritEdge ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
                          className="transition-colors group-hover:stroke-indigo-600"
                        />
                        <rect
                          x={midX - 24}
                          y={midY - 9}
                          width={48}
                          height={18}
                          rx={3}
                          fill="#ffffff"
                          stroke={isCritEdge ? '#fda4af' : '#e7e5e4'}
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 3.5}
                          textAnchor="middle"
                          className="text-[9px] font-mono font-medium fill-stone-700"
                        >
                          {pred.type}
                          {pred.lag ? `+${pred.lag}d` : ''}
                        </text>
                      </g>
                    );
                  });
                })}

                {/* 6-Cell AON Nodes */}
                {activities.map((act) => {
                  const pos = positions[act.id] || { x: 0, y: 0 };
                  const isSelected = act.id === selectedActId;
                  const isCrit = act.isCritical;

                  return (
                    <g
                      key={act.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      style={{ cursor: 'move' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedActId(act.id);
                        setDraggingNodeId(act.id);
                      }}
                    >
                      <rect
                        width={nodeWidth}
                        height={nodeHeight}
                        rx={6}
                        fill={isCrit ? '#fff1f2' : '#ffffff'}
                        stroke={
                          isSelected
                            ? '#2563eb'
                            : isCrit
                            ? '#e11d48'
                            : '#d6d3d1'
                        }
                        strokeWidth={isSelected ? '2.5' : isCrit ? '2' : '1.2'}
                        filter={isCrit ? 'drop-shadow(0 2px 4px rgba(225,29,72,0.15))' : undefined}
                      />

                      <line x1="0" y1="24" x2={nodeWidth} y2="24" stroke="#e7e5e4" strokeWidth="1" />
                      <line x1="0" y1="60" x2={nodeWidth} y2="60" stroke="#e7e5e4" strokeWidth="1" />
                      <line x1="55" y1="0" x2="55" y2="24" stroke="#e7e5e4" strokeWidth="1" />
                      <line x1="125" y1="0" x2="125" y2="24" stroke="#e7e5e4" strokeWidth="1" />
                      <line x1="55" y1="60" x2="55" y2="84" stroke="#e7e5e4" strokeWidth="1" />
                      <line x1="125" y1="60" x2="125" y2="84" stroke="#e7e5e4" strokeWidth="1" />

                      <text x="27" y="16" textAnchor="middle" className="text-[10px] font-mono fill-indigo-700 font-bold">
                        {act.es}
                      </text>
                      <text x="90" y="16" textAnchor="middle" className="text-[10px] font-mono fill-stone-800 font-bold">
                        D:{act.duration}d
                      </text>
                      <text x="153" y="16" textAnchor="middle" className="text-[10px] font-mono fill-indigo-700 font-bold">
                        {act.ef}
                      </text>

                      <text
                        x="12"
                        y="43"
                        className={`text-[11px] font-mono font-black ${
                          isCrit ? 'fill-rose-700' : 'fill-stone-900'
                        }`}
                      >
                        {act.id}
                      </text>
                      <text
                        x="40"
                        y="43"
                        className="text-[10px] fill-stone-800 font-medium"
                      >
                        {act.name.length > 10 ? act.name.slice(0, 10) + '…' : act.name}
                      </text>

                      <text x="27" y="75" textAnchor="middle" className="text-[10px] font-mono fill-amber-700">
                        {act.ls}
                      </text>
                      <text
                        x="90"
                        y="75"
                        textAnchor="middle"
                        className={`text-[10px] font-mono font-bold ${
                          isCrit ? 'fill-rose-600' : 'fill-emerald-600'
                        }`}
                      >
                        TF:{act.tf}
                      </text>
                      <text x="153" y="75" textAnchor="middle" className="text-[10px] font-mono fill-amber-700">
                        {act.lf}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-stone-200 text-[10px] space-y-1 shadow-xs pointer-events-none">
              <div className="font-bold text-stone-700">单代号节点六格参数规范：</div>
              <div className="font-mono text-stone-600">
                [ES 早开始] [D 工期] [EF 早完成]
                <br />
                [ 活动编号 ID · 活动简名 Name ]
                <br />
                [LS 迟开始] [TF 总时差] [LF 迟完成]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Activity Inspection Panel */}
      {selectedActivity && (
        <div className="bg-white p-5 border border-stone-200 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-stone-900 text-sm">
                  {selectedActivity.id}
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  · {selectedActivity.wbsCode}
                </span>
                {selectedActivity.isCritical ? (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    关键路径活动 (Critical)
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    非关键活动 (总时差 TF = {selectedActivity.tf} 天)
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-stone-900 mt-1">
                {selectedActivity.name}
              </h3>
            </div>

            <div className="text-xs text-stone-500">
              负责资源:{' '}
              <strong className="text-stone-800">
                {selectedActivity.resourceRole}
              </strong>{' '}
              ({selectedActivity.resourceDemand} 单位/日)
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="text-stone-500 block text-[11px]">最早开始 ES</span>
              <span className="font-mono font-bold text-indigo-700 text-sm mt-0.5 block">
                第 {selectedActivity.es} 天
              </span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="text-stone-500 block text-[11px]">作业工期 D</span>
              <span className="font-mono font-bold text-stone-900 text-sm mt-0.5 block">
                {selectedActivity.duration} 天
              </span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="text-stone-500 block text-[11px]">最早结束 EF</span>
              <span className="font-mono font-bold text-indigo-700 text-sm mt-0.5 block">
                第 {selectedActivity.ef} 天
              </span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="text-stone-500 block text-[11px]">最迟开始 LS</span>
              <span className="font-mono font-bold text-amber-700 text-sm mt-0.5 block">
                第 {selectedActivity.ls} 天
              </span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="text-stone-500 block text-[11px]">总时差 TF</span>
              <span
                className={`font-mono font-bold text-sm mt-0.5 block ${
                  selectedActivity.tf === 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {selectedActivity.tf} 天
              </span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200">
              <span className="text-stone-500 block text-[11px]">自由时差 FF</span>
              <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
                {selectedActivity.ff} 天
              </span>
            </div>
          </div>

          {/* Predecessors List */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-stone-700 mb-2">
              前置依赖约束关系清单：
            </h4>
            {selectedActivity.predecessors.length === 0 ? (
              <p className="text-xs text-stone-400">无直接前置约束（项目源头任务）</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedActivity.predecessors.map((pred) => {
                  const predAct = activities.find((a) => a.id === pred.id);
                  return (
                    <div
                      key={pred.id}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs"
                    >
                      <span className="font-mono font-bold text-stone-800">
                        {pred.id}
                      </span>
                      <span className="text-stone-600">{predAct?.name}</span>
                      <span className="text-indigo-700 font-mono text-[11px]">
                        [{pred.type} {pred.lag ? `+${pred.lag}d` : ''}]
                      </span>
                      <button
                        onClick={() =>
                          handleRemoveDependency(selectedActivity.id, pred.id)
                        }
                        className="text-stone-400 hover:text-rose-600 p-0.5 ml-1"
                        title="删除此前驱依赖"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Dependency Modal */}
      {isAddingDep && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-stone-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">
                添加活动逻辑依赖连线 (Dependency Edge)
              </h3>
              <button
                onClick={() => setIsAddingDep(false)}
                className="text-stone-400 hover:text-stone-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  前置活动 (Predecessor)
                </label>
                <select
                  value={newDepPredId}
                  onChange={(e) => setNewDepPredId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.id}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  后继活动 (Successor)
                </label>
                <select
                  value={newDepSuccId}
                  onChange={(e) => setNewDepSuccId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.id}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    依赖关系类型
                  </label>
                  <select
                    value={newDepType}
                    onChange={(e) => setNewDepType(e.target.value as DependencyType)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none"
                  >
                    <option value="FS">FS (完成到开始 - 最普遍)</option>
                    <option value="SS">SS (开始到开始 - 并行启动)</option>
                    <option value="FF">FF (完成到完成 - 同步结束)</option>
                    <option value="SF">SF (开始到完成 - 特殊翻转)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    延时时距 Lag (天)
                  </label>
                  <input
                    type="number"
                    value={newDepLag}
                    onChange={(e) => setNewDepLag(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setIsAddingDep(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
              >
                取消
              </button>
              <button
                onClick={handleAddDependency}
                className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
              >
                确认连接
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
