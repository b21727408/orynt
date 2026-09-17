import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { useWorkList } from '@/features/work/work-queries';
import {
  statusPresentation,
  workStatus,
} from '@/features/work/work-presentation';

export function WorkOverview() {
  const query = useWorkList();
  if (query.isPending)
    return (
      <p role="status" className="mb-8 text-sm text-muted-foreground">
        Loading Work overview…
      </p>
    );
  if (query.isError)
    return (
      <div className="mb-8">
        <p role="alert" className="mb-3 text-sm text-danger">
          {query.error.message}
        </p>
        <Button
          onClick={() => {
            void query.refetch();
          }}
        >
          Refresh Work
        </Button>
      </div>
    );
  const work = query.data;
  return (
    <section aria-label="Work overview" className="mb-9">
      <dl className="grid grid-cols-2 gap-5 border-y border-border py-5 sm:grid-cols-4">
        {(['running', 'ready', 'completed', 'failed'] as const).map(
          (status) => (
            <div key={status}>
              <dt className="text-xs font-medium text-muted-foreground">
                {status === 'running'
                  ? 'Active'
                  : statusPresentation[status].label}
              </dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">
                {work.filter((item) => workStatus(item) === status).length}
              </dd>
            </div>
          ),
        )}
      </dl>
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Recent Work</h2>
        <Button variant="ghost" asChild>
          <Link to="/work">View Work</Link>
        </Button>
      </div>
      {work.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your workspace is ready.{' '}
          <Link
            to="/work/new"
            className="font-medium text-active underline underline-offset-4"
          >
            Create your first Work item
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {work.slice(0, 5).map((item) => {
            const status = statusPresentation[workStatus(item)];
            return (
              <li key={item.work.id}>
                <Link
                  to={`/work/${item.work.id}`}
                  className="flex items-center justify-between gap-3 rounded py-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="truncate font-medium">
                    {item.work.title}
                  </span>
                  <StatusBadge tone={status.tone}>
                    {status.label === 'Running' ? 'Active' : status.label}
                  </StatusBadge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
