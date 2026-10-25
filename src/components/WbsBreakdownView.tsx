import React, { useState } from 'react';
import { WbsNode } from '../types/project';
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight, FolderTree, ListFilter, DollarSign, Clock, Users } from 'lucide-react';

interface Props {
  wbsNodes: WbsNode[];
  onUpdateWbs: (nodes: WbsNode[]) => void;
}

export const WbsBreakdownView: React.FC<Props> = ({ wbsNodes, onUpdateWbs }) => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('table');
  const [editingNode, setEditingNode] = useState<WbsNode | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Aggregate metrics
  const totalWorkDays = wbsNodes.reduce((sum, n) => (n.level === 2 ? sum + n.workDays : sum), 0);
  const totalBudget = wbsNodes.reduce((sum, n) => (n.level === 2 ? sum + n.costBudget : sum), 0);
  const avgProgress =
    wbsNodes.filter((n) => n.level === 2).length > 0
      ? Math.round(
          wbsNodes
            .filter((n) => n.level === 2)
            .reduce((sum, n) => sum + (n.progress * n.weight) / 100, 0)
        )
      : 0;

  const toggleCollapse = (id: string) => {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedIds(next);
  };

  const handleAddChild = (parentId: string, parentCode: string) => {
    const siblings = wbsNodes.filter((n) => n.parentId === parentId);
    const newIndex = siblings.length + 1;
    const newCode = `${parentCode}.${newIndex}`;
    const newNode: WbsNode = {
      id: `wbs_${Date.now()}`,
      code: newCode,
      name: '新增交付物工作包',
      level: 2,
      parentId,
      workDays: 120,
      owner: '责任工程师',
      weight: 15,
      costBudget: 50,
      progress: 0,
    };
    onUpdateWbs([...wbsNodes, newNode]);
    setEditingNode(newNode);
  };

  const handleDeleteNode = (id: string) => {
    if (wbsNodes.length <= 1) return;
    onUpdateWbs(wbsNodes.filter((n) => n.id !== id && n.parentId !== id));
  };

  const handleSaveNode = () => {
    if (!editingNode) return;
    onUpdateWbs(wbsNodes.map((n) => (n.id === editingNode.id ? editingNode : n)));
    setEditingNode(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            核心模块 02 · 结构分解
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            工作分解结构 (WBS) 交互构建与交付物管理
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl">
            WBS 是系统工程中将宏观任务分解为可评估、可核算、有明确责任主体的层级结构树。遵循 100% 规则，覆盖项目的全部范围。
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg text-xs font-medium self-start md:self-auto shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            层级清单表格
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'tree' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            树状拓扑图
          </button>
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">WBS 工作包总数</div>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums font-mono">
            {wbsNodes.length} <span className="text-xs font-sans text-stone-500 font-normal">个节点</span>
          </div>
        </div>
        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">累计估算工作量</div>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums font-mono">
            {totalWorkDays} <span className="text-xs font-sans text-stone-500 font-normal">人天</span>
          </div>
        </div>
        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">目标成本预算聚合</div>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums font-mono">
            {totalBudget} <span className="text-xs font-sans text-stone-500 font-normal">万元</span>
          </div>
        </div>
        <div className="bg-white p-4 border border-stone-200 rounded-xl">
          <div className="text-xs text-stone-500">综合交付加权进度</div>
          <div className="text-xl font-bold text-indigo-700 mt-1 tabular-nums font-mono">
            {avgProgress}% <span className="text-xs font-sans text-stone-500 font-normal">已完成</span>
          </div>
        </div>
      </div>

      {/* View Mode: Table */}
      {viewMode === 'table' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700">WBS 结构化层级清单</span>
            <button
              onClick={() => {
                const rootNode = wbsNodes.find((n) => n.level === 1) || wbsNodes[0];
                if (rootNode) handleAddChild(rootNode.id, rootNode.code);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加子级工作包</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
                  <th className="py-2.5 px-4 w-28">WBS 代码</th>
                  <th className="py-2.5 px-4">交付物 / 任务名称</th>
                  <th className="py-2.5 px-3">责任人</th>
                  <th className="py-2.5 px-3 text-right">工作量 (人天)</th>
                  <th className="py-2.5 px-3 text-right">预算 (万元)</th>
                  <th className="py-2.5 px-3 text-right">权重</th>
                  <th className="py-2.5 px-4 text-center">当前进度</th>
                  <th className="py-2.5 px-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {wbsNodes.map((node) => {
                  const isRoot = node.level === 1;
                  return (
                    <tr
                      key={node.id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        isRoot ? 'bg-stone-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-stone-800">
                        {node.code}
                      </td>
                      <td className="py-2.5 px-4">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${(node.level - 1) * 20}px` }}
                        >
                          {!isRoot && <span className="text-stone-300">└─</span>}
                          <span className={isRoot ? 'text-stone-900 font-semibold' : 'text-stone-800'}>
                            {node.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">{node.owner}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-700">
                        {node.workDays}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-700">
                        {node.costBudget}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-500">
                        {node.weight}%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${node.progress}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums text-stone-600 text-[11px]">
                            {node.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setEditingNode(node)}
                            className="p-1 text-stone-500 hover:text-stone-900 rounded"
                            title="编辑"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {!isRoot && (
                            <button
                              onClick={() => handleDeleteNode(node.id)}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode: Tree Graph */}
      {viewMode === 'tree' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs overflow-x-auto">
          <div className="min-w-fit space-y-6">
            {wbsNodes
              .filter((n) => n.level === 1)
              .map((root) => {
                const level2Nodes = wbsNodes.filter((n) => n.parentId === root.id);
                return (
                  <div key={root.id} className="space-y-4">
                    {/* Root Box */}
                    <div className="inline-block bg-stone-900 text-white p-4 rounded-xl shadow-xs max-w-sm">
                      <div className="text-[11px] font-mono text-stone-400">WBS {root.code} · 项目顶层目标</div>
                      <div className="text-sm font-bold mt-0.5">{root.name}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-stone-300">
                        <span>负责人: {root.owner}</span>
                        <span>预算: {root.costBudget} 万</span>
                        <span>进度: {root.progress}%</span>
                      </div>
                    </div>

                    {/* Children Grid */}
                    <div className="pl-6 border-l-2 border-stone-200 ml-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {level2Nodes.map((child) => (
                          <div
                            key={child.id}
                            className="bg-stone-50 border border-stone-200 p-3.5 rounded-lg hover:border-indigo-300 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs text-stone-500">
                              <span className="font-mono font-bold text-stone-700">WBS {child.code}</span>
                              <span className="font-mono text-indigo-700 font-medium">{child.weight}% 权重</span>
                            </div>
                            <div className="text-xs font-bold text-stone-900 mt-1">{child.name}</div>
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-200/70 text-[11px] text-stone-600">
                              <div>责任人: {child.owner}</div>
                              <div>工作量: {child.workDays} 人天</div>
                              <div>预算: {child.costBudget} 万</div>
                              <div>完成率: {child.progress}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Edit Node Modal */}
      {editingNode && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-stone-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">
                编辑 WBS 工作包 [{editingNode.code}]
              </h3>
              <button
                onClick={() => setEditingNode(null)}
                className="text-stone-400 hover:text-stone-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">交付物名称</label>
                <input
                  type="text"
                  value={editingNode.name}
                  onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">责任人角色</label>
                  <input
                    type="text"
                    value={editingNode.owner}
                    onChange={(e) => setEditingNode({ ...editingNode, owner: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">工作量 (人天)</label>
                  <input
                    type="number"
                    value={editingNode.workDays}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, workDays: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">预算 (万元)</label>
                  <input
                    type="number"
                    value={editingNode.costBudget}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, costBudget: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">权重 (%)</label>
                  <input
                    type="number"
                    value={editingNode.weight}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, weight: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">当前完成 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingNode.progress}
                    onChange={(e) =>
                      setEditingNode({ ...editingNode, progress: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setEditingNode(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
              >
                取消
              </button>
              <button
                onClick={handleSaveNode}
                className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
              >
                保存变更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
