import { invoke, isTauri } from '@tauri-apps/api/core';
import { z } from 'zod';

const runtimeHealthSchema = z.strictObject({
  status: z.literal('healthy'),
  version: z.string().min(1),
  database: z.literal('ready'),
});

type RuntimeHealth = z.infer<typeof runtimeHealthSchema>;

export async function fetchRuntimeHealth(): Promise<RuntimeHealth> {
  if (!isTauri()) {
    throw new Error(
      'The desktop runtime is unavailable. Open Orynt in the desktop application.',
    );
  }

  let response: unknown;
  try {
    response = await invoke<unknown>('runtime_health');
  } catch (error: unknown) {
    throw new Error(
      typeof error === 'string'
        ? error
        : 'The runtime health request failed. Try again.',
      { cause: error },
    );
  }
  const parsed = runtimeHealthSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(
      'The runtime returned an invalid health response. Restart Orynt and try again.',
      { cause: parsed.error },
    );
  }
  return parsed.data;
}
