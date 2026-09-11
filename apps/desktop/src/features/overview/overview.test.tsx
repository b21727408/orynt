import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { invoke, isTauri } from '@tauri-apps/api/core';
import {
  createHashRouter,
  createMemoryRouter,
  RouterProvider,
} from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/routes';
import { useShellState } from '@/app/shell/shell-state';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));

const healthy = { status: 'healthy', version: '0.1.0', database: 'ready' };

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={createMemoryRouter(routes)} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockReset();
  useShellState.setState({ sidebarCollapsed: false });
});

describe('foundation overview', () => {
  it('shows loading, then validated runtime and database health', async () => {
    let resolveResponse: (value: unknown) => void = () => {
      throw new Error('Health request was not initialized.');
    };
    const response = new Promise<unknown>((resolve) => {
      resolveResponse = resolve;
    });
    vi.mocked(invoke).mockReturnValue(response);
    renderApp();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking local runtime',
    );
    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
    await act(async () => {
      resolveResponse(healthy);
      await response;
    });
    expect(
      await screen.findByText('Your local foundation is ready'),
    ).toBeVisible();
    expect(screen.getByText('Ready')).toBeVisible();
    expect(screen.getByText('0.1.0')).toBeVisible();
    expect(invoke).toHaveBeenCalledWith('runtime_health');
  });

  it('surfaces a database error and recovers after an explicit check', async () => {
    vi.mocked(invoke)
      .mockRejectedValueOnce('Database readiness check failed.')
      .mockResolvedValue(healthy);
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database readiness check failed.',
    );
    expect(
      screen.queryByText('Your local foundation is ready'),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(
      await screen.findByText('Your local foundation is ready'),
    ).toBeVisible();
  });

  it.each([
    { status: 'healthy', version: '0.1.0', database: 'unavailable' },
    { status: 'healthy', version: 123, database: 'ready' },
    { status: 'unhealthy', version: '0.1.0', database: 'ready' },
  ])('rejects invalid or unhealthy IPC data: %j', async (response) => {
    vi.mocked(invoke).mockResolvedValue(response);
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'invalid health response',
    );
    expect(
      screen.queryByText('Your local foundation is ready'),
    ).not.toBeInTheDocument();
  });

  it('removes a previously healthy display when the next check fails', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(healthy)
      .mockRejectedValue('Database readiness check failed.');
    renderApp();
    await screen.findByText('Your local foundation is ready');
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(
      screen.queryByText('Your local foundation is ready'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Runtime unavailable')).toBeVisible();
  });

  it('explains when the desktop transport is unavailable', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Open Orynt in the desktop application',
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it('collapses and expands navigation without changing runtime health', async () => {
    vi.mocked(invoke).mockResolvedValue(healthy);
    renderApp();
    await screen.findByText('Your local foundation is ready');
    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse sidebar' }),
    );
    expect(
      screen.getByRole('button', { name: 'Expand sidebar' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(
        screen.getByRole('navigation', { name: 'Primary navigation' }),
      ).getByRole('link', { name: 'Overview' }),
    ).toBeVisible();
    expect(screen.queryByText('WORKSPACE')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Expand sidebar' }),
    );
    expect(screen.getByText('WORKSPACE')).toBeVisible();
    expect(screen.getByText('Your local foundation is ready')).toBeVisible();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('focuses content and health without replacing the hash route', async () => {
    vi.mocked(invoke).mockResolvedValue(healthy);
    const router = createHashRouter(routes);
    const client = new QueryClient({
      defaultOptions: { queries: { gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    await screen.findByText('Your local foundation is ready');
    await userEvent.click(
      screen.getByRole('link', { name: 'Skip to content' }),
    );
    expect(screen.getByRole('main')).toHaveFocus();
    await userEvent.click(
      screen.getByRole('link', { name: 'Runtime healthy' }),
    );
    expect(
      screen.getByRole('region', { name: 'Runtime health' }),
    ).toHaveFocus();
    expect(router.state.location.pathname).toBe('/');
    expect(window.location.hash).not.toBe('#runtime-health');
    router.dispose();
  });
});
