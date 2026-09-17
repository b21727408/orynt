import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Monitor,
  ListTodo,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/classes';
import { useRuntimeHealth } from '@/features/overview/use-runtime-health';
import { useShellState } from './shell-state';
import { RuntimeUpdates } from '@/features/work/runtime-updates';

export function AppShell() {
  const collapsed = useShellState((state) => state.sidebarCollapsed);
  const toggleSidebar = useShellState((state) => state.toggleSidebar);
  const health = useRuntimeHealth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:rounded focus:bg-card focus:p-3"
      >
        Skip to content
      </a>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground"
          >
            O
          </span>
          <span className="text-lg font-semibold tracking-tight">
            orynt<span className="text-active">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Monitor className="size-4" aria-hidden="true" />
          Local desktop
        </div>
      </header>
      <RuntimeUpdates />
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r border-border bg-sidebar p-3',
            collapsed ? 'w-16' : 'w-52',
          )}
        >
          <div
            className={cn(
              'mb-6 flex h-8 items-center',
              collapsed ? 'justify-center' : 'justify-between px-2',
            )}
          >
            {!collapsed && (
              <span className="text-xs font-medium tracking-wide text-muted-foreground">
                WORKSPACE
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              aria-controls="primary-navigation"
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" />
              ) : (
                <PanelLeftClose aria-hidden="true" />
              )}
            </Button>
          </div>
          <nav id="primary-navigation" aria-label="Primary navigation">
            {[
              { to: '/', label: 'Overview', Icon: LayoutDashboard },
              { to: '/work', label: 'Work', Icon: ListTodo },
            ].map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    'mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
                    collapsed && 'justify-center px-0',
                    isActive && 'bg-active/10 text-active',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {!collapsed && label}
              </NavLink>
            ))}
          </nav>
          {!collapsed && (
            <div className="mt-auto px-2 pb-3 pt-10">
              <p className="text-xs font-medium text-muted-foreground">
                LOCAL WORKBENCH
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Work, execution and history
                <br />
                you can inspect.
              </p>
            </div>
          )}
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Outlet />
        </main>
      </div>
      <footer className="flex min-h-11 shrink-0 items-center justify-between gap-4 border-t border-border bg-card px-6 py-2 text-xs text-muted-foreground">
        <a
          href="#runtime-health"
          onClick={(event) => {
            event.preventDefault();
            const target = document.getElementById('runtime-health');
            if (target) target.focus();
            else void navigate('/');
          }}
          className="rounded focus-visible:outline-2 focus-visible:outline-ring"
        >
          <StatusBadge
            tone={
              health.isError
                ? 'danger'
                : health.isPending
                  ? 'active'
                  : 'healthy'
            }
          >
            {health.isError
              ? 'Runtime unavailable'
              : health.isPending
                ? 'Checking runtime'
                : 'Runtime healthy'}
          </StatusBadge>
        </a>
        <span>
          Milestone 1{' '}
          <span aria-hidden="true" className="px-2">
            /
          </span>{' '}
          Deterministic simulation
        </span>
      </footer>
    </div>
  );
}
