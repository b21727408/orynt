import { invoke, isTauri } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedDetail, completedRun, work } from '@/test/work-fixtures';
import {
  createWork,
  getWorkDetail,
  listWork,
  startSimulatedRun,
  WorkCommandError,
} from './work';
import { runtimeChangeSchema } from './work-notifications';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockReset();
});

describe('Work IPC contract', () => {
  it('validates Work lists and complete detail projections', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce([{ work, latest_run: completedRun.run }])
      .mockResolvedValueOnce(completedDetail);
    expect(await listWork()).toEqual([{ work, latest_run: completedRun.run }]);
    expect(await getWorkDetail(work.id)).toEqual(completedDetail);
    expect(invoke).toHaveBeenLastCalledWith('get_work_detail', {
      request: { work_item_id: work.id },
    });
  });
  it('validates creation input and the returned Work and Run', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(work)
      .mockResolvedValueOnce(completedRun.run);
    await createWork({ title: ` ${work.title} `, objective: work.objective });
    expect(invoke).toHaveBeenLastCalledWith('create_work', {
      request: { title: work.title, objective: work.objective },
    });
    expect(await startSimulatedRun(work.id)).toEqual(completedRun.run);
    expect(() => createWork({ title: ' ', objective: '' })).toThrow();
  });
  it.each([
    null,
    {},
    [{ work: { ...work, id: 'external-id' }, latest_run: null }],
    [{ work, latest_run: { ...completedRun.run, work_item_id: 'invalid' } }],
  ])('rejects malformed lists: %j', async (response) => {
    vi.mocked(invoke).mockResolvedValue(response);
    await expect(listWork()).rejects.toThrow('invalid Work response');
  });
  it('rejects malformed stage output, plan order and event payloads', async () => {
    const badStage = structuredClone(completedDetail);
    badStage.runs[0]!.stages[0]!.result = null;
    const badPlan = structuredClone(completedDetail);
    badPlan.runs[0]!.plan.stages[0]!.position = 9;
    for (const response of [
      badStage,
      badPlan,
      {
        ...completedDetail,
        events: [
          {
            ...completedDetail.events[0],
            kind: { type: 'untyped-log', payload: {} },
          },
        ],
      },
    ]) {
      vi.mocked(invoke).mockResolvedValue(response);
      await expect(getWorkDetail(work.id)).rejects.toThrow(
        'invalid Work response',
      );
    }
  });
  it.each(['validation', 'not_found', 'conflict', 'persistence', 'execution'])(
    'maps structured %s command errors',
    async (code) => {
      vi.mocked(invoke).mockRejectedValue({
        code,
        message: 'Safe failure text.',
      });
      await expect(startSimulatedRun(work.id)).rejects.toMatchObject({
        code,
        message: 'Safe failure text.',
      });
      await expect(startSimulatedRun(work.id)).rejects.toBeInstanceOf(
        WorkCommandError,
      );
    },
  );
  it('rejects malformed error data without displaying its arbitrary content', async () => {
    vi.mocked(invoke).mockRejectedValue('private path or diagnostic');
    await expect(listWork()).rejects.toThrow('invalid command error');
    vi.mocked(isTauri).mockReturnValue(false);
    await expect(listWork()).rejects.toThrow(
      'Open Orynt in the desktop application',
    );
  });
  it('validates small runtime change notifications', () => {
    expect(
      runtimeChangeSchema.parse({
        work_item_id: work.id,
        run_id: completedRun.run.id,
      }),
    ).toEqual({ work_item_id: work.id, run_id: completedRun.run.id });
    expect(
      runtimeChangeSchema.safeParse({ work_item_id: 'bad', run_id: null })
        .success,
    ).toBe(false);
    expect(
      runtimeChangeSchema.safeParse({ work_item_id: work.id }).success,
    ).toBe(false);
    expect(
      runtimeChangeSchema.safeParse({
        work_item_id: work.id,
        run_id: null,
        work: [],
      }).success,
    ).toBe(false);
  });
});
