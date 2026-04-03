<script setup lang="ts">
import * as d3 from 'd3';
import { X, CheckCircle2 } from 'lucide-vue-next';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

import PersonaAvatar from 'frontend/src/components/PersonaAvatar.vue';

import type { PersonaItem } from 'core/src/personas/persona.types';
import type {
  InterventionHistoryEntry,
  SimulationWorkflow,
} from 'core/src/simulation/simulation.types';
import type { Workspace } from 'core/src/workspace/workspace.types';

const CORE_ISSUE_NODE_ID = 'core-issue';
const INTERVENTION_NODE_RADIUS = 12;
const INTERVENTION_RING_RADIUS = 100;
const INTERVENTION_LABEL_MAX_LENGTH = 25;
const VARIABLE_NODE_RADIUS = 5;
const STANCE_AXIS_NODE_RADIUS = 5;

type GraphNode = {
  id: string;
  name: string;
  group: 'issue' | 'persona' | 'intervention' | 'variable' | 'stanceAxis';
  radius: number;
  graphKey?: string;
  stance?: number;
  stanceColour?: string;
  dominantStanceKey?: string | null;
  personaId?: string;
  interventionEntry?: InterventionHistoryEntry;
  details: {
    uuid: string;
    created: string;
    properties: Record<string, string>;
    summary: string;
    labels: string[];
  };
};

type GraphLink = {
  source: string;
  target: string;
  value: number;
  type:
    | 'persona-issue'
    | 'persona-variable'
    | 'persona-stance'
    | 'intervention-issue'
    | 'intervention-variable';
  weight?: number;
  sign?: 'positive' | 'negative';
  step?: number;
  label?: string;
};

type SimulationEffectsMeta = {
  step: number;
  actorId: string;
  stance_shifts?: Record<string, number>;
  world_deltas?: Record<string, number>;
};

const props = defineProps<{
  workspace: Workspace;
  personasAll: PersonaItem[];
}>();

const selectedNode = ref<GraphNode | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const dimensions = ref({ width: 800, height: 800 });

const filterShowIssue = ref(true);
const filterShowLowStance = ref(true);
const filterShowHighStance = ref(true);
const filterStanceKeys = ref<Set<string>>(new Set());

const workflow = computed(() => props.workspace.workflow);
const isSimulation = computed(
  () =>
    workflow.value &&
    typeof workflow.value === 'object' &&
    (workflow.value as SimulationWorkflow).type === 'simulation'
);
const simulationWorkflow = computed(() =>
  isSimulation.value ? (workflow.value as SimulationWorkflow) : null
);

const availableStanceKeys = computed(() => {
  const keys = simulationWorkflow.value?.stances;
  return keys?.length ? keys : ['default'];
});

const STANCE_LEGEND_COLOURS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed'];

const stanceLegendItems = computed(() =>
  availableStanceKeys.value.map((key, index) => ({
    key,
    label: formatStanceKey(key),
    colour: STANCE_LEGEND_COLOURS[index % STANCE_LEGEND_COLOURS.length],
  }))
);

function formatStanceKey(key: string): string {
  const words = key.split('_');
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()
    )
    .join(' ');
}

function getNodeGroupLabel(group: GraphNode['group']): string {
  if (group === 'issue') {
    return 'Issue';
  }
  if (group === 'intervention') {
    return 'Intervention';
  }
  if (group === 'variable') {
    return 'Variable';
  }
  if (group === 'stanceAxis') {
    return 'Stance axis';
  }
  return 'Persona';
}

const NEUTRAL_STANCE = 5;

function resolveDominantStanceKey(
  stanceScores: Record<string, number> | undefined,
  stanceKeys: string[]
): string | null {
  const scores = stanceScores ?? {};
  const keys = stanceKeys.length ? stanceKeys : ['default'];
  let dominantKey: string | null = null;
  let maxDistance = -1;
  for (const key of keys) {
    const value = scores[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      continue;
    }
    const distance = Math.abs(value - NEUTRAL_STANCE);
    if (distance > maxDistance) {
      maxDistance = distance;
      dominantKey = key;
    }
  }
  return dominantKey ?? (keys.length ? keys[0] : null);
}

function resolveStanceDisplay(
  stanceScores: Record<string, number> | undefined,
  stanceKeys: string[] | undefined,
  activeKey?: string
): number {
  const scores = stanceScores ?? {};
  const keys = stanceKeys?.length ? stanceKeys : ['default'];
  if (activeKey && typeof scores[activeKey] === 'number') {
    return scores[activeKey];
  }
  const firstFound = keys.find(k => typeof scores[k] === 'number');
  if (firstFound !== undefined) {
    return scores[firstFound];
  }
  const values = Object.values(scores).filter((v): v is number => typeof v === 'number');
  if (values.length > 0) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  return NEUTRAL_STANCE;
}

const stanceKeyToColour = computed(() => {
  const items = stanceLegendItems.value;
  const map = new Map<string, string>();
  items.forEach(item => map.set(item.key, item.colour));
  return map;
});

