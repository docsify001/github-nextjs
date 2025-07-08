import { z } from "zod";

import { ProjectItem } from "./static-api-types";
import { createTask } from "@/lib/tasks/task-runner";
import { TaskContext } from "@/lib/tasks/task-types";
import { sendWebhookToMultipleUrls, hasSuccessfulWebhook, getWebhookStats } from "@/lib/shared/webhook-utils";

interface Project extends ProjectItem {
  delta: number;
}

type RankingsData = {
  year: number;
  month: number;
  trending: Project[];
};

const NUMBER_OF_PROJECTS = 50;

export const triggerMonthlyFinishedTask = createTask({
  name: "trigger-monthly-finished",
  description:
    "Trigger a webhook after monthly rankings are published",

  flags: {
    year: { type: Number },
    month: { type: Number },
  },
  schema: z.object({ year: z.number(), month: z.number() }),

  run: async (context, flags) => {
    const { dryRun, logger } = context;
    const { year, month } = flags;
    const webhookURLs = process.env.MONTHLY_WEBHOOK_URL;
    if (!webhookURLs)
      throw new Error('No "MONTHLY_WEBHOOK_URL" env. variable!');

    const projects = await fetchMonthlyRankings(context, year, month);

    logger.info(
      "Sending the monthly notifications...",
      projects.map((project: Project) => `${project.name}: +${project.delta}`)
    );

    const results = await sendWebhook(webhookURLs, projects, year, month, dryRun);
    const sent = hasSuccessfulWebhook(results);
    const stats = getWebhookStats(results);

    if (sent) {
      logger.info(`Webhook notification sent successfully to ${stats.successful}/${stats.total} endpoints`);
    } else {
      logger.warn(`Webhook notification failed for all ${stats.total} endpoints`);
    }

    return { data: null, meta: { sent, webhookTotal: stats.total, webhookSuccessful: stats.successful, webhookFailed: stats.failed } };
  },
});

async function fetchMonthlyRankings(context: TaskContext, year: number, month: number): Promise<Project[]> {
  const fileName = formatDateForFilename(year, month);
  const data = await context.readJSON(fileName) as RankingsData;
  const { trending } = data;
  const projects = trending.slice(0, NUMBER_OF_PROJECTS);
  return projects;
}

async function sendWebhook(
  webhookURLs: string, 
  projects: Project[], 
  year: number, 
  month: number, 
  dryRun: boolean
): Promise<{ url: string; success: boolean; error?: string }[]> {
  const payload = {
    year,
    month,
    projects: projects.map((project, index) => ({
      rank: index + 1,
      name: project.name,
      full_name: project.full_name,
      description: project.description,
      stars: project.stars,
      delta: project.delta,
      url: project.url,
      icon: project.icon,
    })),
    total_projects: projects.length,
    timestamp: new Date().toISOString(),
  };

  return await sendWebhookToMultipleUrls(
    webhookURLs,
    payload,
    {
      token: process.env.DAILY_WEBHOOK_TOKEN,
      timestamp: new Date().toISOString(),
    },
    dryRun
  );
}

/**
 * @returns format a month as "2024/2024-10.json", to fetch data from the JSON API
 */
function formatDateForFilename(year: number, month: number) {
  return "monthly/" + year + "/" + year + "-" + month.toString().padStart(2, "0") + ".json";
}
