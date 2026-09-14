import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen, type EventCallback } from '@tauri-apps/api/event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { useShellState } from '@/app/shell/shell-state';
import type { WorkDetail } from '@/lib/ipc/work-contract';
import {
  completedDetail,
  completedRun,
  createdDetail,
  progressedDetail,
  runningDetail,
  twoRunsDetail,
  work,
} from '@/test/work-fixtures';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

let detail: WorkDetail | undefined;
let notification: EventCallback<unknown> | undefined;
const clients: QueryClient[] = [];
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const unlisten = vi.fn();

function renderWork(path = '/work') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  clients.push(client);
  routers.push(router);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function response(command: string): Promise<unknown> {
  switch (command) {
    case 'runtime_health':
      return Promise.resolve({
        status: 'healthy',
        database: 'ready',
        version: '0.1.0',
      });
    case 'list_work':
      return Promise.resolve(
        detail
          ? [{ work: detail.work, latest_run: detail.runs[0]?.run ?? null }]
          : [],
      );
    case 'get_work_detail':
      return detail
        ? Promise.resolve(detail)
        : // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Tauri rejects serialized command error DTOs.
          Promise.reject({ code: 'not_found', message: 'Work not found.' });
    case 'create_work':
      detail = structuredClone(createdDetail);
      return Promise.resolve(work);
    case 'start_simulated_run':
      detail = structuredClone(runningDetail);
      return Promise.resolve(runningDetail.runs[0]!.run);
    default:
      return Promise.reject(new Error(`Unexpected test command: ${command}`));
  }
}

beforeEach(() => {
  detail = undefined;
  notification = undefined;
  unlisten.mockClear();
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockReset().mockImplementation(response);
  vi.mocked(listen)
    .mockReset()
    .mockImplementation((_name, handler) => {
      notification = handler;
      return Promise.resolve(unlisten);
    });
  useShellState.setState({ sidebarCollapsed: false });
});
afterEach(() => {
  clients.splice(0).forEach((client) => {
    client.clear();
  });
  routers.splice(0).forEach((router) => {
    router.dispose();
  });
});

it('shows loading, empty, and error Work list states', async () => {
  let resolve: (value: unknown) => void = () => {
    throw new Error('not initialized');
  };
  const pending = new Promise<unknown>((done) => {
    resolve = done;
  });
  vi.mocked(invoke).mockImplementation((command) =>
    command === 'list_work' ? pending : response(command),
  );
  renderWork();
  expect(screen.getByText('Loading Work…')).toBeVisible();
  await act(async () => {
    resolve([]);
    await pending;
  });
  expect(
    await screen.findByText('No Work yet. Create your first Work item.'),
  ).toBeVisible();
  vi.mocked(invoke).mockImplementation((command) =>
    command === 'list_work'
      ? // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Test the real serialized Tauri error boundary.
        Promise.reject({
          code: 'persistence',
          message: 'Local work is unavailable.',
        })
      : response(command),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Refresh Work list' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Local work is unavailable.',
  );
});

it('validates Create Work and navigates to the newly created Work', async () => {
  const router = renderWork('/work/new');
  await userEvent.click(screen.getByRole('button', { name: 'Create Work' }));
  expect(await screen.findByText('Enter a title.')).toBeVisible();
  expect(screen.getByRole('textbox', { name: /Title/ })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(
    vi.mocked(invoke).mock.calls.some(([command]) => command === 'create_work'),
  ).toBe(false);
  await userEvent.type(
    screen.getByRole('textbox', { name: /Title/ }),
    `  ${work.title}  `,
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: /Objective/ }),
    work.objective,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Create Work' }));
  expect(
    await screen.findByRole('heading', { name: work.title }),
  ).toBeVisible();
  expect(router.state.location.pathname).toBe(`/work/${work.id}`);
  expect(invoke).toHaveBeenCalledWith('create_work', {
    request: { title: work.title, objective: work.objective },
  });
  expect(
    within(screen.getByRole('region', { name: 'Work list' })).getByRole(
      'link',
      { name: new RegExp(work.title) },
    ),
  ).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Ready for its first run')).toBeVisible();
});

