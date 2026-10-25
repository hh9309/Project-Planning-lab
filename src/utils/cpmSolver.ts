import { Activity, Dependency, ProjectCalculationResult } from '../types/project';

// Standard normal cumulative distribution function (erf approximation)
export function standardNormalCDF(z: number): number {
  if (z < -7) return 0;
  if (z > 7) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Normal probability density function for plotting bell curve
export function normalPDF(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0.0001) return 0;
  const expFactor = -0.5 * Math.pow((x - mean) / stdDev, 2);
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(expFactor);
}

export function detectCycles(activities: Activity[]): { hasCycle: boolean; cyclePath: string[] } {
  const adj = new Map<string, string[]>();
  activities.forEach((act) => {
    adj.set(act.id, []);
  });

  activities.forEach((act) => {
    act.predecessors.forEach((pred) => {
      if (adj.has(pred.id)) {
        adj.get(pred.id)!.push(act.id);
      }
    });
  });

  const state = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  const parent = new Map<string, string>();
  let cycleNodes: string[] = [];

  function dfs(u: string, path: string[]): boolean {
    state.set(u, 1);
    path.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (state.get(v) === 1) {
        // cycle found!
        const cycleStartIdx = path.indexOf(v);
        cycleNodes = path.slice(cycleStartIdx).concat(v);
        return true;
      }
      if (state.get(v) === 0 || !state.has(v)) {
        parent.set(v, u);
        if (dfs(v, path)) return true;
      }
    }

    path.pop();
    state.set(u, 2);
    return false;
  }

  for (const act of activities) {
    if (!state.has(act.id) || state.get(act.id) === 0) {
      if (dfs(act.id, [])) {
        return { hasCycle: true, cyclePath: cycleNodes };
      }
    }
  }

  return { hasCycle: false, cyclePath: [] };
}

