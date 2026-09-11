import {
  ArrowDownToLine,
  Check,
  Database,
  RefreshCw,
  Server,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { useRuntimeHealth } from './use-runtime-health';

export function Overview() {
  const health = useRuntimeHealth();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10 lg:px-12">
      <div className="mb-9">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Your local workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          A clear view of the foundation running on your device.
        </p>
      </div>
      <section
        id="runtime-health"
        tabIndex={-1}
        aria-labelledby="health-heading"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <Server
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 id="health-heading" className="text-base font-semibold">
              Runtime health
            </h2>
          </div>
          <Button
            onClick={() => {
              void health.refetch();
            }}
            disabled={health.isFetching}
          >
            <RefreshCw aria-hidden="true" />
            {health.isFetching ? 'Checking…' : 'Check again'}
          </Button>
        </div>
        {health.isError ? (
          <div role="alert" className="p-6">
            <div className="mb-3 flex items-center gap-3">
              <TriangleAlert
                className="size-5 text-danger"
                aria-hidden="true"
              />
              <h3 className="font-medium">Runtime needs attention</h3>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {health.error.message}
            </p>
            <p className="mt-4 text-xs text-danger">
              A healthy connection could not be confirmed.
            </p>
          </div>
        ) : health.isPending ? (
          <div role="status" className="px-6 py-10">
            <StatusBadge tone="active">Checking local runtime</StatusBadge>
            <p className="mt-4 text-sm text-muted-foreground">
              Waiting for the runtime and database readiness check.
            </p>
          </div>
        ) : (
          <div aria-live="polite">
            <div className="flex items-start gap-3 px-6 py-6">
              <span className="rounded-full bg-healthy/10 p-2 text-healthy">
                <Check className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-medium">Your local foundation is ready</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The runtime responded and the database readiness check passed.
                </p>
              </div>
            </div>
            <dl className="divide-y divide-border border-t border-border px-6">
              <div className="flex items-center justify-between py-4">
                <dt className="flex items-center gap-3 text-sm">
                  <Server
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Desktop runtime
                </dt>
                <dd>
                  <StatusBadge tone="healthy">Healthy</StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="flex items-center gap-3 text-sm">
                  <Database
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  SQLite database
                </dt>
                <dd>
                  <StatusBadge tone="healthy">Ready</StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="text-sm text-muted-foreground">
                  Application version
                </dt>
                <dd className="font-mono text-xs">{health.data.version}</dd>
              </div>
            </dl>
          </div>
        )}
        <div className="flex items-start gap-3 border-t border-border bg-muted/50 px-6 py-4">
          <ArrowDownToLine
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Application data stays on this device, in Orynt’s application data
            directory.
          </p>
        </div>
      </section>
      <div className="mt-7 flex items-start gap-3 px-1">
        <StatusBadge>Milestone 0</StatusBadge>
        <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
          This build establishes the desktop shell and local runtime connection.
          <br />
          Work execution will arrive in the next milestone.
        </p>
      </div>
    </div>
  );
}
