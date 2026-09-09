import { AppShell } from './shell/app-shell';
import { Overview } from '@/features/overview/overview';

export const routes = [
  { element: <AppShell />, children: [{ path: '/', element: <Overview /> }] },
];
