import { invoke, isTauri } from '@tauri-apps/api/core';
import { z } from 'zod';
import {
  createWorkSchema,
  idSchema,
  runSchema,
  workDetailSchema,
  workItemSchema,
  workListSchema,
  type CreateWorkInput,
} from './work-contract';

const commandErrorSchema = z.strictObject({
  code: z.enum([
    'validation',
    'not_found',
    'conflict',
    'persistence',
    'execution',
  ]),
  message: z.string().min(1),
});

export class WorkCommandError extends Error {
  constructor(
    readonly code: z.infer<typeof commandErrorSchema>['code'],
    message: string,
  ) {
    super(message);
  }
}

async function command<T>(
  name: string,
  schema: z.ZodType<T>,
  request?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri())
    throw new Error(
      'The desktop runtime is unavailable. Open Orynt in the desktop application.',
    );
  let response: unknown;
  try {
    response = await invoke<unknown>(name, request ? { request } : undefined);
  } catch (error: unknown) {
    const parsed = commandErrorSchema.safeParse(error);
    if (parsed.success)
      throw new WorkCommandError(parsed.data.code, parsed.data.message);
    throw new Error(
      'The runtime returned an invalid command error. Restart Orynt and try again.',
      { cause: error },
    );
  }
  const parsed = schema.safeParse(response);
  if (!parsed.success)
    throw new Error(
      'The runtime returned an invalid Work response. Restart Orynt and try again.',
      { cause: parsed.error },
    );
  return parsed.data;
}

export function listWork() {
  return command('list_work', workListSchema);
}
export function createWork(input: CreateWorkInput) {
  return command('create_work', workItemSchema, createWorkSchema.parse(input));
}
export function getWorkDetail(id: string) {
  return command('get_work_detail', workDetailSchema, {
    work_item_id: idSchema.parse(id),
  });
}
export function startSimulatedRun(id: string) {
  return command('start_simulated_run', runSchema, {
    work_item_id: idSchema.parse(id),
  });
}
