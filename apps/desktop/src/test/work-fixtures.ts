import type {
  ActivityEvent,
  RunDetail,
  StageKind,
  WorkDetail,
} from '@/lib/ipc/work-contract';

// Canned transport examples shared by RTL and Playwright, never a product backend.
const id = (value: number) =>
  `01994000-0000-7000-8000-${value.toString(16).padStart(12, '0')}`;
const at = 1_789_300_800_000;
export const work = {
  id: id(1),
  title: 'Inspect durable history',
  objective: 'A local simulation',
  created_at: at,
  updated_at: at,
};
const kinds: StageKind[] = [
  'triage',
  'context',
  'analysis',
  'planning',
  'implementation',
  'verification',
  'review',
  'outcome',
];
const run = {
  id: id(10),
  work_item_id: work.id,
  status: 'completed' as const,
  created_at: at,
  started_at: at,
  completed_at: at + 16,
};
const plan = {
  id: id(11),
  run_id: run.id,
  revision_number: 1,
  created_at: at,
  stages: kinds.map((stage_kind, position) => ({ position, stage_kind })),
};
export const completedRun: RunDetail = {
  run,
  plan,
  stages: kinds.map((stage_kind, index) => ({
    id: id(100 + index),
    run_id: run.id,
    execution_plan_revision_id: plan.id,
    stage_kind,
    status: 'completed',
    started_at: at + index * 2,
    completed_at: at + index * 2 + 1,
    result: {
      kind: 'simulation',
      summary: `Milestone 1 simulation completed the ${stage_kind} stage. No AI or tools were used.`,
    },
    failure: null,
  })),
  events: [
    {
      id: id(200),
      sequence: 2,
      work_item_id: work.id,
      run_id: run.id,
      occurred_at: at,
      kind: {
        type: 'run.created',
        payload: { execution_plan_revision_id: plan.id },
      },
    },
    {
      id: id(201),
      sequence: 3,
      work_item_id: work.id,
      run_id: run.id,
      occurred_at: at,
      kind: { type: 'run.started', payload: {} },
    },
    ...kinds.flatMap((stage_kind, index): ActivityEvent[] => [
      {
        id: id(202 + index * 2),
        sequence: 4 + index * 2,
        work_item_id: work.id,
        run_id: run.id,
        occurred_at: at + index * 2,
        kind: {
          type: 'stage.started',
          payload: { stage_execution_id: id(100 + index), stage_kind },
        },
      },
      {
        id: id(203 + index * 2),
        sequence: 5 + index * 2,
        work_item_id: work.id,
        run_id: run.id,
        occurred_at: at + index * 2 + 1,
        kind: {
          type: 'stage.completed',
          payload: { stage_execution_id: id(100 + index), stage_kind },
        },
      },
    ]),
    {
      id: id(218),
      sequence: 20,
      work_item_id: work.id,
      run_id: run.id,
      occurred_at: at + 16,
      kind: { type: 'run.completed', payload: {} },
    },
  ],
};
export const createdDetail: WorkDetail = {
  work,
  runs: [],
  events: [
    {
      id: id(2),
      sequence: 1,
      work_item_id: work.id,
      run_id: null,
      occurred_at: at,
      kind: { type: 'work.created', payload: { title: work.title } },
    },
  ],
};
export const completedDetail: WorkDetail = {
  ...createdDetail,
  runs: [completedRun],
};
export const runningDetail: WorkDetail = {
  ...createdDetail,
  runs: [
    {
      ...completedRun,
      run: { ...run, status: 'running', completed_at: null },
      stages: [],
      events: completedRun.events.slice(0, 2),
    },
  ],
};
export const progressedDetail: WorkDetail = {
  ...createdDetail,
  runs: [
    {
      ...runningDetail.runs[0]!,
      stages: [
        completedRun.stages[0]!,
        {
          ...completedRun.stages[1]!,
          status: 'running',
          completed_at: null,
          result: null,
        },
      ],
      events: completedRun.events.slice(0, 5),
    },
  ],
};
const secondRun: RunDetail = {
  ...completedRun,
  run: {
    ...run,
    id: id(20),
    created_at: at + 100,
    started_at: at + 100,
    completed_at: at + 116,
  },
  plan: { ...plan, id: id(21), run_id: id(20), created_at: at + 100 },
  stages: completedRun.stages.map((stage, index) => ({
    ...stage,
    id: id(300 + index),
    run_id: id(20),
    execution_plan_revision_id: id(21),
    started_at: stage.started_at + 100,
    completed_at: stage.completed_at! + 100,
  })),
  events: completedRun.events.map((event, index) => {
    const kind = event.kind;
    const payload =
      kind.type === 'run.created'
        ? { execution_plan_revision_id: id(21) }
        : 'stage_kind' in kind.payload
          ? {
              ...kind.payload,
              stage_execution_id: id(
                300 + kinds.indexOf(kind.payload.stage_kind),
              ),
            }
          : kind.payload;
    return {
      ...event,
      id: id(400 + index),
      sequence: event.sequence + 19,
      run_id: id(20),
      occurred_at: event.occurred_at + 100,
      kind: { ...kind, payload } as ActivityEvent['kind'],
    };
  }),
};
export const twoRunsDetail: WorkDetail = {
  ...createdDetail,
  runs: [secondRun, completedRun],
};
export const secondRunningDetail: WorkDetail = {
  ...createdDetail,
  runs: [
    {
      ...secondRun,
      run: { ...secondRun.run, status: 'running', completed_at: null },
      stages: [],
      events: secondRun.events.slice(0, 2),
    },
    completedRun,
  ],
};
