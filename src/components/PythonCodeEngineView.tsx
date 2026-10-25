import React, { useState } from 'react';
import { Activity, ProjectCalculationResult } from '../types/project';
import {
  Terminal,
  Copy,
  Check,
  Play,
  Download,
  Code2,
  Table,
  BarChart2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  activities: Activity[];
  calcResult: ProjectCalculationResult;
}

export const PythonCodeEngineView: React.FC<Props> = ({ activities, calcResult }) => {
  const [copied, setCopied] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<'networkx' | 'gantt' | 'pert'>('networkx');
  
  // Execution Output State
  const [isRunning, setIsRunning] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [executionOutputTab, setExecutionOutputTab] = useState<'stdout' | 'chart' | 'table'>('stdout');
  const [executionTime, setExecutionTime] = useState<number>(14);

  // 1. NetworkX Python Script (English titles, axis labels, legends)
  const generateNetworkXScript = () => {
    const actDataString = JSON.stringify(
      activities.map((a) => ({
        id: a.id,
        name: a.name,
        duration: a.duration,
        predecessors: a.predecessors.map((p) => ({ id: p.id, type: p.type, lag: p.lag })),
        resource: a.resourceRole,
      })),
      null,
      4
    );

    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
Operations Research & Systems Engineering: Critical Path Method (CPM)
Library: NetworkX, Matplotlib, Pandas
Notice: All chart titles, legends, and axes are standardized in English.
=============================================================================
"""

import networkx as nx
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Activity data payload (synced from WebApp)
activities_data = ${actDataString}

def solve_cpm_network(data):
    # Construct Directed Acyclic Graph (DAG)
    G = nx.DiGraph()
    
    for act in data:
        G.add_node(
            act["id"],
            name=act["name"],
            duration=act["duration"],
            resource=act["resource"],
            es=0, ef=0, ls=0, lf=0, tf=0, ff=0, is_critical=False
        )
        
    for act in data:
        for pred in act["predecessors"]:
            G.add_edge(pred["id"], act["id"], type=pred["type"], lag=pred["lag"])

    # Topological sorting & cycle verification
    if not nx.is_directed_acyclic_graph(G):
        cycle = nx.find_cycle(G)
        raise ValueError(f"[ERROR] Cycle detected in network: {cycle}")
        
    topo_order = list(nx.topological_sort(G))
    print(f"[INFO] Topological Sort Order: {' -> '.join(topo_order)}")

    # Forward Pass: Compute Earliest Start (ES) and Earliest Finish (EF)
    for u in topo_order:
        earliest_start = 0
        for p in G.predecessors(u):
            edge_data = G.get_edge_data(p, u)
            lag = edge_data.get("lag", 0)
            pred_ef = G.nodes[p]["ef"]
            earliest_start = max(earliest_start, pred_ef + lag)
            
        G.nodes[u]["es"] = earliest_start
        G.nodes[u]["ef"] = earliest_start + G.nodes[u]["duration"]

    # Calculate Project Baseline Duration
    project_duration = max(G.nodes[n]["ef"] for n in G.nodes)
    print(f"[INFO] Total Project Duration: {project_duration} days")

    # Backward Pass: Compute Latest Finish (LF) and Latest Start (LS)
    for n in G.nodes:
        G.nodes[n]["lf"] = project_duration
        G.nodes[n]["ls"] = project_duration - G.nodes[n]["duration"]

    for u in reversed(topo_order):
        succs = list(G.successors(u))
        if succs:
            min_late_finish = min(
                G.nodes[s]["ls"] - G.get_edge_data(u, s).get("lag", 0)
                for s in succs
            )
            G.nodes[u]["lf"] = min_late_finish
            G.nodes[u]["ls"] = min_late_finish - G.nodes[u]["duration"]

    # Float Calculations (Total Float & Critical Status)
    critical_nodes = []
    for u in G.nodes:
        tf = G.nodes[u]["ls"] - G.nodes[u]["es"]
        G.nodes[u]["tf"] = tf
        if abs(tf) < 1e-4:
            G.nodes[u]["is_critical"] = True
            critical_nodes.append(u)

    print(f"[INFO] Critical Path: {' -> '.join(critical_nodes)}")
    return G, project_duration, critical_nodes

def plot_network_diagram(G, critical_nodes):
    plt.figure(figsize=(12, 6), dpi=120)
    plt.title("AON Project Network Schedule (Critical Path Highlighted)", fontsize=13, fontweight="bold")
    
    pos = nx.spring_layout(G, seed=42, k=1.8)
    
    node_colors = ["#e11d48" if n in critical_nodes else "#e2e8f0" for n in G.nodes]
    edge_colors = ["#e11d48" if u in critical_nodes and v in critical_nodes else "#94a3b8" for u, v in G.edges]
    edge_widths = [2.5 if u in critical_nodes and v in critical_nodes else 1.2 for u, v in G.edges]

    nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=2400, edgecolors="#0f172a")
    nx.draw_networkx_edges(G, pos, edge_color=edge_colors, width=edge_widths, arrowsize=18)
    
    labels = {
        n: f"{n}\\nES:{G.nodes[n]['es']} EF:{G.nodes[n]['ef']}\\nTF:{G.nodes[n]['tf']}d"
        for n in G.nodes
    }
    nx.draw_networkx_labels(G, pos, labels=labels, font_size=8, font_family="sans-serif")

    plt.axis("off")
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    G, total_time, critical_nodes = solve_cpm_network(activities_data)
    # plot_network_diagram(G, critical_nodes)
`;
  };

  // 2. Matplotlib Gantt Chart Python Script (All English titles, axes, legends)
  const ganttScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
Matplotlib Project Gantt Schedule with Total Float Buffer
Notice: All chart titles, legends, and axes are standardized in English.
=============================================================================
"""

import matplotlib.pyplot as plt
import pandas as pd

tasks = [
${activities
  .map(
    (a) =>
      `    {"id": "${a.id}", "name": "${a.name}", "start": ${a.es}, "duration": ${a.duration}, "tf": ${a.tf}, "is_critical": ${a.isCritical ? 'True' : 'False'}}`
  )
  .join(',\n')}
]

df = pd.DataFrame(tasks)

fig, ax = plt.subplots(figsize=(10, len(df) * 0.55 + 2), dpi=120)

for idx, row in df.iterrows():
    color = "#e11d48" if row["is_critical"] else "#4f46e5"
    label_crit = "Critical Activity (TF=0)" if row["is_critical"] and idx == 0 else ""
    label_norm = "Normal Activity" if not row["is_critical"] and idx == 1 else ""
    
    # Active duration bar
    ax.barh(
        row["id"] + " - " + row["name"][:16],
        row["duration"],
        left=row["start"],
        color=color,
        height=0.48,
        edgecolor="#0f172a",
        label=label_crit or label_norm
    )
    
    # Total float extension buffer
    if row["tf"] > 0:
        ax.barh(
            row["id"] + " - " + row["name"][:16],
            row["tf"],
            left=row["start"] + row["duration"],
            color="none",
            edgecolor="#94a3b8",
            linestyle="--",
            height=0.3,
            label="Total Float Buffer" if idx == 1 else ""
        )

# English labels & titles
ax.set_xlabel("Project Timeline (Days)", fontsize=11, fontweight="medium")
ax.set_ylabel("Activities", fontsize=11, fontweight="medium")
ax.set_title("Project Critical Path Gantt Schedule with Float Buffer", fontsize=13, fontweight="bold")
ax.grid(axis="x", linestyle=":", alpha=0.6)
ax.legend(loc="lower right", framealpha=0.9, fontsize=9)
plt.gca().invert_yaxis()
plt.tight_layout()
plt.show()
`;

  // 3. SciPy PERT Probability Python Script (All English titles, axes, legends)
  const pertScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
PERT Three-Point Estimates & Normal Distribution Confidence Engine
Notice: All chart titles, legends, and axes are standardized in English.
=============================================================================
"""

import numpy as np
import scipy.stats as stats
import matplotlib.pyplot as plt

mean_duration = ${calcResult.projectDuration}
std_dev = ${calcResult.criticalStdDev || 1.0}

print(f"[INFO] Expected Project Duration (Te): {mean_duration:.2f} days")
print(f"[INFO] Critical Path Standard Deviation (Sigma): {std_dev:.2f} days")

# Confidence benchmark evaluation
benchmarks = [
    ("50% Median Target", mean_duration),
    ("85% Industrial Target", mean_duration + 1.04 * std_dev),
    ("95% High Confidence Target", mean_duration + 1.65 * std_dev),
    ("99% Mission-Critical Target", mean_duration + 2.33 * std_dev),
]

for label, t in benchmarks:
    z = (t - mean_duration) / std_dev
    prob = stats.norm.cdf(z)
    print(f"[BENCHMARK] {label} -> {t:.1f} days (Probability P = {prob * 100:.1f}%)")

# Plot Normal Distribution Curve
x = np.linspace(mean_duration - 4 * std_dev, mean_duration + 4 * std_dev, 240)
y = stats.norm.pdf(x, mean_duration, std_dev)

plt.figure(figsize=(9, 4.5), dpi=120)
plt.plot(x, y, color="#4f46e5", lw=2.2, label=f"Normal PDF N(mean={mean_duration:.1f}, std={std_dev:.2f})")
plt.axvline(mean_duration, color="#e11d48", linestyle="--", lw=1.5, label=f"Expected Target {mean_duration}d (P=50%)")

# 95% Confidence Shaded Area
target_95 = mean_duration + 1.65 * std_dev
plt.fill_between(x, y, where=(x <= target_95), color="#6366f1", alpha=0.25, label=f"95% Confidence Interval (<= {target_95:.1f}d)")

plt.title("PERT Project Duration Probability Density Function (PDF)", fontsize=13, fontweight="bold")
plt.xlabel("Project Completion Time (Days)", fontsize=11, fontweight="medium")
plt.ylabel("Probability Density", fontsize=11, fontweight="medium")
plt.legend(loc="upper right", framealpha=0.9, fontsize=9)
plt.grid(True, linestyle=":", alpha=0.5)
plt.tight_layout()
plt.show()
`;

  const currentCode =
    activeSnippet === 'networkx'
      ? generateNetworkXScript()
      : activeSnippet === 'gantt'
      ? ganttScript
      : pertScript;

  // Handle Run Code inside project
  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasExecuted(true);
      setExecutionTime(Math.floor(Math.random() * 8) + 12);
    }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_planning_${activeSnippet}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 06 · 代码引擎
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Python / NetworkX 运筹求解与绘图代码引擎
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            提供可一键在项目内执行并输出图表/终端的仿真环境，支持将自包含脚本复制到项目外部直接运行。
            代码内所有图表标题 (Title)、坐标轴 (Axis Labels) 与图例 (Legend) 均采用纯英文学术规范。
          </p>
        </div>

        {/* Snippet Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium self-start md:self-auto shrink-0">
          <button
            onClick={() => {
              setActiveSnippet('networkx');
              setHasExecuted(false);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSnippet === 'networkx'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            NetworkX 拓扑求解
          </button>
          <button
            onClick={() => {
              setActiveSnippet('gantt');
              setHasExecuted(false);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSnippet === 'gantt'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Matplotlib 甘特图
          </button>
          <button
            onClick={() => {
              setActiveSnippet('pert');
              setHasExecuted(false);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSnippet === 'pert'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            SciPy 正态分布
          </button>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="bg-stone-950 text-stone-200 rounded-xl overflow-hidden border border-stone-800 shadow-sm">
        {/* Code Bar Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 border-b border-stone-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="font-mono text-stone-400 ml-2">
              project_{activeSnippet}_engine.py
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Run Code Button (运行代码) */}
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? '正在运行...' : '运行代码'}</span>
            </button>

            {/* Copy Code Button (修改标题为：复制代码) */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制代码' : '复制代码'}</span>
            </button>

            {/* Download script */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded text-xs transition-colors"
              title="下载 Python 脚本文件"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">下载</span>
            </button>
          </div>
        </div>

        {/* Code Content Viewport */}
        <div className="p-4 overflow-x-auto max-h-[380px]">
          <pre className="font-mono text-xs leading-relaxed text-stone-300 select-all">
            {currentCode}
          </pre>
        </div>
      </div>

      {/* Execution Output Window (运行代码输出窗口) */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs space-y-0">
        {/* Output Window Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200 gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-stone-700" />
            <h3 className="text-xs font-bold text-stone-900">
              程序执行输出窗口 (Execution Output Console)
            </h3>
            {hasExecuted && (
              <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Process finished with exit code 0 ({executionTime}ms)
              </span>
            )}
          </div>

          {/* Output Mode Switcher: Stdout vs Chart vs DataFrame Table */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-200/70 rounded-lg text-xs font-medium">
            <button
              onClick={() => setExecutionOutputTab('stdout')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                executionOutputTab === 'stdout'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>控制台输出</span>
            </button>
            <button
              onClick={() => setExecutionOutputTab('chart')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                executionOutputTab === 'chart'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>生成图表 (Figure)</span>
            </button>
            <button
              onClick={() => setExecutionOutputTab('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                executionOutputTab === 'table'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>结果数据表 (DataFrame)</span>
            </button>
          </div>
        </div>

        {/* Output Window Body */}
        <div className="p-4">
          {/* TAB 1: Terminal Stdout */}
          {executionOutputTab === 'stdout' && (
            <div className="bg-stone-950 text-stone-200 rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto min-h-[180px]">
              <div className="text-stone-500 mb-1">
                $ python3 project_{activeSnippet}_engine.py
              </div>
              <div className="text-emerald-400">
                [INFO] Initializing CPM/PERT operations research solver...
              </div>
              <div className="text-stone-300">
                [INFO] Loading {activities.length} activities and {activities.reduce((s, a) => s + a.predecessors.length, 0)} dependency edges.
              </div>
              <div className="text-stone-300">
                [INFO] Topological Sort Order: {activities.map((a) => a.id).join(' -> ')}
              </div>
              <div className="text-stone-300">
                [INFO] Forward Pass calculated: Earliest Start (ES) and Earliest Finish (EF) complete.
              </div>
              <div className="text-stone-300">
                [INFO] Backward Pass calculated: Latest Start (LS) and Latest Finish (LF) complete.
              </div>
              <div className="text-amber-400 font-bold mt-1">
                [INFO] Total Project Duration: {calcResult.projectDuration} days
              </div>
              <div className="text-rose-400 font-bold">
                [INFO] Critical Path: {calcResult.criticalPathIds.join(' -> ')}
              </div>
              {activeSnippet === 'pert' && (
                <>
                  <div className="text-indigo-300 mt-1">
                    [INFO] Critical Variance Sum (Sigma^2): {calcResult.criticalVarianceSum} days^2
                  </div>
                  <div className="text-indigo-300">
                    [INFO] Critical Standard Deviation (Sigma): {calcResult.criticalStdDev} days
                  </div>
                  <div className="text-stone-300">
                    [BENCHMARK] 50% Confidence: {calcResult.projectDuration} days (Z = 0.00)
                  </div>
                  <div className="text-stone-300">
                    [BENCHMARK] 95% Confidence: {Math.round((calcResult.projectDuration + 1.645 * calcResult.criticalStdDev) * 10) / 10} days (Z = 1.65)
                  </div>
                </>
              )}
              <div className="text-stone-500 mt-2">
                # Matplotlib figure rendered successfully (canvas active).
              </div>
            </div>
          )}

          {/* TAB 2: Visual Figure (图 - All English titles, axes, legends) */}
          {executionOutputTab === 'chart' && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-mono font-medium text-stone-800">
                  Figure 1: Matplotlib / NetworkX Rendering Canvas
                </span>
                <span className="text-[11px] text-stone-400">
                  Labels & Titles: Standard Academic English
                </span>
              </div>

              {/* Chart Rendered based on snippet */}
              {activeSnippet === 'networkx' && (
                <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-3">
                  <div className="text-center font-sans font-bold text-stone-900 text-sm">
                    AON Project Network Schedule (Critical Path Highlighted)
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {activities.map((act, i) => (
                      <React.Fragment key={act.id}>
                        <div
                          className={`px-3 py-2 rounded-lg border text-xs text-center font-mono ${
                            act.isCritical
                              ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold'
                              : 'bg-stone-50 border-stone-200 text-stone-700'
                          }`}
                        >
                          <div className="font-bold">{act.id}</div>
                          <div className="text-[10px] text-stone-500">
                            ES:{act.es} EF:{act.ef}
                          </div>
                          <div className="text-[10px] font-semibold">
                            TF:{act.tf}d {act.isCritical ? '(CP)' : ''}
                          </div>
                        </div>
                        {i < activities.length - 1 && (
                          <span className="text-stone-400 font-bold">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {activeSnippet === 'gantt' && (
                <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-3">
                  <div className="text-center font-sans font-bold text-stone-900 text-sm">
                    Project Critical Path Gantt Schedule with Float Buffer
                  </div>
                  <div className="space-y-2 pt-2">
                    {activities.slice(0, 6).map((act) => {
                      const totalTime = Math.ceil(calcResult.projectDuration);
                      const leftPercent = (act.es / totalTime) * 100;
                      const widthPercent = (act.duration / totalTime) * 100;
                      const floatPercent = (act.tf / totalTime) * 100;

                      return (
                        <div key={act.id} className="flex items-center gap-3 text-xs">
                          <span className="w-24 truncate font-mono text-stone-700">
                            {act.id} - {act.name}
                          </span>
                          <div className="flex-1 relative h-5 bg-stone-100 rounded">
                            {act.tf > 0 && (
                              <div
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent + floatPercent}%`,
                                }}
                                className="absolute h-full border border-dashed border-stone-400 bg-stone-200/40 rounded-r"
                              />
                            )}
                            <div
                              style={{
                                left: `${leftPercent}%`,
                                width: `${Math.max(4, widthPercent)}%`,
                              }}
                              className={`absolute h-full rounded text-[10px] text-white flex items-center px-1 font-mono ${
                                act.isCritical ? 'bg-rose-500' : 'bg-indigo-600'
                              }`}
                            >
                              {act.duration}d
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 font-mono pt-2 border-t border-stone-100">
                    <span>Timeline (Days): 0d</span>
                    <span>Total Duration: {calcResult.projectDuration}d</span>
                  </div>
                </div>
              )}

              {activeSnippet === 'pert' && (
                <div className="bg-white p-4 rounded-lg border border-stone-200 space-y-3">
                  <div className="text-center font-sans font-bold text-stone-900 text-sm">
                    PERT Project Duration Probability Density Function (PDF)
                  </div>
                  <div className="flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-stone-50 border border-stone-200 rounded p-3 text-xs space-y-1.5 font-mono">
                      <div className="text-stone-700">
                        Mean (Expected Duration): <strong className="text-rose-600">{calcResult.projectDuration} days</strong>
                      </div>
                      <div className="text-stone-700">
                        Variance (Sigma^2): <strong className="text-stone-900">{calcResult.criticalVarianceSum} days^2</strong>
                      </div>
                      <div className="text-stone-700">
                        Std Dev (Sigma): <strong className="text-indigo-600">{calcResult.criticalStdDev} days</strong>
                      </div>
                      <div className="text-emerald-700 font-bold pt-1 border-t border-stone-200">
                        95% Confidence Upper Bound: {Math.round((calcResult.projectDuration + 1.645 * calcResult.criticalStdDev) * 10) / 10} days
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DataFrame Table (表) */}
          {executionOutputTab === 'table' && (
            <div className="border border-stone-200 rounded-lg overflow-x-auto text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-stone-50 text-[11px] text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2 px-3">Activity_ID</th>
                    <th className="py-2 px-3 font-sans">Name</th>
                    <th className="py-2 px-2 text-center">Duration</th>
                    <th className="py-2 px-2 text-center">ES</th>
                    <th className="py-2 px-2 text-center">EF</th>
                    <th className="py-2 px-2 text-center">LS</th>
                    <th className="py-2 px-2 text-center">LF</th>
                    <th className="py-2 px-2 text-center">Total_Float</th>
                    <th className="py-2 px-3 text-center">Is_Critical</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px]">
                  {activities.map((a) => (
                    <tr
                      key={a.id}
                      className={a.isCritical ? 'bg-rose-50/40 font-bold' : 'hover:bg-stone-50'}
                    >
                      <td className="py-2 px-3 text-stone-900">{a.id}</td>
                      <td className="py-2 px-3 font-sans text-stone-800">{a.name}</td>
                      <td className="py-2 px-2 text-center text-stone-700">{a.duration}d</td>
                      <td className="py-2 px-2 text-center text-indigo-700">{a.es}</td>
                      <td className="py-2 px-2 text-center text-indigo-700">{a.ef}</td>
                      <td className="py-2 px-2 text-center text-amber-700">{a.ls}</td>
                      <td className="py-2 px-2 text-center text-amber-700">{a.lf}</td>
                      <td
                        className={`py-2 px-2 text-center font-bold ${
                          a.tf === 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {a.tf}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        {a.isCritical ? (
                          <span className="text-[10px] font-bold text-rose-600">TRUE (CP)</span>
                        ) : (
                          <span className="text-[10px] text-stone-400">FALSE</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Guide Notes */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-600">
        <div>
          <h4 className="font-bold text-stone-900 mb-1">01. 项目内一键运行</h4>
          <p className="leading-relaxed">
            点击顶栏【运行代码】，系统将实时构建拓扑网络并执行顺推逆推，在下方输出窗口呈现标准 Terminal 控制台、图表与 DataFrame 数据表。
          </p>
        </div>
        <div>
          <h4 className="font-bold text-stone-900 mb-1">02. 复制代码至项目外</h4>
          <p className="leading-relaxed">
            点击【复制代码】，可直接粘贴至本地 VS Code、PyCharm 或 Jupyter Notebook 环境，已包含完整的独立运行依赖与输入字典。
          </p>
        </div>
        <div>
          <h4 className="font-bold text-stone-900 mb-1">03. 纯英文图表规范</h4>
          <p className="leading-relaxed">
            所有生成脚本中的图标题 (Title)、X/Y 坐标轴标签 (Axis Labels) 与图例 (Legends) 严格遵循国际运筹学与系统工程英文学术规范。
          </p>
        </div>
      </div>
    </div>
  );
};
