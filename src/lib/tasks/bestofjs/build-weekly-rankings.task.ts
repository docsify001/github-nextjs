import { orderBy, round, uniqBy } from "es-toolkit";
import { z } from "zod";

import {
  flattenSnapshots,
  isProjectIncludedInRankings,
} from "@/drizzle/projects";
import { getWeeklyDelta } from "@/drizzle/snapshots/weekly-trends";
import { truncate } from "@/lib/utils";
import { createTask } from "@/lib/tasks/task-runner";
import { notInArray } from "drizzle-orm";
import { schema } from "@/drizzle/database";

export const buildWeeklyRankingsTask = createTask({
  name: "build-weekly-rankings",
  description: "Build weekly rankings to be displayed on the frontend",
  flags: {
    year: {
      type: Number,
      description: "Year to build rankings for",
    },
    week: {
      type: Number,
      description: "Week to build rankings for",
    },
  },
  schema: z.object({ year: z.number(), week: z.number() }),

  async run(context, flags) {
    const { logger, processRepos, saveJSON } = context;
    const { year, week } = flags;

    const results = await processRepos(
      async (repo) => {
        const project = repo.projects?.[0];
        if (!project) throw new Error("No project found");

        if (!repo.snapshots?.length)
          return { data: null, meta: { "no snapshots": true } };

        const flattenedSnapshots = flattenSnapshots(repo.snapshots);
        const { delta, stars } = getWeeklyDelta(flattenedSnapshots, {
          year,
          week,
        });

        if (delta === undefined || stars === undefined) {
          return { data: null, meta: { "not enough snapshots": true } };
        }
        if (!isProjectIncludedInRankings(project)) {
          return { data: null, meta: { excluded: true } };
        }

        const relativeGrowth = delta ? delta / (stars - delta) : undefined;
        const description =
          project.overrideDescription || !repo.description
            ? project.description
            : repo.description;

        const data = {
          name: project.name,
          full_name: repo.full_name,
          description: truncate(description, 75),
          stars: stars || 0,
          delta,
          relativeGrowth:
            relativeGrowth !== undefined ? round(relativeGrowth, 4) : null,
          tags: project.tags.map((tag) => tag.code),
          owner_id: repo.owner_id,
          created_at: repo.created_at,
        };
        return { data, meta: { success: true } };
      },
      { where: notInArray(schema.projects.status, ["deprecated", "hidden"]) }
    );

    const projects = uniqBy(
      results.data.filter((project) => project !== null),
      (project) => project.full_name
    );

    const trending = orderBy(projects, ["delta"], ["desc"]).slice(0, 100);

    const byRelativeGrowth = orderBy(
      projects,
      ["relativeGrowth"],
      ["desc"]
    ).slice(0, 100);

    const output = {
      year,
      week,
      isFirst: false,
      isLatest: true,
      trending,
      byRelativeGrowth,
    };

    logger.info("Weekly rankings summary", {
      trending: trending
        .slice(0, 5)
        .map((project) => `${project.name} (+${project.delta})`),
      relative: byRelativeGrowth
        .slice(0, 5)
        .map((project) => `${project.name} (${project.relativeGrowth})`),
    });
    await saveJSON(output, `weekly/${year}/${formatDate(year, week)}.json`);

    return results;
  },
});

function formatDate(year: number, week: number) {
  return `${year}-W${week.toString().padStart(2, "0")}`;
} 