const graphData = computed((): { nodes: GraphNode[]; links: GraphLink[] } => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const conversation = props.workspace.conversation;
  const personaIds = conversation?.persona_ids ?? [];
  const personaMetadata = conversation?.persona_metadata ?? {};
  const messages = conversation?.messages ?? [];
  const wf = simulationWorkflow.value;
  const coreIssue = wf?.core_issue ?? 'Current policy or issue under debate';
  const stanceKeys = wf?.stances ?? [];
  const keysForDominant = availableStanceKeys.value;
  const keyToColour = stanceKeyToColour.value;
  const primaryKey = keysForDominant[0] ?? 'default';
  const neutralColour = '#6b7280';
  const variableNodesByKey = new Map<string, GraphNode>();
  const stanceAxisNodesByKey = new Map<string, GraphNode>();

  nodes.push({
    id: CORE_ISSUE_NODE_ID,
    name: 'Core Issue',
    group: 'issue',
    radius: 14,
    details: {
      uuid: props.workspace.id,
      created: props.workspace.created_at ?? '',
      properties: {},
      summary: coreIssue,
      labels: ['Issue'],
    },
  });

  personaIds.forEach(personaId => {
    const persona = props.personasAll.find(p => p.id === personaId);
    const meta = personaMetadata[personaId] as
      | { stance_scores?: Record<string, number>; memories?: string[] }
      | undefined;
    const stance = resolveStanceDisplay(meta?.stance_scores, stanceKeys, primaryKey);
    const dominantKey = resolveDominantStanceKey(meta?.stance_scores, keysForDominant);
    const stanceColour = dominantKey
      ? (keyToColour.get(dominantKey) ?? neutralColour)
      : neutralColour;
    const name = persona?.name ?? personaId.slice(0, 8);
    nodes.push({
      id: personaId,
      name,
      group: 'persona',
      radius: 6,
      stance,
      stanceColour,
      dominantStanceKey: dominantKey ?? undefined,
      personaId,
      details: {
        uuid: personaId,
        created: '',
        properties: {},
        summary: meta?.memories?.slice(-1)[0] ?? '',
        labels: ['Persona'],
      },
    });
    links.push({
      source: personaId,
      target: CORE_ISSUE_NODE_ID,
      value: Math.abs(stance - 5) + 0.5,
      type: 'persona-issue',
    });
  });

  const variableKeys = Object.keys(wf?.variables ?? {}).filter(key => key.length > 0);
  variableKeys.forEach(key => {
    const nodeId = `variable-${key}`;
    const value = wf?.variables?.[key];
    const variableNode: GraphNode = {
      id: nodeId,
      name: formatStanceKey(key),
      group: 'variable',
      radius: VARIABLE_NODE_RADIUS,
      graphKey: key,
      details: {
        uuid: nodeId,
        created: '',
        properties: {},
        summary: typeof value === 'number' ? String(value) : '',
        labels: ['Variable'],
      },
    };
    variableNodesByKey.set(key, variableNode);
    nodes.push(variableNode);
  });

  keysForDominant.forEach(key => {
    const nodeId = `stance-${key}`;
    const stanceNode: GraphNode = {
      id: nodeId,
      name: formatStanceKey(key),
      group: 'stanceAxis',
      radius: STANCE_AXIS_NODE_RADIUS,
      graphKey: key,
      details: {
        uuid: nodeId,
        created: '',
        properties: {},
        summary: '',
        labels: ['Stance'],
      },
    };
    stanceAxisNodesByKey.set(key, stanceNode);
    nodes.push(stanceNode);
  });

  const interventionHistory = wf?.intervention_history ?? [];
  interventionHistory.forEach(entry => {
    nodes.push({
      id: `intervention-${entry.id}`,
      name: entry.title,
      group: 'intervention',
      radius: INTERVENTION_NODE_RADIUS,
      stanceColour: entry.status === 'pending' ? '#d97706' : '#059669',
      interventionEntry: entry,
      details: {
        uuid: entry.id,
        created: entry.injected_at,
        properties: {},
        summary: entry.description,
        labels: [entry.type, entry.status],
      },
    });
    links.push({
      source: `intervention-${entry.id}`,
      target: CORE_ISSUE_NODE_ID,
      value: 1,
      type: 'intervention-issue',
    });

    Object.entries(entry.effects ?? {}).forEach(([key, rawValue]) => {
      const numericValue =
        typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : null;
      if (numericValue == null) {
        return;
      }
      const variableNode = variableNodesByKey.get(key);
      if (!variableNode) {
        return;
      }
      const sign: 'positive' | 'negative' | undefined =
        numericValue > 0 ? 'positive' : numericValue < 0 ? 'negative' : undefined;
      links.push({
        source: `intervention-${entry.id}`,
        target: variableNode.id,
        value: Math.abs(numericValue),
        weight: Math.abs(numericValue),
        sign,
        step: entry.trigger_step,
        label: '',
        type: 'intervention-variable',
      });
    });
  });

  // Accumulate net deltas per persona per target so we emit one edge per pair, not one per message.
  const personaStanceAccumulator = new Map<string, number>();
  const personaVariableAccumulator = new Map<string, number>();

  messages.forEach(message => {
    const personaId = message.persona_id;
    if (!personaId || !personaIds.includes(personaId)) {
      return;
    }
    const meta = message._metadata;
    const simEffects = meta?.simulationEffects as SimulationEffectsMeta | undefined;
    if (!simEffects) {
      return;
    }

    const stanceShifts = simEffects.stance_shifts ?? {};
    Object.entries(stanceShifts).forEach(([key, delta]) => {
      if (typeof delta !== 'number' || Number.isNaN(delta) || delta === 0) {
        return;
      }
      if (!stanceAxisNodesByKey.has(key)) {
        return;
      }
      const edgeKey = `${personaId}||stance-${key}`;
      personaStanceAccumulator.set(edgeKey, (personaStanceAccumulator.get(edgeKey) ?? 0) + delta);
    });

    const worldDeltas = simEffects.world_deltas ?? {};
    Object.entries(worldDeltas).forEach(([key, delta]) => {
      if (typeof delta !== 'number' || Number.isNaN(delta) || delta === 0) {
        return;
      }
      if (!variableNodesByKey.has(key)) {
        return;
      }
      const edgeKey = `${personaId}||variable-${key}`;
      personaVariableAccumulator.set(
        edgeKey,
        (personaVariableAccumulator.get(edgeKey) ?? 0) + delta
      );
    });
  });

  // Aggregate repeated persona effects, but keep all materially meaningful relationships.
  const EDGE_SIGNIFICANCE_THRESHOLD = 3;
  type CausalEdgeCandidate = {
    edgeKey: string;
    netDelta: number;
    edgeType: 'persona-stance' | 'persona-variable';
  };

  const causalEdgeCandidates: CausalEdgeCandidate[] = [];

  personaStanceAccumulator.forEach((netDelta, edgeKey) => {
    causalEdgeCandidates.push({ edgeKey, netDelta, edgeType: 'persona-stance' });
  });

  personaVariableAccumulator.forEach((netDelta, edgeKey) => {
    causalEdgeCandidates.push({ edgeKey, netDelta, edgeType: 'persona-variable' });
  });

  causalEdgeCandidates
    .sort((a, b) => Math.abs(b.netDelta) - Math.abs(a.netDelta))
    .forEach(({ edgeKey, netDelta, edgeType }) => {
      if (Math.abs(netDelta) < EDGE_SIGNIFICANCE_THRESHOLD) {
        return;
      }
      const separatorIndex = edgeKey.indexOf('||');
      const personaId = edgeKey.slice(0, separatorIndex);
      const rawTargetKey = edgeKey.slice(separatorIndex + 2);
      const sign: 'positive' | 'negative' = netDelta > 0 ? 'positive' : 'negative';

      if (edgeType === 'persona-stance') {
        const targetKey = rawTargetKey.replace('stance-', '');
        const stanceNode = stanceAxisNodesByKey.get(targetKey);
        if (!stanceNode) {
          return;
        }
        links.push({
          source: personaId,
          target: stanceNode.id,
          value: Math.abs(netDelta),
          weight: Math.abs(netDelta),
          sign,
          label: '',
          type: 'persona-stance',
        });
      } else {
        const targetKey = rawTargetKey.replace('variable-', '');
        const variableNode = variableNodesByKey.get(targetKey);
        if (!variableNode) {
          return;
        }
        links.push({
          source: personaId,
          target: variableNode.id,
          value: Math.abs(netDelta),
          weight: Math.abs(netDelta),
          sign,
          label: '',
          type: 'persona-variable',
        });
      }
    });

  return { nodes, links };
});

