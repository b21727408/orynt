import { useQuery } from '@tanstack/react-query';
import { getWorkDetail, listWork } from '@/lib/ipc/work';

export const workKeys = {
  all: ['work'] as const,
  list: ['work', 'list'] as const,
  detail: (id: string) => ['work', 'detail', id] as const,
};

export function useWorkList() {
  return useQuery({
    queryKey: workKeys.list,
    queryFn: listWork,
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.latest_run?.status === 'running')
        ? 1500
        : false,
  });
}

export function useWorkDetail(id: string) {
  return useQuery({
    queryKey: workKeys.detail(id),
    queryFn: () => getWorkDetail(id),
    refetchInterval: (query) =>
      query.state.data?.runs.some((detail) => detail.run.status === 'running')
        ? 1500
        : false,
  });
}
