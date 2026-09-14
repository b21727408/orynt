import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { createWork } from '@/lib/ipc/work';
import {
  createWorkSchema,
  type CreateWorkInput,
} from '@/lib/ipc/work-contract';
import { workKeys } from './work-queries';

export function CreateWork() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const form = useForm<CreateWorkInput>({
    resolver: zodResolver(createWorkSchema),
    defaultValues: { title: '', objective: '' },
  });
  const mutation = useMutation({
    mutationFn: createWork,
    onSuccess: async (work) => {
      await client.invalidateQueries({ queryKey: workKeys.list });
      await navigate(`/work/${work.id}`);
    },
  });

  return (
    <section
      className="mx-auto max-w-2xl p-6 lg:p-8"
      aria-labelledby="create-work-heading"
    >
      <h2
        id="create-work-heading"
        className="text-2xl font-semibold tracking-tight"
      >
        Create Work
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Describe the work you want to keep track of locally.
      </p>
      <form
        className="mt-8 space-y-6"
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((input) => {
            mutation.mutate(input);
          })(event);
        }}
      >
        <div>
          <label
            htmlFor="work-title"
            className="mb-2 block text-sm font-medium"
          >
            Title <span className="text-muted-foreground">(required)</span>
          </label>
          <input
            id="work-title"
            className="form-control"
            autoFocus
            aria-invalid={!!form.formState.errors.title}
            aria-describedby="work-title-error"
            {...form.register('title')}
          />
          <p id="work-title-error" className="mt-2 text-sm text-danger">
            {form.formState.errors.title?.message}
          </p>
        </div>
        <div>
          <label
            htmlFor="work-objective"
            className="mb-2 block text-sm font-medium"
          >
            Objective <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="work-objective"
            className="form-control min-h-36 resize-y"
            rows={6}
            aria-invalid={!!form.formState.errors.objective}
            aria-describedby="work-objective-error"
            {...form.register('objective')}
          />
          <p id="work-objective-error" className="mt-2 text-sm text-danger">
            {form.formState.errors.objective?.message}
          </p>
        </div>
        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            {mutation.error.message}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Work'}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/work">Cancel</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
