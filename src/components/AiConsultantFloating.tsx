import React, { useState, useRef, useEffect } from 'react';
import { Activity, ProjectCalculationResult } from '../types/project';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  AlertTriangle,
  RefreshCw,
  Settings,
  Key,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Trash2,
  Cpu,
  HelpCircle,
} from 'lucide-react';

interface Props {
  activities: Activity[];
  calcResult: ProjectCalculationResult;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  isError?: boolean;
}

type ModelType = 'gemini-3-flash' | 'deepseek-v4-pro';

export const AiConsultantFloating: React.FC<Props> = ({
  activities,
  calcResult,
  isOpen,
  onClose,
}) => {
  // State for Model Settings
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
    return (localStorage.getItem('se_planner_active_model') as ModelType) || 'gemini-3-flash';
  });
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return localStorage.getItem('se_planner_gemini_key') || '';
  });
  const [deepseekKey, setDeepseekKey] = useState<string>(() => {
    return localStorage.getItem('se_planner_deepseek_key') || '';
  });
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
    return localStorage.getItem('se_planner_custom_base_url') || '';
  });

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '您好！我是系统工程规划与运筹学随诊专家。我已接入当前项目的实时网络拓扑与计算结果。\n\n💡【使用提示】：本项目支持直接部署至 GitHub 静态环境。请先点击右上角小齿轮 ⚙️ 设置大模型并手工输入 API-Key（支持 gemini 3 flash 与 deepseek-v4-pro），保存确认后即可随时向我发起全流程规划问答与深度诊断！',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Active Key depending on chosen model
  const activeKey = selectedModel === 'gemini-3-flash' ? geminiKey : deepseekKey;
  const hasValidKey = activeKey.trim().length > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Construct current project context for LLM prompt
  const buildProjectSummaryContext = () => {
    const criticalList = activities
      .filter((a) => a.isCritical)
      .map((a) => `${a.id}(${a.name}, ${a.duration}d)`)
      .join(' → ');

    const nearCriticalList = activities
      .filter((a) => !a.isCritical && a.tf <= 5)
      .map((a) => `${a.id}(${a.name}, TF=${a.tf}d)`)
      .join(', ');

    const bottlenecks = calcResult.resourceBottlenecks
      .slice(0, 5)
      .map((b) => `${b.resource}在第${b.day}天需${b.usage}单位(上限${b.limit})`)
      .join('; ');

    return `
【当前项目规划实时数据】
- 基准总工期: ${calcResult.projectDuration} 天
- 关键路径链: ${criticalList || '无明确单链'}
- 次关键高危任务(TF≤5天): ${nearCriticalList || '暂无紧迫次关键任务'}
- PERT标准差 σ: ${calcResult.criticalStdDev || 0} 天 (方差和 Σσ²=${calcResult.criticalVarianceSum || 0})
- 是否存在逻辑死循环: ${calcResult.hasCycle ? '是 (高危错误: ' + calcResult.cycleNodes?.join('->') + ')' : '否 (DAG拓扑良好)'}
- 资源过载冲突: ${bottlenecks || '当前未检测到超额资源瓶颈'}
- 活动总数: ${activities.length} 项
    `;
  };

  // Confirm Model and Save Settings
  const handleConfirmSettings = () => {
    const currentKey = selectedModel === 'gemini-3-flash' ? geminiKey : deepseekKey;
    if (!currentKey.trim()) {
      setSettingsNotice({
        type: 'error',
        text: `请输入 ${selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'} 的 API-Key 后再确认！`,
      });
      keyInputRef.current?.focus();
      return;
    }

    localStorage.setItem('se_planner_active_model', selectedModel);
    localStorage.setItem('se_planner_gemini_key', geminiKey.trim());
    localStorage.setItem('se_planner_deepseek_key', deepseekKey.trim());
    localStorage.setItem('se_planner_custom_base_url', customBaseUrl.trim());

    setSettingsNotice({
      type: 'success',
      text: `已确认大模型：【${selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'}】，配置已保存！`,
    });

    setTimeout(() => {
      setShowSettings(false);
      setSettingsNotice(null);
    }, 900);
  };

  // Direct Browser Client LLM Call (Supports Static GitHub Pages Deployment)
  const callLlmApiDirect = async (userPrompt: string): Promise<string> => {
    const context = buildProjectSummaryContext();
    const fullPrompt = `${context}

【用户问题/指令】
${userPrompt}

请基于系统工程专业视角（WBS 结构完整性、CPM 关键路径稳定性、PERT 随机风险、时差漂移与资源平衡调平）进行深度解答。结构化呈现，条理分明，用词专业淡雅。`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      if (selectedModel === 'gemini-3-flash') {
        // Direct browser call to Google Generative Language API
        const base = customBaseUrl.trim() || 'https://generativelanguage.googleapis.com';
        const apiKey = geminiKey.trim();
        const url = `${base.replace(/\/+$/, '')}/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: '你是一位资深系统工程规划专家、运筹学与项目管理 (PMP) 导师。精通工作分解结构(WBS)、网络计划(AON/AOA)、CPM关键路径法、PERT三点估计以及资源平衡调平。请以专业、清晰、富有工程洞察力的简体中文回答，条理分明，直击问题本质。',
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: fullPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 2048,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message || `Gemini API 调用异常 (HTTP ${response.status})`);
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini API 未返回有效内容');
        return text;
      } else {
        // Direct browser call to DeepSeek Chat API
        const base = customBaseUrl.trim() || 'https://api.deepseek.com';
        const apiKey = deepseekKey.trim();
        const url = `${base.replace(/\/+$/, '')}/chat/completions`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content:
                  '你是一位精通系统工程、WBS任务分解、关键路径法(CPM)、计划评审技术(PERT)与运筹学资源平衡的资深系统架构与项目总工程师。请以严谨、结构化、清晰的简体中文提供深度规划建议。',
              },
              {
                role: 'user',
                content: fullPrompt,
              },
            ],
            temperature: 0.5,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error?.message || `DeepSeek API 调用异常 (HTTP ${response.status})`);
        }

        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('DeepSeek API 未返回有效内容');
        return text;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort
        ? '大模型调用超时（超过 20 秒未响应），请检查网络连接或接口代理设置。'
        : err.message || '网络连接失败';

      // Throw error to notify user about API-Key or network issue
      throw new Error(`【${selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'} 调用失败】: ${errorMsg}`);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    // Check if API Key is configured
    if (!hasValidKey) {
      setShowSettings(true);
      setSettingsNotice({
        type: 'error',
        text: '系统要求：所有大模型调用必须先手工输入 API-Key 并确认！',
      });
      return;
    }

    const userMsg: Message = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const reply = await callLlmApiDirect(query);
      const assistantMsg: Message = {
        role: 'assistant',
        content: reply,
        modelUsed: selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `${err.message}\n\n💡 请检查：\n1. API-Key 是否填写正确并有调用配额；\n2. 浏览器网络是否能正常访问官方接口（如遇到限制，可在小齿轮 ⚙️ 设置中配置反向代理接口地址）；\n3. 点击右上角小齿轮重新设置。`,
        isError: true,
        modelUsed: selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleOneClickDiagnosis = () => {
    if (!hasValidKey) {
      setShowSettings(true);
      setSettingsNotice({
        type: 'error',
        text: '请先点击右上角小齿轮输入 API-Key 并确认大模型，方可执行全面诊断！',
      });
      return;
    }
    handleSend(
      '请对当前项目网络计划执行一次全面的【系统工程规划健康度体检】，重点审查：1. 关键路径是否存在断裂或单点脆弱性；2. 次关键活动是否存在时差耗尽转为新关键路径的漂移风险；3. 资源配置是否平稳可行；4. 提供具体的工程优化建议。'
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-5 pointer-events-none z-50 ${
        isExpanded ? 'inset-y-4 md:inset-y-8' : ''
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex ${
          isExpanded ? 'items-center justify-center' : 'items-end justify-end'
        }`}
      >
        <div
          className={`pointer-events-auto transition-all duration-200 bg-white border border-stone-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            isExpanded
              ? 'w-full h-full max-h-[88vh]'
              : 'w-full sm:w-[480px] h-[620px]'
          }`}
        >
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-stone-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-bold tracking-wide truncate">
            AI 规划随诊 · 系统工程大模型问答
          </span>
          {/* Active Model Indicator Tag */}
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300 font-mono border border-stone-700 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasValidKey ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            {selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'}
          </span>
        </div>

        {/* Action Controls on Far Right (Gear Settings Icon) */}
        <div className="flex items-center gap-1.5 text-stone-300 shrink-0">
          {/* Small Gear Settings Icon */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs ${
              showSettings
                ? 'bg-indigo-600 text-white'
                : !hasValidKey
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'hover:text-white hover:bg-stone-800 text-stone-300'
            }`}
            title="设置大模型与手工输入 API-Key"
          >
            <Settings className={`w-4 h-4 ${!hasValidKey ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            {!hasValidKey && <span className="text-[10px] font-medium hidden md:inline">配置Key</span>}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:text-white hover:bg-stone-800 rounded transition-colors"
            title={isExpanded ? '还原窗口' : '最大化窗口'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:text-white hover:bg-stone-800 rounded transition-colors"
            title="关闭随诊"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model & API-Key Settings Panel (Overlay Drawer) */}
      {showSettings && (
        <div className="bg-stone-50 border-b border-stone-200 p-4 space-y-4 shrink-0 max-h-[75%] overflow-y-auto text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>大模型参数设置与 API-Key 授权</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono">
              纯浏览器直接调用 · 适配 GitHub Pages
            </span>
          </div>

          {settingsNotice && (
            <div
              className={`p-2.5 rounded-lg flex items-center gap-2 text-xs ${
                settingsNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {settingsNotice.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{settingsNotice.text}</span>
            </div>
          )}

          {/* Feature 2: Select between two models */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-2">
              1. 选择大模型 (Select Model):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: gemini 3 flash */}
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3-flash')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === 'gemini-3-flash'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-stone-900 text-xs">gemini 3 flash</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono">
                    Google
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  极速多模态拓扑推理，长上下文结构化规划诊断与高并发求解
                </p>
                <div className="mt-2 text-[10px] text-stone-400 font-mono">
                  Key 状态: {geminiKey.trim() ? '已录入 ✓' : '未录入 ⚠️'}
                </div>
              </button>

              {/* Option B: deepseek-v4-pro */}
              <button
                type="button"
                onClick={() => setSelectedModel('deepseek-v4-pro')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === 'deepseek-v4-pro'
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-stone-900 text-xs">deepseek-v4-pro</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">
                    DeepSeek
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  高阶逻辑演算与运筹学深度推导，时差漂移与关键路径严谨论证
                </p>
                <div className="mt-2 text-[10px] text-stone-400 font-mono">
                  Key 状态: {deepseekKey.trim() ? '已录入 ✓' : '未录入 ⚠️'}
                </div>
              </button>
            </div>
          </div>

          {/* Feature 1: Manual input of API-Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-stone-600" />
                <span>
                  2. 手工输入 {selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'} API-Key:
                </span>
                <span className="text-rose-600">*</span>
              </label>
              {activeKey && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedModel === 'gemini-3-flash') setGeminiKey('');
                    else setDeepseekKey('');
                  }}
                  className="text-[10px] text-stone-400 hover:text-rose-600 flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" /> 清空
                </button>
              )}
            </div>

            <div className="relative">
              <input
                ref={keyInputRef}
                type={showKeyPassword ? 'text' : 'password'}
                value={selectedModel === 'gemini-3-flash' ? geminiKey : deepseekKey}
                onChange={(e) => {
                  if (selectedModel === 'gemini-3-flash') setGeminiKey(e.target.value);
                  else setDeepseekKey(e.target.value);
                }}
                placeholder={
                  selectedModel === 'gemini-3-flash'
                    ? '请输入 Google Gemini API Key (如 AIzaSy...)'
                    : '请输入 DeepSeek API Key (如 sk-...)'
                }
                className="w-full pl-3 pr-10 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowKeyPassword(!showKeyPassword)}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
                title={showKeyPassword ? '隐藏 Key' : '显示 Key'}
              >
                {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-stone-500 leading-normal">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>客户端隐私声明</strong>：本项目静态部署至 GitHub，无任何后台服务截留。API-Key 仅储存在您当前浏览器的 LocalStorage 中，每次提问直接由浏览器客户端发起 HTTPS 请求至官方 API。
              </span>
            </div>
          </div>

          {/* Optional: Custom API Base URL */}
          <div>
            <label className="block text-[10px] font-medium text-stone-500 mb-1">
              自定义接口代理地址 (可选，支持中转反向代理，留空则使用官方默认):
            </label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder={
                selectedModel === 'gemini-3-flash'
                  ? '默认: https://generativelanguage.googleapis.com'
                  : '默认: https://api.deepseek.com'
              }
              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {/* Feature 3: Confirm Model and Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-medium transition-colors"
            >
              取消 / 返回
            </button>
            <button
              type="button"
              onClick={handleConfirmSettings}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>确认大模型并保存</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Prompts Strip */}
      <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <button
          onClick={handleOneClickDiagnosis}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-[11px] whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" />
          <span>一键系统全面诊断</span>
        </button>

        <button
          onClick={() => handleSend('请评估当前非关键活动中哪些最具【关键路径漂移风险】？')}
          disabled={loading}
          className="px-2.5 py-1 bg-stone-200/80 hover:bg-stone-300 text-stone-800 rounded-md text-[11px] whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
        >
          路径漂移评估
        </button>

        <button
          onClick={() => handleSend('如果业主强制要求将基准工期提前15%，我应该如何选择成本斜率最优的工序进行赶工 (Crashing)？')}
          disabled={loading}
          className="px-2.5 py-1 bg-stone-200/80 hover:bg-stone-300 text-stone-800 rounded-md text-[11px] whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
        >
          工期压缩与赶工策略
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* If no API-Key is configured yet, show a clear guidance banner */}
        {!hasValidKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">尚未配置大模型 API-Key</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                本项目已适配 GitHub 静态部署，所有大模型调用必须由浏览器直连官方接口。请点击右上角小齿轮 ⚙️ 设置并输入您的{' '}
                <strong>gemini 3 flash</strong> 或 <strong>deepseek-v4-pro</strong> API-Key。
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors"
              >
                <Settings className="w-3 h-3" />
                <span>立即配置 API-Key</span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-stone-900 text-white'
                  : msg.isError
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-stone-100 text-stone-900 border border-stone-200/80'
              }`}
            >
              {msg.content}
            </div>
            <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-stone-400 font-mono">
              <span>{msg.timestamp}</span>
              {msg.modelUsed && (
                <span className="px-1 py-0.2 bg-stone-100 rounded text-stone-500 border border-stone-200">
                  {msg.modelUsed}
                </span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-stone-500 text-xs bg-stone-50 border border-stone-200 p-3 rounded-xl w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>
              正在调用【{selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'}】分析网络计划，请稍候…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            hasValidKey
              ? `向【${selectedModel === 'gemini-3-flash' ? 'gemini 3 flash' : 'deepseek-v4-pro'}】提问规划优化方案...`
              : '⚠️ 请先点击右上角 ⚙️ 输入并确认 API-Key 方可提问...'
          }
          className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-colors shrink-0"
          title={hasValidKey ? '发送' : '请先配置 API-Key'}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
        </div>
      </div>
    </div>
  );
};