export function solveCPM(
  activitiesInput: Activity[],
  mode: 'cpm' | 'pert' = 'cpm',
  targetDaysInput?: number,
  resourceLimits: Record<string, number> = {}
): { activities: Activity[]; result: ProjectCalculationResult } {
  // Deep copy activities to avoid mutating original state directly
  const activities: Activity[] = activitiesInput.map((a) => {
    const Te = (a.optimistic + 4 * a.mostLikely + a.pessimistic) / 6;
    const variance = Math.pow((a.pessimistic - a.optimistic) / 6, 2);
    const duration = mode === 'pert' ? Math.round(Te * 10) / 10 : a.duration;

    return {
      ...a,
      duration: Math.max(0.1, duration),
      expectedDuration: Math.round(Te * 100) / 100,
      variance: Math.round(variance * 1000) / 1000,
      es: 0,
      ef: 0,
      ls: 0,
      lf: 0,
      tf: 0,
      ff: 0,
      isCritical: false,
    };
  });

  const actMap = new Map<string, Activity>();
  activities.forEach((a) => actMap.set(a.id, a));

  // Check for cycles
  const cycleInfo = detectCycles(activities);
  if (cycleInfo.hasCycle) {
    return {
      activities,
      result: {
        projectDuration: 0,
        criticalPathIds: [],
        criticalPaths: [],
        hasCycle: true,
        cycleNodes: cycleInfo.cyclePath,
        totalExpectedDuration: 0,
        criticalVarianceSum: 0,
        criticalStdDev: 0,
        completionProbabilities: [],
        resourceProfiles: {},
        resourceBottlenecks: [],
      },
    };
  }

  // Topological sorting via Kahn's algorithm
  const inDegree = new Map<string, number>();
  const successors = new Map<string, Array<{ id: string; dep: Dependency }>>();

  activities.forEach((a) => {
    inDegree.set(a.id, 0);
    successors.set(a.id, []);
  });

  activities.forEach((act) => {
    act.predecessors.forEach((pred) => {
      if (actMap.has(pred.id)) {
        inDegree.set(act.id, (inDegree.get(act.id) || 0) + 1);
        successors.get(pred.id)!.push({ id: act.id, dep: pred });
      }
    });
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);

    for (const succ of successors.get(u) || []) {
      const newDeg = (inDegree.get(succ.id) || 0) - 1;
      inDegree.set(succ.id, newDeg);
      if (newDeg === 0) {
        queue.push(succ.id);
      }
    }
  }

  // 1. Forward Pass (ES, EF)
  topoOrder.forEach((actId) => {
    const act = actMap.get(actId)!;
    let earliestStart = 0;

    for (const pred of act.predecessors) {
      const predAct = actMap.get(pred.id);
      if (!predAct) continue;
      const lag = pred.lag || 0;

      let constraint = 0;
      switch (pred.type) {
        case 'FS':
          // Finish-to-Start: ES_j >= EF_i + lag
          constraint = predAct.ef + lag;
          break;
        case 'SS':
          // Start-to-Start: ES_j >= ES_i + lag
          constraint = predAct.es + lag;
          break;
        case 'FF':
          // Finish-to-Finish: EF_j >= EF_i + lag => ES_j >= EF_i + lag - D_j
          constraint = predAct.ef + lag - act.duration;
          break;
        case 'SF':
          // Start-to-Finish: EF_j >= ES_i + lag => ES_j >= ES_i + lag - D_j
          constraint = predAct.es + lag - act.duration;
          break;
      }
      if (constraint > earliestStart) {
        earliestStart = constraint;
      }
    }

    act.es = Math.max(0, earliestStart);
    act.ef = act.es + act.duration;
  });

  // Calculate project total duration
  let projectDuration = 0;
  activities.forEach((a) => {
    if (a.ef > projectDuration) projectDuration = a.ef;
  });

  // 2. Backward Pass (LS, LF)
  // Initialize LF for all activities to projectDuration
  activities.forEach((a) => {
    a.lf = projectDuration;
    a.ls = a.lf - a.duration;
  });

  // Reverse topological order
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const actId = topoOrder[i];
    const act = actMap.get(actId)!;

    const succList = successors.get(actId) || [];
    if (succList.length > 0) {
      let minLateFinish = Infinity;

      for (const succ of succList) {
        const succAct = actMap.get(succ.id);
        if (!succAct) continue;
        const lag = succ.dep.lag || 0;

        let limit = Infinity;
        switch (succ.dep.type) {
          case 'FS':
            // LF_i <= LS_j - lag
            limit = succAct.ls - lag;
            break;
          case 'SS':
            // LS_i <= LS_j - lag => LF_i <= LS_j - lag + D_i
            limit = succAct.ls - lag + act.duration;
            break;
          case 'FF':
            // LF_i <= LF_j - lag
            limit = succAct.lf - lag;
            break;
          case 'SF':
            // LS_i <= LF_j - lag => LF_i <= LF_j - lag + D_i
            limit = succAct.lf - lag + act.duration;
            break;
        }
        if (limit < minLateFinish) {
          minLateFinish = limit;
        }
      }
      act.lf = Math.max(0, minLateFinish);
      act.ls = act.lf - act.duration;
    }
  }

  // 3. Floats (TF & FF)
  activities.forEach((act) => {
    // Total float
    act.tf = Math.round((act.ls - act.es) * 100) / 100;
    if (Math.abs(act.tf) < 0.001) act.tf = 0;

    // Free float: min(ES of successors with respect to link) - EF_act
    const succList = successors.get(act.id) || [];
    if (succList.length === 0) {
      act.ff = Math.round((projectDuration - act.ef) * 100) / 100;
    } else {
      let minEarlySuccessorBoundary = Infinity;
      for (const succ of succList) {
        const succAct = actMap.get(succ.id);
        if (!succAct) continue;
        const lag = succ.dep.lag || 0;
        let boundary = succAct.es - lag;
        if (boundary < minEarlySuccessorBoundary) {
          minEarlySuccessorBoundary = boundary;
        }
      }
      act.ff = Math.max(0, Math.round((minEarlySuccessorBoundary - act.ef) * 100) / 100);
    }

    act.isCritical = act.tf === 0;
  });

  // 4. Critical path extraction (find all valid start-to-end critical chains)
  const criticalPathIds: string[] = [];
  activities.forEach((a) => {
    if (a.isCritical) criticalPathIds.push(a.id);
  });

  // Find continuous paths
  const criticalPaths: string[][] = [];
  function traceCriticalPaths(currentId: string, currentPath: string[]) {
    const succs = (successors.get(currentId) || []).filter(
      (s) => actMap.get(s.id)?.isCritical
    );
    if (succs.length === 0) {
      criticalPaths.push([...currentPath, currentId]);
      return;
    }
    for (const s of succs) {
      traceCriticalPaths(s.id, [...currentPath, currentId]);
    }
  }

  // Starting critical nodes (inDegree from other critical nodes is 0)
  const criticalStartNodes = activities.filter((act) => {
    if (!act.isCritical) return false;
    const hasCritPred = act.predecessors.some((p) => actMap.get(p.id)?.isCritical);
    return !hasCritPred;
  });

  criticalStartNodes.forEach((start) => {
    traceCriticalPaths(start.id, []);
  });

  // 5. PERT Variance Calculation along the primary critical path
  let criticalVarianceSum = 0;
  let totalExpectedDuration = 0;
  const primaryCriticalPath = criticalPaths[0] || criticalPathIds;
  primaryCriticalPath.forEach((id) => {
    const a = actMap.get(id);
    if (a) {
      criticalVarianceSum += a.variance || 0;
      totalExpectedDuration += a.expectedDuration || a.duration;
    }
  });

  const criticalStdDev = Math.sqrt(criticalVarianceSum);

  // Compute completion probabilities for target milestones
  const targetDays = targetDaysInput ?? Math.ceil(projectDuration);
  const zScore = criticalStdDev > 0 ? (targetDays - projectDuration) / criticalStdDev : 0;
  const probAtTarget = standardNormalCDF(zScore);

  const testMilestones = [
    Math.floor(projectDuration * 0.9),
    Math.round(projectDuration),
    Math.ceil(projectDuration * 1.05),
    Math.ceil(projectDuration * 1.1),
    Math.ceil(projectDuration * 1.2),
  ];
  if (!testMilestones.includes(targetDays)) testMilestones.push(targetDays);
  testMilestones.sort((a, b) => a - b);

  const completionProbabilities = testMilestones.map((t) => {
    const z = criticalStdDev > 0 ? (t - projectDuration) / criticalStdDev : 0;
    return {
      targetDays: t,
      zScore: Math.round(z * 100) / 100,
      probability: Math.round(standardNormalCDF(z) * 1000) / 10,
    };
  });

  // 6. Resource Loading Profile (Day-by-Day)
  const ceilDuration = Math.ceil(projectDuration);
  const resourceProfiles: Record<string, number[]> = {};
  const resourceBottlenecks: {
    resource: string;
    day: number;
    usage: number;
    limit: number;
  }[] = [];

  // Collect distinct resource roles
  const resourceRoles = Array.from(new Set(activities.map((a) => a.resourceRole).filter(Boolean)));
  resourceRoles.forEach((role) => {
    resourceProfiles[role] = new Array(ceilDuration + 1).fill(0);
  });

  activities.forEach((act) => {
    if (!act.resourceRole) return;
    const startDay = Math.floor(act.es);
    const endDay = Math.ceil(act.ef);
    const profile = resourceProfiles[act.resourceRole];
    if (profile) {
      for (let day = startDay; day < endDay && day <= ceilDuration; day++) {
        profile[day] = (profile[day] || 0) + act.resourceDemand;
      }
    }
  });

  // Check bottlenecks against resource limits
  Object.keys(resourceProfiles).forEach((role) => {
    const limit = resourceLimits[role] || 10;
    const profile = resourceProfiles[role];
    profile.forEach((usage, day) => {
      if (usage > limit) {
        resourceBottlenecks.push({
          resource: role,
          day,
          usage,
          limit,
        });
      }
    });
  });

  return {
    activities,
    result: {
      projectDuration: Math.round(projectDuration * 10) / 10,
      criticalPathIds,
      criticalPaths,
      hasCycle: false,
      totalExpectedDuration: Math.round(totalExpectedDuration * 10) / 10,
      criticalVarianceSum: Math.round(criticalVarianceSum * 100) / 100,
      criticalStdDev: Math.round(criticalStdDev * 100) / 100,
      completionProbabilities,
      resourceProfiles,
      resourceBottlenecks,
    },
  };
}

