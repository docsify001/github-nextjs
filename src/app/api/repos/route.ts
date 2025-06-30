import { db } from "@/drizzle/database";
import { createProject, ProjectDetails } from "@/drizzle/projects";
import { buildMonthlyRankingsTask } from "@/lib/tasks/bestofjs/build-monthly-rankings.task";
import { updateBundleSizeTask } from "@/lib/tasks/bestofjs/update-bundle-size.task";
import { updateHallOfFameTask } from "@/lib/tasks/bestofjs/update-hall-of-fame.task";
import { updatePackageDataTask } from "@/lib/tasks/bestofjs/update-package-data.task";
import { TaskScheduler } from "@/lib/tasks/scheduler";
import { Task } from "@/lib/tasks/task-types";
import { createTaskRunner } from "@/lib/tasks/task-runner";
import { NextRequest, NextResponse } from "next/server";

/**
 * This endpoint is used to create a new project and run the tasks on it.
 * 
 * @param request - The request object containing the github url and webhook url.
 * @returns - The response object containing the project and the tasks.
 */
export async function POST(request: NextRequest) {
    try {
      const { githubUrl, triggeredBy = 'manual', webhookUrl } = await request.json();
  
      if (!githubUrl) {
        return NextResponse.json(
          { success: false, error: 'Task github url is required' },
          { status: 400 }
        );
      }
			const project = await createProject(githubUrl);
			const tasks: Task<any>[] = [
				updatePackageDataTask,
				updateHallOfFameTask,
				updateBundleSizeTask,
			];
			const runner = createTaskRunner(tasks);
			runner.run({
				db,
				logger: console,
				processProjects: async (project: ProjectDetails) => {
					return { success: true, message: 'Project processed successfully' };
				},
			}).then((result) => {
				console.log(result);
			});
			
      return NextResponse.json({ success: true, data: { project } });
    } catch (error) {
      console.error('Error executing task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  } 