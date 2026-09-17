import type { Page } from '@playwright/test';
import type { WorkDetail } from '../src/lib/ipc/work-contract';
import {
  completedDetail,
  createdDetail,
  progressedDetail,
  runningDetail,
  secondRunningDetail,
  twoRunsDetail,
} from '../src/test/work-fixtures';

declare global {
  interface Window {
    __ORYNT_E2E__: {
      publish: (snapshot: 'progressed' | 'completed' | 'twoRuns') => void;
      requests: { command: string; args: unknown }[];
    };
  }
}

// Test-only Tauri boundary: select canned responses, never execute domain rules.
// Installed by Playwright before renderer startup; no production imports or switches.
export async function installIpcHarness(
  page: Page,
  initial: 'empty' | 'twoRuns' = 'empty',
) {
  await page.addInitScript(
    ({ snapshots, initial }) => {
      Object.defineProperty(window, 'isTauri', { value: true });
      let current: WorkDetail | null =
        initial === 'twoRuns' ? snapshots.twoRuns : null;
      let startCount = 0;
      let callbackId = 0;
      const callbacks = new Map<number, (event: unknown) => void>();
      const listeners = new Set<number>();
      const requests: { command: string; args: unknown }[] = [];
      function notify() {
        for (const id of listeners)
          callbacks.get(id)?.({
            event: 'runtime-change',
            id,
            payload: {
              work_item_id: snapshots.created.work.id,
              run_id: current?.runs[0]?.run.id ?? null,
            },
          });
      }
      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        configurable: true,
        value: {
          transformCallback: (callback: (event: unknown) => void) => {
            const id = ++callbackId;
            callbacks.set(id, callback);
            return id;
          },
          unregisterCallback: (id: number) => {
            callbacks.delete(id);
          },
          invoke: (
            command: string,
            args?: { handler?: number; eventId?: number },
          ) => {
            requests.push({ command, args });
            switch (command) {
              case 'plugin:event|listen':
                if (args?.handler !== undefined) listeners.add(args.handler);
                return Promise.resolve(args?.handler);
              case 'plugin:event|unlisten':
                if (args?.eventId !== undefined) listeners.delete(args.eventId);
                return Promise.resolve();
              case 'runtime_health':
                return Promise.resolve({
                  status: 'healthy',
                  database: 'ready',
                  version: '0.1.0',
                });
              case 'list_work':
                return Promise.resolve(
                  current
                    ? [
                        {
                          work: current.work,
                          latest_run: current.runs[0]?.run ?? null,
                        },
                      ]
                    : [],
                );
              case 'get_work_detail':
                return current
                  ? Promise.resolve(current)
                  : // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Tauri IPC rejects with a serialized error DTO.
                    Promise.reject({
                      code: 'not_found',
                      message: 'Work not found.',
                    });
              case 'create_work':
                current = snapshots.created;
                notify();
                return Promise.resolve(current.work);
              case 'start_simulated_run':
                current =
                  startCount++ === 0
                    ? snapshots.running
                    : snapshots.secondRunning;
                notify();
                return Promise.resolve(current.runs[0]?.run);
              default:
                return Promise.reject(
                  new Error(`Unexpected E2E command: ${command}`),
                );
            }
          },
        },
      });
      Object.defineProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__', {
        configurable: true,
        value: {
          unregisterListener: (_event: string, id: number) => {
            listeners.delete(id);
            callbacks.delete(id);
          },
        },
      });
      window.__ORYNT_E2E__ = {
        requests,
        publish: (snapshot) => {
          current = snapshots[snapshot];
          notify();
        },
      };
    },
    {
      snapshots: {
        created: createdDetail,
        running: runningDetail,
        progressed: progressedDetail,
        completed: completedDetail,
        secondRunning: secondRunningDetail,
        twoRuns: twoRunsDetail,
      },
      initial,
    },
  );
}