it('shows persisted detail and supports one-click stage inspection', async () => {
  detail = structuredClone(progressedDetail);
  const router = renderWork(`/work/${work.id}`);
  const stages = await screen.findByRole('navigation', { name: 'Stages' });
  expect(
    within(stages).getByRole('button', { name: 'Triage Completed' }),
  ).toBeVisible();
  expect(
    within(stages).getByRole('button', { name: 'Context Running' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    within(stages).getByRole('button', { name: 'Analysis Pending' }),
  ).toBeVisible();
  await userEvent.click(
    within(stages).getByRole('button', { name: 'Triage Completed' }),
  );
  expect(
    screen.getByRole('region', { name: 'Triage stage summary' }),
  ).toHaveTextContent('Milestone 1 simulation completed the triage stage');
  expect(router.state.location.search).toContain('stage=triage');
  expect(
    screen.getByRole('region', { name: 'Triage stage summary' }),
  ).toHaveTextContent('Triage simulation completed');
  await userEvent.click(
    within(stages).getByRole('button', { name: 'Analysis Pending' }),
  );
  expect(
    screen.getByRole('region', { name: 'Analysis stage summary' }),
  ).toHaveTextContent('Execution has not started.');
});

it('starts a Run asynchronously, then refetches from validated change notifications', async () => {
  detail = structuredClone(createdDetail);
  const shellState = useShellState.getState();
  const router = renderWork(`/work/${work.id}`);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Start simulated run' }),
  );
  expect(
    await screen.findByRole('button', { name: 'Triage Pending' }),
  ).toBeVisible();
  expect(router.state.location.search).toContain(completedRun.run.id);
  detail = structuredClone(progressedDetail);
  await waitFor(() => {
    expect(notification).toBeDefined();
  });
  act(() => {
    notification?.({
      event: 'runtime-change',
      id: 1,
      payload: { work_item_id: work.id, run_id: completedRun.run.id },
    });
  });
  expect(
    await screen.findByRole('button', { name: 'Triage Completed' }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Context Running' })).toBeVisible();
  expect(useShellState.getState()).toBe(shellState);
});

it('keeps Run start errors visible', async () => {
  detail = structuredClone(createdDetail);
  vi.mocked(invoke).mockImplementation((command) =>
    command === 'start_simulated_run'
      ? // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Test the real serialized Tauri error boundary.
        Promise.reject({
          code: 'persistence',
          message: 'Run could not be saved.',
        })
      : response(command),
  );
  renderWork(`/work/${work.id}`);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Start simulated run' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Run could not be saved.',
  );
  expect(screen.getByText('Ready for its first run')).toBeVisible();
});

it('selects previous Runs and honors Work/Run/Stage deep links', async () => {
  detail = structuredClone(twoRunsDetail);
  const router = renderWork(
    `/work/${work.id}?run=${twoRunsDetail.runs[0]!.run.id}&stage=analysis`,
  );
  expect(
    await screen.findByRole('region', { name: 'Analysis stage summary' }),
  ).toBeVisible();
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Run history' }),
    completedRun.run.id,
  );
  expect(router.state.location.search).toBe(`?run=${completedRun.run.id}`);
  expect(screen.getByRole('combobox', { name: 'Run history' })).toHaveValue(
    completedRun.run.id,
  );
  expect(
    screen.getByRole('region', { name: 'Triage stage summary' }),
  ).toHaveTextContent(completedRun.stages[0]!.result!.summary);
});

it('shows failed stage information and rejects missing selections', async () => {
  detail = structuredClone(progressedDetail);
  const failed = detail.runs[0]!.stages[1]!;
  failed.status = 'failed';
  failed.completed_at = failed.started_at + 1;
  failed.failure = 'Deterministic simulation failed.';
  detail.runs[0]!.run.status = 'failed';
  detail.runs[0]!.run.completed_at = failed.completed_at;
  const router = renderWork(`/work/${work.id}?stage=context`);
  expect(
    await screen.findByRole('button', { name: 'Context Failed' }),
  ).toBeVisible();
  expect(
    screen.getByRole('region', { name: 'Context stage summary' }),
  ).toHaveTextContent('Deterministic simulation failed.');
  await act(async () => {
    await router.navigate(`/work/${work.id}?stage=imaginary`);
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This Stage is not in the selected Run',
  );
});

it('surfaces malformed notifications without trusting their payload', async () => {
  detail = structuredClone(completedDetail);
  renderWork(`/work/${work.id}`);
  await screen.findByRole('heading', { name: work.title });
  const before = vi.mocked(invoke).mock.calls.length;
  act(() => {
    notification?.({
      event: 'runtime-change',
      id: 1,
      payload: { work_item_id: 'bad', run_id: null },
    });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'invalid change notification',
  );
  expect(vi.mocked(invoke).mock.calls.length).toBe(before);
});

it('keeps notification registration failures observable', async () => {
  vi.mocked(listen).mockRejectedValue(new Error('test transport unavailable'));
  renderWork();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Live updates are unavailable',
  );
  expect(screen.getByRole('button', { name: 'Refresh Work' })).toBeVisible();
});
