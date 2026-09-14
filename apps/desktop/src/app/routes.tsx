import { AppShell } from './shell/app-shell';
import { Overview } from '@/features/overview/overview';
import { Work, WorkSelection } from '@/features/work/work';
import { CreateWork } from '@/features/work/create-work';
import { WorkDetailRoute } from '@/features/work/work-detail';

export const routes = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Overview /> },
      {
        path: '/work',
        element: <Work />,
        children: [
          { index: true, element: <WorkSelection /> },
          { path: 'new', element: <CreateWork /> },
          { path: ':workId', element: <WorkDetailRoute /> },
        ],
      },
    ],
  },
];
