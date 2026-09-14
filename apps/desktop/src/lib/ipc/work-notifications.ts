import { listen } from '@tauri-apps/api/event';
import { z } from 'zod';
import { idSchema } from './work-contract';

export const runtimeChangeSchema = z.strictObject({
  work_item_id: idSchema,
  run_id: idSchema.nullable(),
});
type RuntimeChange = z.infer<typeof runtimeChangeSchema>;

export function listenForWorkChanges(
  onChange: (change: RuntimeChange) => void,
  onError: (error: Error) => void,
) {
  return listen<unknown>('runtime-change', (event) => {
    const parsed = runtimeChangeSchema.safeParse(event.payload);
    if (!parsed.success) {
      onError(
        new Error(
          'The runtime returned an invalid change notification. Refresh Work to reload durable state.',
          { cause: parsed.error },
        ),
      );
      return;
    }
    onChange(parsed.data);
  });
}
