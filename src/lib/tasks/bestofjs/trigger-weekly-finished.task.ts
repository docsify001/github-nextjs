import { z } from "zod";

import { ProjectItem } from "./static-api-types";
import { createTask } from "@/lib/tasks/task-runner";
import { TaskContext } from "@/lib/tasks/task-types";
import { sendWebhookToMultipleUrls, hasSuccessfulWebhook, getWebhookStats } from "@/lib/shared/webhook-utils";

interface Project extends ProjectItem {
  delta: number;
}

type WeeklyRankingsData = {
  year: number;
  week: number;
  trending: Project[];
};

const NUMBER_OF_PROJECTS = 50;

export const triggerWeeklyFinishedTask = createTask({
  name: "trigger-weekly-finished",
  description:
    "Trigger a webhook after weekly rankings are published",

  flags: {
    year: { type: Number },
    week: { type: Number },
  },
  schema: z.object({ year: z.number(), week: z.number() }),

  run: async (context, flags) => {
    const { dryRun, logger } = context;
    const { year, week } = flags;
    const webhookURLs = process.env.WEEKLY_WEBHOOK_URL;
    if (!webhookURLs)
      throw new Error('No "WEEKLY_WEBHOOK_URL" env. variable!');

    const projects = await fetchWeeklyRankings(context, year, week);

    logger.info(
      "Sending the weekly notifications...",
      projects.map((project: Project) => `${project.name}: +${project.delta}`)
    );

    const results = await sendWebhook(webhookURLs, projects, year, week, dryRun);
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

async function fetchWeeklyRankings(context: TaskContext, year: number, week: number): Promise<Project[]> {
  const fileName = formatDateForFilename(year, week);
  const data = await context.readJSON(fileName) as WeeklyRankingsData;
  const { trending } = data;
  const projects = trending.slice(0, NUMBER_OF_PROJECTS);
  return projects;
}

async function sendWebhook(
  webhookURLs: string, 
  projects: Project[], 
  year: number, 
  week: number, 
  dryRun: boolean
): Promise<{ url: string; success: boolean; error?: string }[]> {
  const payload = {
    year,
    week,
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
 * @returns format a week as "weekly/2024/2024-W01.json", to fetch data from the JSON API
 */
function formatDateForFilename(year: number, week: number) {
  return "weekly/" + year + "/" + year + "-W" + week.toString().padStart(2, "0") + ".json";
} 