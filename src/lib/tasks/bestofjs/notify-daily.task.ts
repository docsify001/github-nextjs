import { orderBy } from "es-toolkit";

import { ProjectItem } from "./static-api-types";
import { TAGS_EXCLUDED_FROM_RANKINGS } from "@/drizzle/constants";
import { sendMessageToWeWork, projectToWeWorkNews } from "@/lib/shared/wework";
import { createTask } from "@/lib/tasks/task-runner";

const NUMBER_OF_PROJECTS = 5;

export const notifyDailyTask = createTask({
  name: "notify-daily",
  description:
    "Send notification to WeWork after static API is built",

  run: async ({ dryRun, logger, readJSON }) => {
    // 优先使用企业微信应用消息
    const agentid = process.env.WEWORK_AGENTID ? parseInt(process.env.WEWORK_AGENTID) : undefined;
    const weworkURL = process.env.WEWORK_DAILY_WEBHOOK;
    
    if (!agentid && !weworkURL) {
      logger.warn('企业微信配置缺失: 需要配置 WEWORK_AGENTID 或 WEWORK_DAILY_WEBHOOK');
      return { data: null, meta: { sent: false } };
    }

    const projects = await fetchHottestProjects();

    logger.debug("Send the daily notifications to WeWork...");
    
    const sent = await notifyWeWork({
      projects,
      agentid,
      webhookURL: weworkURL,
      dryRun,
    });
    
    if (sent) {
      logger.info("Notification sent to WeWork");
    }

    return { data: null, meta: { sent } };

    async function fetchProjectsFromJSON() {
      const data = await readJSON("projects.json");
      return (data as any).projects as ProjectItem[]; // TODO parse data with Zod
    }

    async function fetchHottestProjects() {
      const projects = await fetchProjectsFromJSON();

      const topProjects = orderBy(
        projects.filter(isIncludedInHotProjects),
        [(project) => project.trends?.daily || 0],
        ["desc"]
      );

      return topProjects.slice(0, NUMBER_OF_PROJECTS);
    }
  },
});

/**
 * Exclude from the rankings projects with specific tags
 * TODO: move this behavior to the `tag` record, adding an attribute `exclude_from_rankings`?
 **/
const isIncludedInHotProjects = (project: ProjectItem) => {
  const hasExcludedTag = TAGS_EXCLUDED_FROM_RANKINGS.some((tag) =>
    project.tags.includes(tag)
  );
  return !hasExcludedTag;
};

async function notifyWeWork({
  projects,
  agentid,
  webhookURL,
  dryRun,
}: {
  projects: ProjectItem[];
  agentid?: number;
  webhookURL?: string;
  dryRun: boolean;
}) {
  const text = `TOP ${NUMBER_OF_PROJECTS} Hottest Projects Today (${formatTodayDate()})`;

  const attachments = projects.map((project, i) => {
    const stars = project.trends.daily;
    const pretext = `Number ${i + 1} +${stars} stars since yesterday:`;
    return projectToWeWorkNews(project, pretext);
  });

  if (dryRun) {
    console.info("[DRY RUN] No message sent to WeWork", { text, attachments }); 
    return false;
  }

  try {
    await sendMessageToWeWork(text, { 
      agentid,
      webhookUrl: webhookURL, 
      attachments 
    });
    return true;
  } catch (error) {
    console.error("Failed to send message to WeWork:", error);
    return false;
  }
}

/**
 * @returns format a date as "Tuesday, May 14"
 */
function formatTodayDate() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return formatter.format(new Date());
}