const filteredGraphData = computed((): { nodes: GraphNode[]; links: GraphLink[] } => {
  const { nodes, links } = graphData.value;
  const includeNodeIds = new Set<string>();
  if (filterShowIssue.value) {
    includeNodeIds.add(CORE_ISSUE_NODE_ID);
  }
  const stanceFilter = filterStanceKeys.value;
  const hasStanceFilter = stanceFilter.size > 0;
  nodes.forEach(node => {
    if (node.group === 'issue') {
      return;
    }
    if (node.group === 'intervention') {
      includeNodeIds.add(node.id);
      return;
    }
    if (node.group === 'variable') {
      includeNodeIds.add(node.id);
      return;
    }
    if (node.group === 'stanceAxis') {
      if (!hasStanceFilter || (node.graphKey != null && stanceFilter.has(node.graphKey))) {
        includeNodeIds.add(node.id);
      }
      return;
    }
    const passesStanceFilter =
      !hasStanceFilter ||
      (node.dominantStanceKey != null && stanceFilter.has(node.dominantStanceKey));
    if (!passesStanceFilter) {
      return;
    }
    const stance = node.stance ?? 5;
    const isLow = stance <= 5;
    const isHigh = stance >= 5;
    if ((isLow && filterShowLowStance.value) || (isHigh && filterShowHighStance.value)) {
      includeNodeIds.add(node.id);
    }
  });
  const filteredNodes = nodes.filter(n => includeNodeIds.has(n.id));
  const filteredLinks = links.filter(
    l => includeNodeIds.has(String(l.source)) && includeNodeIds.has(String(l.target))
  );
  return { nodes: filteredNodes, links: filteredLinks };
});

