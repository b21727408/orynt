import type { ActivityEvent } from '@/lib/ipc/work-contract';
import { displayTime, stageLabels } from './work-presentation';

function description(event: ActivityEvent): string {
  const kind = event.kind;
  switch (kind.type) {
    case 'work.created':
      return 'Work created';
    case 'run.created':
      return 'Simulation run created';
    case 'run.started':
      return 'Run started';
    case 'run.completed':
      return 'Simulation run completed';
    case 'run.failed':
      return `Run failed: ${kind.payload.message}`;
    case 'stage.started':
      return `${stageLabels[kind.payload.stage_kind]} started`;
    case 'stage.completed':
      return `${stageLabels[kind.payload.stage_kind]} simulation completed`;
    case 'stage.failed':
      return `${stageLabels[kind.payload.stage_kind]} failed: ${kind.payload.message}`;
  }
}

export function Activity({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ol aria-label="Activity" className="divide-y divide-border">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm"
        >
          <span>{description(event)}</span>
          <time
            dateTime={new Date(event.occurred_at).toISOString()}
            className="text-xs text-muted-foreground"
          >
            {displayTime(event.occurred_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}
