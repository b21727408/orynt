import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/classes';
import { idSchema } from '@/lib/ipc/work-contract';
import { startSimulatedRun } from '@/lib/ipc/work';
import { useWorkDetail, workKeys } from './work-queries';
import {
  displayTime,
  stageLabels,
  statusPresentation,
} from './work-presentation';
import { StageDetail } from './stage-detail';
import { Activity } from './activity';

export function WorkDetailRoute() {
  const { workId } = useParams();
  const id = idSchema.safeParse(workId);
  if (!id.success)
    return (
      <p role="alert" className="p-8 text-danger">
        Select a valid Work item.
      </p>
    );
  return <WorkDetail key={id.data} id={id.data} />;
}

function WorkDetail({ id }: { id: string }) {
  const query = useWorkDetail(id);
  const client = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const mutation = useMutation({
    mutationFn: () => startSimulatedRun(id),
    onSuccess: async (run) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: workKeys.detail(id) }),
        client.invalidateQueries({ queryKey: workKeys.list }),
      ]);
      setSearch({ run: run.id });
    },
  });

  if (query.isPending)
    return (
      <p role="status" className="p-8 text-muted-foreground">
        Loading Work detail…
      </p>
    );
  if (query.isError)
    return (
      <div className="p-8">
        <p role="alert" className="mb-4 text-danger">
          {query.error.message}
        </p>
        <Button
          onClick={() => {
            void query.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  const { work, runs } = query.data;
  const selectedRun = search.get('run');
  const detail = selectedRun
    ? runs.find((item) => item.run.id === selectedRun)
    : runs[0];
  const selectedStage = search.get('stage');
  const planned = selectedStage
    ? detail?.plan.stages.find((stage) => stage.stage_kind === selectedStage)
    : (detail?.plan.stages.find((stage) =>
        detail.stages.some(
          (execution) =>
            execution.stage_kind === stage.stage_kind &&
            execution.status === 'running',
        ),
      ) ?? detail?.plan.stages[0]);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Local Work
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight">
            {work.title}
          </h2>
        </div>
        <Button
          onClick={() => {
            mutation.mutate();
          }}
          disabled={mutation.isPending}
        >
          <Play aria-hidden="true" />
          {mutation.isPending ? 'Starting…' : 'Start simulated run'}
        </Button>
      </div>
      {work.objective && (
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
          {work.objective}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Simulation only. No AI or tools are used.
      </p>
      {mutation.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {mutation.error.message}
        </p>
      )}
      {runs.length === 0 ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold">Ready for its first run</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a simulated run to see stages progress and inspect their
            results.
          </p>
          <div className="mt-5">
            <Activity events={query.data.events} />
          </div>
        </section>
      ) : (
        <>
          <div className="my-7 flex flex-wrap items-center gap-3">
            <label htmlFor="run-history" className="text-sm font-medium">
              Run history
            </label>
            <select
              id="run-history"
              className="form-control w-auto max-w-full"
              value={detail?.run.id ?? ''}
              onChange={(event) => {
                void setSearch({ run: event.target.value });
              }}
            >
              {!detail && <option value="">Select a Run</option>}
              {runs.map((item, index) => (
                <option key={item.run.id} value={item.run.id}>
                  Run {runs.length - index} ·{' '}
                  {statusPresentation[item.run.status].label} ·{' '}
                  {displayTime(item.run.created_at)}
                  {index === 0 ? ' · Latest' : ''}
                </option>
              ))}
            </select>
            {detail && (
              <StatusBadge tone={statusPresentation[detail.run.status].tone}>
                {statusPresentation[detail.run.status].label}
              </StatusBadge>
            )}
          </div>
          {!detail ? (
            <p role="alert" className="text-danger">
              This Run is not part of the selected Work. Choose a Run from its
              history.
            </p>
          ) : (
            <>
              <nav
                aria-label="Stages"
                className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4 min-[1800px]:grid-cols-8"
              >
                {detail.plan.stages.map((stage) => {
                  const execution = detail.stages.find(
                    (item) => item.stage_kind === stage.stage_kind,
                  );
                  const status =
                    statusPresentation[execution?.status ?? 'pending'];
                  return (
                    <button
                      key={stage.position}
                      type="button"
                      aria-label={`${stageLabels[stage.stage_kind]} ${status.label}`}
                      aria-pressed={planned?.stage_kind === stage.stage_kind}
                      onClick={() => {
                        void setSearch({
                          run: detail.run.id,
                          stage: stage.stage_kind,
                        });
                      }}
                      className={cn(
                        'flex min-w-0 flex-col items-start gap-2 rounded-lg border border-border bg-card px-3 py-3 text-left text-xs focus-visible:outline-2 focus-visible:outline-ring',
                        planned?.stage_kind === stage.stage_kind &&
                          'border-active ring-1 ring-active',
                      )}
                    >
                      <span className="font-semibold">
                        {stageLabels[stage.stage_kind]}
                      </span>
                      <StatusBadge tone={status.tone}>
                        {status.label}
                      </StatusBadge>
                    </button>
                  );
                })}
              </nav>
              {planned ? (
                <StageDetail detail={detail} kind={planned.stage_kind} />
              ) : (
                <p role="alert" className="text-danger">
                  This Stage is not in the selected Run’s plan. Select a Stage
                  above.
                </p>
              )}
              <section className="mt-7" aria-label="Run activity">
                <h3 className="mb-2 font-semibold">Run activity</h3>
                <Activity events={detail.events} />
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