function toggleStanceFilter(key: string): void {
  const next = new Set(filterStanceKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  filterStanceKeys.value = next;
}

function isStanceFilterActive(key: string): boolean {
  const stanceFilter = filterStanceKeys.value;
  if (stanceFilter.size === 0) {
    return true;
  }
  return stanceFilter.has(key);
}

const dashboardVariables = computed(() => {
  const wf = simulationWorkflow.value;
  if (!wf?.variables) {
    return null;
  }
  return wf.variables as Record<string, number | string | boolean>;
});

const VARIABLE_CHART_COLOURS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed'];

type VariableChartSeries = {
  key: string;
  label: string;
  colour: string;
  points: { step: number; value: number }[];
};

const variableChartSeries = computed((): VariableChartSeries[] => {
  const wf = simulationWorkflow.value;
  if (!wf) {
    return [];
  }
  const history = wf.variable_history ?? [];
  const current = wf.variables ?? {};
  const stepsAndVars =
    history.length > 0 ? history : [{ step: wf.current_step, variables: { ...current } }];
  const sorted = [...stepsAndVars].sort((a, b) => a.step - b.step);
  const numericKeys = new Set<string>();
  sorted.forEach(({ variables }) => {
    Object.entries(variables).forEach(([k, v]) => {
      if (typeof v === 'number' && !Number.isNaN(v)) {
        numericKeys.add(k);
      }
    });
  });
  return Array.from(numericKeys)
    .map((key, index) => ({
      key,
      label: formatStanceKey(key),
      colour: VARIABLE_CHART_COLOURS[index % VARIABLE_CHART_COLOURS.length],
      points: sorted
        .map(({ step, variables }) => ({ step, value: variables[key] }))
        .filter(
          (p): p is { step: number; value: number } =>
            typeof p.value === 'number' && !Number.isNaN(p.value)
        ),
    }))
    .filter(series => series.points.length > 0);
});

const variableChartRef = ref<HTMLDivElement | null>(null);
const variableChartHeight = 200;

const primaryStanceLabels = computed(() => {
  const key = availableStanceKeys.value[0];
  if (!key || key === 'default') {
    return { low: 'Opposed', high: 'Supportive' };
  }
  const formatted = formatStanceKey(key);
  return {
    low: `Low ${formatted.toLowerCase()}`,
    high: `High ${formatted.toLowerCase()}`,
  };
});

const dashboardPersonas = computed(() => {
  const personaIds = props.workspace.conversation?.persona_ids ?? [];
  const meta = props.workspace.conversation?.persona_metadata ?? {};
  return personaIds.map(personaId => {
    const persona = props.personasAll.find(p => p.id === personaId);
    const m = meta[personaId] as { stance_scores?: Record<string, number> } | undefined;
    const stanceScores = (m?.stance_scores ?? {}) as Record<string, number>;
    return {
      id: personaId,
      name: persona?.name ?? personaId.slice(0, 8),
      handle: persona?.username ?? `@${personaId.slice(0, 8)}`,
      stanceScores,
    };
  });
});

const pendingInterventions = computed(() => {
  const history = simulationWorkflow.value?.intervention_history ?? [];
  return history.filter(entry => entry.status === 'pending');
});

const appliedInterventions = computed(() => {
  const history = simulationWorkflow.value?.intervention_history ?? [];
  return history.filter(entry => entry.status === 'applied');
});

function formatInterventionEffects(effects: Record<string, unknown>): string {
  if (!effects || typeof effects !== 'object') {
    return '';
  }
  return Object.entries(effects)
    .map(([key, value]) => `${formatStanceKey(key)}: ${String(value)}`)
    .join(', ');
}

let resizeObserver: ResizeObserver | null = null;
let simulation: d3.Simulation<
  d3.SimulationNodeDatum & GraphNode,
  d3.SimulationLinkDatum<d3.SimulationNodeDatum & GraphNode>
> | null = null;

function runSimulation(nodes: GraphNode[], links: GraphLink[]) {
  if (!svgRef.value || dimensions.value.width === 0) {
    return;
  }
  const svg = d3.select(svgRef.value);
  svg.selectAll('*').remove();

  const width = dimensions.value.width;
  const height = dimensions.value.height;

  const defs = svg.append('defs');
  const pattern = defs
    .append('pattern')
    .attr('id', 'grid')
    .attr('width', 40)
    .attr('height', 40)
    .attr('patternUnits', 'userSpaceOnUse');
  pattern.append('circle').attr('cx', 2).attr('cy', 2).attr('r', 1).attr('fill', '#e5e7eb');
  svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#grid)');

  const g = svg.append('g');
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      g.attr('transform', String(event.transform));
    });
  svg.call(zoom);
  svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));

  if (simulation) {
    simulation.stop();
  }

  const nodesWithPosition = nodes.map(n => ({ ...n })) as (GraphNode & d3.SimulationNodeDatum)[];
  const interventionNodes = nodesWithPosition.filter(n => n.group === 'intervention');
  for (let index = 0; index < interventionNodes.length; index++) {
    const node = interventionNodes[index];
    const angle = (index / Math.max(1, interventionNodes.length)) * 2 * Math.PI - Math.PI / 2;
    node.fx = INTERVENTION_RING_RADIUS * Math.cos(angle);
    node.fy = INTERVENTION_RING_RADIUS * Math.sin(angle);
  }
  const linksWithNodes = links.map(l => ({
    ...l,
    source: l.source,
    target: l.target,
  }));

  simulation = d3
    .forceSimulation(nodesWithPosition)
    .force(
      'link',
      d3
        .forceLink(linksWithNodes)
        .id((d: d3.SimulationNodeDatum) => (d as GraphNode).id)
        .distance(40)
    )
    .force('charge', d3.forceManyBody().strength(-60))
    .force('center', d3.forceCenter(0, 0))
    .force(
      'y',
      d3
        .forceY<GraphNode & d3.SimulationNodeDatum>(d => {
          if (d.group === 'intervention') {
            return -80;
          }
          if (d.group === 'variable') {
            return 0;
          }
          if (d.group === 'stanceAxis') {
            return 40;
          }
          if (d.group === 'persona') {
            return 100;
          }
          return 0;
        })
        .strength(0.08)
    )
    .force(
      'x',
      d3
        .forceX<GraphNode & d3.SimulationNodeDatum>(d => {
          if (d.group === 'intervention') {
            return -60;
          }
          if (d.group === 'variable') {
            return 0;
          }
          if (d.group === 'stanceAxis') {
            return 80;
          }
          return 0;
        })
        .strength(0.06)
    )
    .force(
      'collide',
      d3.forceCollide((d: GraphNode & d3.SimulationNodeDatum) => (d.radius ?? 5) + 4).iterations(2)
    );

  const link = g
    .append('g')
    .selectAll('line')
    .data(linksWithNodes)
    .join('line')
    .attr('class', 'graph-link')
    .attr('stroke', (d: GraphLink & { value: number }) => {
      if (d.type === 'intervention-variable') {
        if (d.sign === 'positive') {
          return '#16a34a';
        }
        if (d.sign === 'negative') {
          return '#dc2626';
        }
        return '#7c3aed';
      }
      if (d.type === 'persona-variable' || d.type === 'persona-stance') {
        if (d.sign === 'positive') {
          return '#22c55e';
        }
        if (d.sign === 'negative') {
          return '#f97316';
        }
        return '#60a5fa';
      }
      if (d.type === 'intervention-issue') {
        return '#7c3aed';
      }
      return '#fca5a5';
    })
    .attr('stroke-width', (d: GraphLink & { value: number; weight?: number }) => {
      const base = d.weight != null ? Math.abs(d.weight) : d.value;
      return Math.max(0.8, Math.min(4, Math.sqrt(base)));
    })
    .attr('stroke-opacity', (d: GraphLink & { value: number }) => {
      if (d.type === 'intervention-variable' || d.type === 'intervention-issue') {
        return 0.85;
      }
      if (d.type === 'persona-variable' || d.type === 'persona-stance') {
        return 0.2;
      }
      return 0.45;
    });

  const personaAndIssueNodes = nodesWithPosition.filter(
    (d: GraphNode & d3.SimulationNodeDatum) => d.group !== 'intervention'
  );
  const node = g
    .append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .selectAll('circle')
    .data(personaAndIssueNodes)
    .join('circle')
    .attr('class', 'graph-node')
    .attr('r', (d: GraphNode & d3.SimulationNodeDatum) => d.radius ?? 5)
    .attr('fill', (d: GraphNode & d3.SimulationNodeDatum) => {
      if (d.group === 'issue') {
        return '#6b7280';
      }
      return d.stanceColour ?? '#6b7280';
    })
    .attr('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: GraphNode & d3.SimulationNodeDatum) => {
      selectedNode.value = d as GraphNode;
      event.stopPropagation();
    });

  const interventionNodeElements = g
    .append('g')
    .attr('stroke', '#1f2937')
    .attr('stroke-width', 2.5)
    .selectAll('circle')
    .data(interventionNodes)
    .join('circle')
    .attr('class', 'graph-node graph-node-intervention')
    .attr('r', INTERVENTION_NODE_RADIUS)
    .attr('fill', (d: GraphNode & d3.SimulationNodeDatum) => d.stanceColour ?? '#6b7280')
    .attr('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: GraphNode & d3.SimulationNodeDatum) => {
      selectedNode.value = d as GraphNode;
      event.stopPropagation();
    });

  const nodesWithLabels = nodesWithPosition.filter(
    (d: GraphNode & d3.SimulationNodeDatum) =>
      d.group === 'intervention' || d.group === 'issue' || d.group === 'variable'
  );
  const labels = g
    .append('g')
    .selectAll('text')
    .data(nodesWithLabels)
    .join('text')
    .attr('class', 'graph-label')
    .text((d: GraphNode & d3.SimulationNodeDatum) => {
      if (d.group === 'intervention') {
        const name = d.name ?? '';
        return name.length > INTERVENTION_LABEL_MAX_LENGTH
          ? name.slice(0, INTERVENTION_LABEL_MAX_LENGTH) + '\u2026'
          : name;
      }
      return d.name;
    })
    .attr('font-size', (d: GraphNode & d3.SimulationNodeDatum) =>
      d.group === 'intervention' ? '9px' : '8px'
    )
    .attr('fill', '#4b5563')
    .attr('dx', (d: GraphNode & d3.SimulationNodeDatum) => (d.group === 'intervention' ? 10 : 8))
    .attr('dy', (d: GraphNode & d3.SimulationNodeDatum) => (d.group === 'intervention' ? 0 : 3));

  simulation.on('tick', () => {
    const selected = selectedNode.value;
    const selectedId = selected?.id ?? null;
    const neighbourIds = new Set<string>();
    if (selectedId) {
      linksWithNodes.forEach(l => {
        const src = String(l.source);
        const tgt = String(l.target);
        if (src === selectedId) {
          neighbourIds.add(tgt);
        }
        if (tgt === selectedId) {
          neighbourIds.add(src);
        }
      });
    }

    link
      .attr('x1', (d: unknown) => (d as { source: { x: number }; target: { x: number } }).source.x)
      .attr('y1', (d: unknown) => (d as { source: { y: number }; target: { y: number } }).source.y)
      .attr('x2', (d: unknown) => (d as { source: { x: number }; target: { x: number } }).target.x)
      .attr('y2', (d: unknown) => (d as { source: { y: number }; target: { y: number } }).target.y)
      .attr('stroke-opacity', (d: GraphLink & { value: number }) => {
        const baseOpacity =
          d.type === 'intervention-variable' || d.type === 'intervention-issue'
            ? 0.85
            : d.type === 'persona-variable' || d.type === 'persona-stance'
              ? 0.2
              : 0.45;
        if (!selectedId) {
          return baseOpacity;
        }
        const src = String(d.source);
        const tgt = String(d.target);
        const isNeighbour =
          src === selectedId ||
          tgt === selectedId ||
          neighbourIds.has(src) ||
          neighbourIds.has(tgt);
        return isNeighbour ? Math.min(baseOpacity * 2.5, 0.9) : baseOpacity * 0.1;
      });
    node
      .attr('cx', (d: GraphNode & d3.SimulationNodeDatum) => d.x ?? 0)
      .attr('cy', (d: GraphNode & d3.SimulationNodeDatum) => d.y ?? 0)
      .attr('fill-opacity', (d: GraphNode & d3.SimulationNodeDatum) => {
        if (!selectedId) {
          return 1;
        }
        const isSelected = d.id === selectedId;
        const isNeighbour = neighbourIds.has(d.id);
        return isSelected || isNeighbour ? 1 : 0.2;
      });
    interventionNodeElements
      .attr('cx', (d: GraphNode & d3.SimulationNodeDatum) => d.x ?? 0)
      .attr('cy', (d: GraphNode & d3.SimulationNodeDatum) => d.y ?? 0)
      .attr('fill-opacity', (d: GraphNode & d3.SimulationNodeDatum) => {
        if (!selectedId) {
          return 1;
        }
        const isSelected = d.id === selectedId;
        const isNeighbour = neighbourIds.has(d.id);
        return isSelected || isNeighbour ? 1 : 0.2;
      });
    labels
      .attr('x', (d: GraphNode & d3.SimulationNodeDatum) => {
        const base = (d.x ?? 0) + (d.group === 'intervention' ? 10 : 8);
        return base;
      })
      .attr('y', (d: GraphNode & d3.SimulationNodeDatum) => d.y ?? 0)
      .attr('fill-opacity', (d: GraphNode & d3.SimulationNodeDatum) => {
        if (!selectedId) {
          return 1;
        }
        const isSelected = d.id === selectedId;
        const isNeighbour = neighbourIds.has(d.id);
        return isSelected || isNeighbour ? 1 : 0.15;
      });
  });
}

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        dimensions.value = { width, height };
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
  }
  if (simulation) {
    simulation.stop();
  }
});

