import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isTauri } from '@tauri-apps/api/core';
import { listenForWorkChanges } from '@/lib/ipc/work-notifications';
import { Button } from '@/components/ui/button';
import { workKeys } from './work-queries';

export function RuntimeUpdates() {
  const client = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listenForWorkChanges(
      (change) => {
        if (disposed) return;
        void client.invalidateQueries({ queryKey: workKeys.list });
        void client.invalidateQueries({
          queryKey: workKeys.detail(change.work_item_id),
        });
      },
      (failure) => {
        if (!disposed) setError(failure);
      },
    )
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
        // Close the gap between the initial query and listener registration.
        void client.invalidateQueries({ queryKey: workKeys.all });
      })
      .catch((cause: unknown) => {
        if (!disposed)
          setError(
            new Error(
              'Live updates are unavailable. Active runs refresh periodically; use Refresh Work to reload history.',
              { cause },
            ),
          );
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [client]);

  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 border-b border-border bg-attention/10 px-6 py-3 text-sm"
    >
      <p>{error.message}</p>
      <Button
        variant="outline"
        onClick={() => {
          void client.invalidateQueries({ queryKey: workKeys.all });
        }}
      >
        Refresh Work
      </Button>
    </div>
  );
}
