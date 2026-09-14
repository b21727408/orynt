import { Link, NavLink, Outlet } from 'react-router';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/classes';
import { useWorkList } from './work-queries';
import {
  displayTime,
  statusPresentation,
  workStatus,
} from './work-presentation';

export function Work() {
  const query = useWorkList();
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">Work</h1>
        <Button asChild>
          <Link to="/work/new">
            <Plus aria-hidden="true" />
            New Work
          </Link>
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[17rem_minmax(0,1fr)]">
        <section
          aria-label="Work list"
          className="border-b border-border bg-sidebar md:border-b-0 md:border-r"
        >
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent Work
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Refresh Work list"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          </div>
          {query.isPending ? (
            <p
              role="status"
              className="px-5 py-6 text-sm text-muted-foreground"
            >
              Loading Work…
            </p>
          ) : query.isError ? (
            <p role="alert" className="px-5 py-6 text-sm text-danger">
              {query.error.message}
            </p>
          ) : query.data.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No Work yet. Create your first Work item.
            </p>
          ) : (
            <ul>
              {query.data.map((item) => {
                const status = statusPresentation[workStatus(item)];
                return (
                  <li key={item.work.id}>
                    <NavLink
                      to={`/work/${item.work.id}`}
                      className={({ isActive }) =>
                        cn(
                          'block border-l-2 border-transparent px-5 py-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
                          isActive && 'border-active bg-active/5',
                        )
                      }
                    >
                      <p className="break-words text-sm font-medium">
                        {item.work.title}
                      </p>
                      <div className="mt-2">
                        <StatusBadge tone={status.tone}>
                          {status.label === 'Running' ? 'Active' : status.label}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {displayTime(item.work.updated_at)}
                      </p>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function WorkSelection() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold">Work you can inspect</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Select a Work item to inspect its Run history, or create one to start a
        deterministic stage simulation.
      </p>
    </div>
  );
}
