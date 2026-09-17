import { z } from 'zod';

export const idSchema = z.uuid({ version: 'v7' }).regex(/^[0-9a-f-]+$/);
const timestamp = z.number().int().min(0).max(8_640_000_000_000_000);
const executionStatus = z.enum(['running', 'completed', 'failed']);
const stageKindSchema = z.enum([
  'triage',
  'context',
  'analysis',
  'planning',
  'implementation',
  'verification',
  'review',
  'outcome',
]);
export type StageKind = z.infer<typeof stageKindSchema>;

export const createWorkSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(200, 'Use at most 200 characters.'),
  objective: z.string().max(10_000, 'Use at most 10,000 characters.'),
});
export type CreateWorkInput = z.infer<typeof createWorkSchema>;

export const workItemSchema = z
  .strictObject({
    id: idSchema,
    title: z.string().min(1).max(200),
    objective: z.string().max(10_000),
    created_at: timestamp,
    updated_at: timestamp,
  })
  .refine(
    (work) =>
      work.updated_at >= work.created_at && work.title === work.title.trim(),
  );

export const runSchema = z
  .strictObject({
    id: idSchema,
    work_item_id: idSchema,
    status: executionStatus,
    created_at: timestamp,
    started_at: timestamp,
    completed_at: timestamp.nullable(),
  })
  .refine(
    (run) =>
      run.started_at >= run.created_at &&
      (run.status === 'running'
        ? run.completed_at === null
        : run.completed_at !== null && run.completed_at >= run.started_at),
  );

const planSchema = z
  .strictObject({
    id: idSchema,
    run_id: idSchema,
    revision_number: z.number().int().positive(),
    created_at: timestamp,
    stages: z
      .array(
        z.strictObject({
          position: z.number().int().nonnegative(),
          stage_kind: stageKindSchema,
        }),
      )
      .min(1),
  })
  .refine(
    (plan) =>
      plan.stages.every((stage, index) => stage.position === index) &&
      new Set(plan.stages.map((stage) => stage.stage_kind)).size ===
        plan.stages.length,
  );

const stageSchema = z
  .strictObject({
    id: idSchema,
    run_id: idSchema,
    execution_plan_revision_id: idSchema,
    stage_kind: stageKindSchema,
    status: executionStatus,
    started_at: timestamp,
    completed_at: timestamp.nullable(),
    result: z
      .strictObject({
        kind: z.literal('simulation'),
        summary: z.string().min(1),
      })
      .nullable(),
    failure: z.string().min(1).nullable(),
  })
  .refine((stage) =>
    stage.status === 'running'
      ? stage.completed_at === null &&
        stage.result === null &&
        stage.failure === null
      : stage.completed_at !== null &&
        stage.completed_at >= stage.started_at &&
        (stage.status === 'completed'
          ? stage.result !== null && stage.failure === null
          : stage.result === null && stage.failure !== null),
  );

const stagePayload = z.strictObject({
  stage_execution_id: idSchema,
  stage_kind: stageKindSchema,
});
const eventKindSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('work.created'),
    payload: z.strictObject({ title: z.string().min(1) }),
  }),
  z.strictObject({
    type: z.literal('run.created'),
    payload: z.strictObject({ execution_plan_revision_id: idSchema }),
  }),
  z.strictObject({
    type: z.literal('run.started'),
    payload: z.strictObject({}),
  }),
  z.strictObject({ type: z.literal('stage.started'), payload: stagePayload }),
  z.strictObject({ type: z.literal('stage.completed'), payload: stagePayload }),
  z.strictObject({
    type: z.literal('stage.failed'),
    payload: stagePayload.extend({ message: z.string().min(1) }),
  }),
  z.strictObject({
    type: z.literal('run.failed'),
    payload: z.strictObject({ message: z.string().min(1) }),
  }),
  z.strictObject({
    type: z.literal('run.completed'),
    payload: z.strictObject({}),
  }),
]);

const eventSchema = z.strictObject({
  id: idSchema,
  sequence: z.number().int().positive(),
  work_item_id: idSchema,
  run_id: idSchema.nullable(),
  occurred_at: timestamp,
  kind: eventKindSchema,
});
const eventsSchema = z
  .array(eventSchema)
  .refine((events) =>
    events.every(
      (event, index) =>
        index === 0 || event.sequence > events[index - 1]!.sequence,
    ),
  );

const runDetailSchema = z
  .strictObject({
    run: runSchema,
    plan: planSchema,
    stages: z.array(stageSchema),
    events: eventsSchema,
  })
  .refine(
    ({ run, plan, stages, events }) =>
      plan.run_id === run.id &&
      new Set(stages.map((stage) => stage.stage_kind)).size === stages.length &&
      stages.every(
        (stage) =>
          stage.run_id === run.id &&
          stage.execution_plan_revision_id === plan.id &&
          plan.stages.some(
            (planned) => planned.stage_kind === stage.stage_kind,
          ),
      ) &&
      events.every(
        (event) =>
          event.run_id === run.id && event.work_item_id === run.work_item_id,
      ),
  );

export const workDetailSchema = z
  .strictObject({
    work: workItemSchema,
    runs: z.array(runDetailSchema),
    events: eventsSchema,
  })
  .refine(
    ({ work, runs, events }) =>
      runs.every((detail) => detail.run.work_item_id === work.id) &&
      new Set(runs.map((detail) => detail.run.id)).size === runs.length &&
      events.every(
        (event) =>
          event.work_item_id === work.id &&
          event.run_id === null &&
          event.kind.type === 'work.created',
      ),
  );

export const workListSchema = z.array(
  z
    .strictObject({ work: workItemSchema, latest_run: runSchema.nullable() })
    .refine(
      (summary) =>
        summary.latest_run === null ||
        summary.latest_run.work_item_id === summary.work.id,
    ),
);

export type WorkSummary = z.infer<typeof workListSchema>[number];
export type WorkDetail = z.infer<typeof workDetailSchema>;
export type RunDetail = WorkDetail['runs'][number];
export type ActivityEvent = z.infer<typeof eventSchema>;
