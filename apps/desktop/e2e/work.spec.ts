import { expect, test } from '@playwright/test';
import { completedRun, twoRunsDetail, work } from '../src/test/work-fixtures';
import { installIpcHarness } from './ipc-harness';

test('create Work, start simulation, inspect progressing stages and previous Runs', async ({
  page,
}, testInfo) => {
  await installIpcHarness(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Work', exact: true })
    .click();
  await expect(
    page.getByText('No Work yet. Create your first Work item.'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'New Work' }).click();
  await page.getByRole('button', { name: 'Create Work', exact: true }).click();
  await expect(page.getByText('Enter a title.')).toBeVisible();
  await page.getByRole('textbox', { name: /Title/ }).fill(work.title);
  await page.getByRole('textbox', { name: /Objective/ }).fill(work.objective);
  await page.getByRole('button', { name: 'Create Work', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/work/${work.id}$`));
  await expect(page.getByRole('heading', { name: work.title })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.__ORYNT_E2E__.requests.find(
          (request) => request.command === 'create_work',
        )?.args,
    ),
  ).toEqual({ request: { title: work.title, objective: work.objective } });
  await page.getByRole('button', { name: 'Start simulated run' }).click();
  await expect(
    page.getByRole('button', { name: 'Triage Pending' }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__ORYNT_E2E__.publish('progressed');
  });
  await expect(
    page.getByRole('button', { name: 'Triage Completed' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Context Running' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Triage Completed' }).click();
  await expect(
    page.getByRole('region', { name: 'Triage stage summary' }),
  ).toContainText('Milestone 1 simulation completed the triage stage');
  await expect(page).toHaveURL(/stage=triage/);
  await page.evaluate(() => {
    window.__ORYNT_E2E__.publish('completed');
  });
  await expect(
    page.getByRole('button', { name: 'Outcome Completed' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start simulated run' }).click();
  await expect(
    page.getByRole('button', { name: 'Triage Pending' }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Run history' })
    .selectOption(completedRun.run.id);
  await expect(
    page.getByRole('button', { name: 'Outcome Completed' }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__ORYNT_E2E__.publish('twoRuns');
  });
  await expect(page.getByRole('combobox', { name: 'Run history' })).toHaveValue(
    completedRun.run.id,
  );
  await page
    .getByRole('combobox', { name: 'Run history' })
    .selectOption(twoRunsDetail.runs[0]!.run.id);
  await page.getByRole('button', { name: 'Analysis Completed' }).click();
  await expect(
    page.getByRole('region', { name: 'Analysis stage summary' }),
  ).toContainText('No AI or tools were used.');
  await expect(
    page.getByRole('region', { name: 'Analysis stage summary' }),
  ).toContainText('Analysis simulation completed');
  await testInfo.attach('work-history', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('loads a previous Run and Stage directly and preserves browser history navigation', async ({
  page,
}) => {
  await installIpcHarness(page, 'twoRuns');
  await page.goto(
    `/#/work/${work.id}?run=${completedRun.run.id}&stage=analysis`,
  );
  await expect(
    page.getByRole('region', { name: 'Analysis stage summary' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Triage Completed' }).click();
  await expect(
    page.getByRole('region', { name: 'Triage stage summary' }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('region', { name: 'Analysis stage summary' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Analysis stage summary' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Run history' })).toHaveValue(
    completedRun.run.id,
  );
});