// Generate Adjacency Matrix A and Reachability Matrix R for planning algebra
export function generateGraphMatrices(activities: Activity[]) {
  const n = activities.length;
  const idToIndex = new Map<string, number>();
  activities.forEach((a, idx) => idToIndex.set(a.id, idx));

  // Adjacency Matrix (0 or 1, or edge lag/type)
  const adjMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const timeDistanceMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(-Infinity));

  for (let i = 0; i < n; i++) {
    timeDistanceMatrix[i][i] = 0;
  }

  activities.forEach((act) => {
    const toIdx = idToIndex.get(act.id);
    if (toIdx === undefined) return;

    act.predecessors.forEach((pred) => {
      const fromIdx = idToIndex.get(pred.id);
      if (fromIdx !== undefined) {
        adjMatrix[fromIdx][toIdx] = 1;
        const lag = pred.lag || 0;
        timeDistanceMatrix[fromIdx][toIdx] = lag + activities[fromIdx].duration;
      }
    });
  });

  // Reachability Matrix via Floyd-Warshall / Boolean Transitive Closure
  const reachabilityMatrix: number[][] = adjMatrix.map((row, i) =>
    row.map((val, j) => (i === j || val === 1 ? 1 : 0))
  );

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        reachabilityMatrix[i][j] =
          reachabilityMatrix[i][j] || (reachabilityMatrix[i][k] && reachabilityMatrix[k][j]) ? 1 : 0;
      }
    }
  }

  return {
    labels: activities.map((a) => a.id),
    names: activities.map((a) => a.name),
    adjMatrix,
    reachabilityMatrix,
  };
}
