import { useQuery } from '@tanstack/react-query';
import { fetchRuntimeHealth } from '@/lib/ipc/runtime-health';

export function useRuntimeHealth() {
  return useQuery({
    queryKey: ['runtime-health'],
    queryFn: fetchRuntimeHealth,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
    networkMode: 'always',
  });
}
