export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Dependency {
  id: string; // predecessor activity ID
  type: DependencyType;
  lag: number; // days (default 0)
}

export interface Activity {
  id: string;
  wbsCode: string; // e.g. "1.1", "2.1.3"
  name: string;
  category: string;
  duration: number; // CPM duration in days
  
  // PERT three-point estimates
  optimistic: number; // a
  mostLikely: number; // m
  pessimistic: number; // b
  expectedDuration?: number; // Te = (a + 4m + b)/6
  variance?: number; // σ^2 = ((b-a)/6)^2

  // Logic dependencies
  predecessors: Dependency[];

  // Resource allocation
  resourceRole: string; // e.g. "结构总师", "算法专家", "工艺装配班", "测试台架"
  resourceDemand: number; // units per day (e.g. 2 engineers)
  
  // Crashing / Fast-tracking parameters
  crashDuration?: number; // minimum achievable duration
  crashCostPerDay?: number; // cost slope ΔC / ΔT in 万元/天
  normalCost?: number; // base cost in 万元

  // Computed CPM fields
  es: number; // Early Start
  ef: number; // Early Finish
  ls: number; // Late Start
  lf: number; // Late Finish
  tf: number; // Total Float
  ff: number; // Free Float
  isCritical: boolean;

  // Custom positioning in network layout
  x?: number;
  y?: number;
}

export interface WbsNode {
  id: string;
  code: string;
  name: string;
  level: number;
  parentId: string | null;
  workDays: number; // workload in man-days
  owner: string;
  weight: number; // percentage %
  costBudget: number; // 万元
  progress: number; // 0 - 100%
  description?: string;
  activityId?: string; // mapping to activity if it's a work package leaf node
  children?: WbsNode[];
}

export interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  tag: string;
  mappedConcept: string; // e.g. "CPM 关键路径与工期压缩优化"
  description: string;
  background: string;
  challenges: string[];
  keyActions: string[];
  activities: Activity[];
  wbsNodes: WbsNode[];
  resourceLimits: Record<string, number>;
}

export interface ProjectCalculationResult {
  projectDuration: number;
  criticalPathIds: string[];
  criticalPaths: string[][]; // multiple critical paths if any
  hasCycle: boolean;
  cycleNodes?: string[];
  totalExpectedDuration: number; // for PERT
  criticalVarianceSum: number;
  criticalStdDev: number;
  completionProbabilities: {
    targetDays: number;
    zScore: number;
    probability: number;
  }[];
  resourceProfiles: Record<string, number[]>; // resource -> daily usage array
  resourceBottlenecks: {
    resource: string;
    day: number;
    usage: number;
    limit: number;
  }[];
}