watch(
  [dimensions, filteredGraphData],
  () => {
    const { nodes, links } = filteredGraphData.value;
    if (nodes.length > 0) {
      runSimulation(nodes, links);
    }
  },
  { deep: true }
);

function drawVariableChart() {
  const container = variableChartRef.value;
  const series = variableChartSeries.value;
  if (!container || series.length === 0) {
    return;
  }
  const width = container.clientWidth;
  if (width <= 0) {
    return;
  }

  const margin = { top: 12, right: 12, bottom: 24, left: 36 };
  const height = variableChartHeight - margin.top - margin.bottom;
  const innerWidth = width - margin.left - margin.right;

  const allPoints = series.flatMap(s => s.points);
  const steps = allPoints.map(p => p.step);
  const values = allPoints.map(p => p.value);
  const stepExtent = d3.extent(steps) as [number, number];
  const valueExtent = d3.extent(values) as [number, number];
  const stepMin = stepExtent[0] ?? 0;
  const stepMax = stepExtent[1] ?? stepMin;
  const stepDomainMin = stepMax === stepMin ? stepMin - 0.5 : stepMin;
  const stepDomainMax = stepMax === stepMin ? stepMax + 0.5 : stepMax;
  const valueMin = valueExtent[0] ?? 0;
  const valueMax = valueExtent[1] ?? 100;
  const padding = (valueMax - valueMin) * 0.05 || 1;
  const valueMinPadded = valueMin - padding;
  const valueMaxPadded = valueMax + padding;

  const xScale = d3.scaleLinear().domain([stepDomainMin, stepDomainMax]).range([0, innerWidth]);
  const yScale = d3.scaleLinear().domain([valueMinPadded, valueMaxPadded]).range([height, 0]);

  const line = d3
    .line<{ step: number; value: number }>()
    .x(d => xScale(d.step))
    .y(d => yScale(d.value));

  const svgElement = d3
    .select(container)
    .selectAll('svg')
    .data([1])
    .join('svg')
    .attr('width', width)
    .attr('height', variableChartHeight);

  const gEnter = svgElement
    .selectAll('g.chart-inner')
    .data([1])
    .join('g')
    .attr('class', 'chart-inner')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  gEnter.selectAll('*').remove();

  const xAxis = d3.axisBottom(xScale).ticks(Math.min(stepMax - stepMin + 1, 10));
  const yAxis = d3.axisLeft(yScale);

  gEnter
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .attr('class', 'text-muted-foreground');
  gEnter.append('g').call(yAxis).attr('class', 'text-muted-foreground');

  series.forEach(s => {
    gEnter
      .append('path')
      .datum(s.points)
      .attr('fill', 'none')
      .attr('stroke', s.colour)
      .attr('stroke-width', 2)
      .attr('d', line);

    gEnter
      .selectAll(`circle.chart-point-${s.key}`)
      .data(s.points)
      .join('circle')
      .attr('class', `chart-point chart-point-${s.key}`)
      .attr('r', 3)
      .attr('cx', d => xScale(d.step))
      .attr('cy', d => yScale(d.value))
      .attr('fill', s.colour);
  });
}

