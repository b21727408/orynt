import type { StageKind, WorkSummary } from '@/lib/ipc/work-contract';

export const stageLabels: Record<StageKind, string> = {
  triage: 'Triage',
  context: 'Context',
  analysis: 'Analysis',
  planning: 'Plan',
  implementation: 'Implementation',
  verification: 'Verification',
  review: 'Review',
  outcome: 'Outcome',
};
export const statusPresentation = {
  ready: { label: 'Ready', tone: 'idle' },
  pending: { label: 'Pending', tone: 'idle' },
  running: { label: 'Running', tone: 'active' },
  completed: { label: 'Completed', tone: 'healthy' },
  failed: { label: 'Failed', tone: 'danger' },
} as const;

export function workStatus(work: WorkSummary) {
  return work.latest_run?.status ?? 'ready';
}
export function displayTime(at: number) {
  return new Date(at).toLocaleString();
}
