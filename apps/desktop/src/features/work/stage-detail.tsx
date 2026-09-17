import { StatusBadge } from '@/components/status-badge';
import type { RunDetail, StageKind } from '@/lib/ipc/work-contract';
import {
  displayTime,
  stageLabels,
  statusPresentation,
} from './work-presentation';
import { Activity } from './activity';

export function StageDetail({
  detail,
  kind,
}: {
  detail: RunDetail;
  kind: StageKind;
}) {
  const execution = detail.stages.find((stage) => stage.stage_kind === kind);
  const status = statusPresentation[execution?.status ?? 'pending'];
  const events = detail.events.filter(
    (event) =>
      'stage_kind' in event.kind.payload &&
      event.kind.payload.stage_kind === kind,
  );
  return (
    <section
      aria-label={`${stageLabels[kind]} stage summary`}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{stageLabels[kind]}</h3>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        Deterministic stage simulation
      </p>
      <h4 className="mb-2 mt-6 text-sm font-semibold">Summary</h4>
      <div aria-live="polite" className="text-sm leading-relaxed">
        {!execution && <p>Execution has not started.</p>}
        {execution?.status === 'running' && (
          <p role="status">Simulation in progress…</p>
        )}
        {execution?.result && <p>{execution.result.summary}</p>}
        {execution?.failure && (
          <p role="alert" className="text-danger">
            {execution.failure}
          </p>
        )}
      </div>
      {execution && (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Started</dt>
            <dd className="mt-1">{displayTime(execution.started_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="mt-1">
              {execution.completed_at === null
                ? '—'
                : displayTime(execution.completed_at)}
            </dd>
          </div>
        </dl>
      )}
      <h4 className="mb-1 mt-7 text-sm font-semibold">Stage activity</h4>
      <Activity events={events} />
    </section>
  );
}