watch([variableChartRef, variableChartSeries], () => drawVariableChart(), {
  flush: 'post',
  deep: true,
});

const clearSelection = () => {
  selectedNode.value = null;
};
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
    <div class="relative flex h-full w-[60%] flex-col border-r border-border bg-background">
      <div ref="containerRef" class="relative flex-1" @click="clearSelection">
        <svg ref="svgRef" class="h-full w-full outline-none" />
      </div>

      <div
        v-if="selectedNode"
        class="animate-in fade-in slide-in-from-right-4 absolute right-4 top-16 z-20 flex w-80 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl duration-200"
      >
        <div class="flex items-center justify-between border-b border-border p-4">
          <div class="flex items-center gap-2">
            <PersonaAvatar
              v-if="selectedNode.group === 'persona'"
              :hash-key="selectedNode.personaId ?? selectedNode.id"
            />
            <span class="font-medium text-foreground">{{ selectedNode.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium border border-border bg-muted text-muted-foreground"
            >
              {{ getNodeGroupLabel(selectedNode.group) }}
            </span>
            <button
              type="button"
              class="cursor-pointer text-muted-foreground hover:text-muted-foreground"
              @click="clearSelection"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
        <div class="max-h-[60vh] flex flex-col gap-4 overflow-y-auto p-4">
          <template v-if="selectedNode.group === 'intervention' && selectedNode.interventionEntry">
            <div class="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
              <span class="text-muted-foreground">Status</span>
              <span class="text-foreground">{{ selectedNode.interventionEntry.status }}</span>
              <span class="text-muted-foreground">Type</span>
              <span class="text-foreground">{{ selectedNode.interventionEntry.type }}</span>
              <span
                v-if="selectedNode.interventionEntry.trigger_step !== undefined"
                class="text-muted-foreground"
                >Trigger step</span
              >
              <span
                v-if="selectedNode.interventionEntry.trigger_step !== undefined"
                class="text-foreground"
                >{{ selectedNode.interventionEntry.trigger_step }}</span
              >
              <span
                v-if="selectedNode.interventionEntry.applied_step !== undefined"
                class="text-muted-foreground"
                >Applied step</span
              >
              <span
                v-if="selectedNode.interventionEntry.applied_step !== undefined"
                class="text-foreground"
                >{{ selectedNode.interventionEntry.applied_step }}</span
              >
            </div>
            <div v-if="selectedNode.interventionEntry.description">
              <h3 class="mb-1 text-sm font-medium text-foreground">Description</h3>
              <p class="text-sm leading-relaxed text-muted-foreground">
                {{ selectedNode.interventionEntry.description }}
              </p>
            </div>
            <div v-if="formatInterventionEffects(selectedNode.interventionEntry.effects)">
              <h3 class="mb-1 text-sm font-medium text-foreground">Effects</h3>
              <p class="text-xs font-mono text-muted-foreground">
                {{ formatInterventionEffects(selectedNode.interventionEntry.effects) }}
              </p>
            </div>
          </template>
          <template v-else>
            <div class="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
              <template
                v-if="selectedNode.group === 'persona' && selectedNode.stance !== undefined"
              >
                <span class="text-muted-foreground"
                  >{{
                    availableStanceKeys[0] === 'default'
                      ? 'Stance'
                      : formatStanceKey(availableStanceKeys[0])
                  }}:</span
                >
                <span class="text-foreground">{{ selectedNode.stance }}/10</span>
              </template>
              <template v-else-if="selectedNode.group === 'variable'">
                <span class="text-muted-foreground">Value</span>
                <span class="text-foreground">{{ selectedNode.details.summary || 'Unknown' }}</span>
                <span v-if="selectedNode.graphKey" class="text-muted-foreground">Key</span>
                <span v-if="selectedNode.graphKey" class="text-foreground">{{
                  selectedNode.graphKey
                }}</span>
              </template>
              <template v-else-if="selectedNode.group === 'stanceAxis'">
                <span class="text-muted-foreground">Axis key</span>
                <span class="text-foreground">{{
                  selectedNode.graphKey ?? selectedNode.name
                }}</span>
              </template>
            </div>
            <div v-if="selectedNode.group === 'persona' && selectedNode.details.summary">
              <h3 class="mb-1 text-sm font-medium text-foreground">Summary</h3>
              <p class="text-sm leading-relaxed text-muted-foreground">
                {{ selectedNode.details.summary }}
              </p>
            </div>
          </template>
        </div>
      </div>

      <div
        class="absolute max-w-xl bottom-4 left-4 z-10 rounded-lg border border-border bg-background/90 p-3 shadow-sm backdrop-blur-sm"
      >
        <h3 class="mb-2 text-sm font-medium tracking-wider text-muted-foreground">
          Persona stances
        </h3>
        <div class="flex flex-wrap items-center gap-3 text-sm text-foreground">
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-opacity hover:opacity-80"
            :class="filterShowIssue ? 'opacity-100' : 'opacity-50'"
            @click="filterShowIssue = !filterShowIssue"
          >
            <span class="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            <span>Issue</span>
          </button>
          <button
            v-for="item in stanceLegendItems"
            :key="item.key"
            type="button"
            class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-opacity hover:opacity-80"
            :class="isStanceFilterActive(item.key) ? 'opacity-100' : 'opacity-50'"
            @click="toggleStanceFilter(item.key)"
          >
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :style="{ backgroundColor: item.colour }"
            />
            <span class="text-muted-foreground">{{ item.label }}</span>
          </button>
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-opacity hover:opacity-80"
            :class="filterShowLowStance ? 'opacity-100' : 'opacity-50'"
            @click="filterShowLowStance = !filterShowLowStance"
          >
            <span class="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span>{{ primaryStanceLabels.low }}</span>
          </button>
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-opacity hover:opacity-80"
            :class="filterShowHighStance ? 'opacity-100' : 'opacity-50'"
            @click="filterShowHighStance = !filterShowHighStance"
          >
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>{{ primaryStanceLabels.high }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="flex h-full w-[40%] flex-col overflow-y-auto bg-muted/30">
      <div class="flex flex-col gap-6 p-4 pt-20">
        <div class="rounded-xl border border-border bg-background p-5 shadow-sm">
          <p class="mb-4 text-sm text-muted-foreground">
            Simulation workflow state and world variables. Personas are linked to the core issue by
            stance.
          </p>
          <div
            v-if="dashboardVariables"
            class="grid grid-cols-3 divide-x divide-border text-center"
          >
            <template v-for="(val, key) in dashboardVariables" :key="key">
              <div class="flex flex-col">
                <span class="text-3xl font-bold text-foreground">{{ val }}</span>
                <span class="mt-1 text-xs text-muted-foreground">{{ formatStanceKey(key) }}</span>
              </div>
            </template>
          </div>
          <div v-else class="text-sm text-muted-foreground">No variables yet.</div>
          <div v-if="simulationWorkflow && variableChartSeries.length > 0" class="mt-4">
            <div
              ref="variableChartRef"
              class="w-full"
              :style="{ height: `${variableChartHeight}px` }"
            />
            <div class="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span v-for="s in variableChartSeries" :key="s.key" class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: s.colour }"
                />
                {{ s.label }}
              </span>
            </div>
          </div>
          <p
            v-else-if="
              simulationWorkflow && dashboardVariables && Object.keys(dashboardVariables).length > 0
            "
            class="mt-4 text-sm text-muted-foreground"
          >
            Run simulation to see change over time.
          </p>
        </div>

        <div
          v-if="simulationWorkflow"
          class="flex flex-col gap-4 rounded-xl border border-border bg-background p-5 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-foreground">Simulation</h2>
              <div class="mt-1 font-mono text-xs text-muted-foreground">
                Step {{ simulationWorkflow.current_step }} / {{ simulationWorkflow.max_steps }}
              </div>
            </div>
            <span
              class="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              <CheckCircle2 class="h-3 w-3" />
              {{ simulationWorkflow.status }}
            </span>
          </div>
          <div class="flex flex-col justify-between border-t border-border pt-2 gap-2">
            <span class="text-sm font-medium text-foreground">Core issue</span>
            <div class="flex items-center gap-1 text-sm text-muted-foreground">
              {{ simulationWorkflow.core_issue }}
            </div>
          </div>
        </div>

        <div
          v-if="pendingInterventions.length > 0"
          class="flex flex-col gap-3 rounded-xl border border-border bg-background p-5 shadow-sm"
        >
          <h2 class="text-lg font-semibold text-foreground">Pending interventions</h2>
          <ul class="flex flex-col gap-3">
            <li
              v-for="entry in pendingInterventions"
              :key="entry.id"
              class="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium text-foreground">{{ entry.title }}</span>
                <span
                  class="shrink-0 rounded px-2 py-0.5 text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800"
                >
                  {{ entry.type }}
                </span>
              </div>
              <p v-if="entry.trigger_step !== undefined" class="text-xs text-muted-foreground">
                Trigger step: {{ entry.trigger_step }}
              </p>
              <p v-if="entry.description" class="text-sm text-muted-foreground">
                {{ entry.description }}
              </p>
              <p
                v-if="formatInterventionEffects(entry.effects)"
                class="text-xs font-mono text-muted-foreground"
              >
                Effects: {{ formatInterventionEffects(entry.effects) }}
              </p>
            </li>
          </ul>
        </div>

        <div
          v-if="appliedInterventions.length > 0"
          class="flex flex-col gap-3 rounded-xl border border-border bg-background p-5 shadow-sm"
        >
          <h2 class="text-lg font-semibold text-foreground">Applied interventions</h2>
          <ul class="flex flex-col gap-3">
            <li
              v-for="entry in appliedInterventions"
              :key="entry.id"
              class="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium text-foreground">{{ entry.title }}</span>
                <span
                  class="shrink-0 rounded px-2 py-0.5 text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-800"
                >
                  {{ entry.type }}
                </span>
              </div>
              <p v-if="entry.applied_step !== undefined" class="text-xs text-muted-foreground">
                Applied at step: {{ entry.applied_step }}
              </p>
              <p v-if="entry.description" class="text-sm text-muted-foreground">
                {{ entry.description }}
              </p>
              <p
                v-if="formatInterventionEffects(entry.effects)"
                class="text-xs font-mono text-muted-foreground"
              >
                Effects: {{ formatInterventionEffects(entry.effects) }}
              </p>
            </li>
          </ul>
        </div>

        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-foreground">Personas</h2>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="agent in dashboardPersonas"
              :key="agent.id"
              class="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div class="flex items-center gap-3">
                <PersonaAvatar :hash-key="agent.id" />
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-foreground">{{ agent.name }}</h3>
                  </div>
                  <template v-if="Object.keys(agent.stanceScores).length === 0">
                    <span class="text-xs text-muted-foreground">Stance –/10</span>
                  </template>
                  <template
                    v-else-if="
                      Object.keys(agent.stanceScores).length === 1 &&
                      'default' in agent.stanceScores
                    "
                  >
                    <span class="text-xs text-muted-foreground"
                      >Stance {{ agent.stanceScores.default }}/10</span
                    >
                  </template>
                  <template v-else>
                    <span
                      v-for="(score, key) in agent.stanceScores"
                      :key="key"
                      class="text-xs text-muted-foreground"
                    >
                      {{ formatStanceKey(key) }}: {{ score }}/10
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
