import { db } from "@/drizzle/database";
import { ProjectService } from "@/drizzle/projects";
import { SnapshotsService } from "@/drizzle/snapshots";

/** Export singletons to avoid creating too many connections */
export const projectService = new ProjectService(db);

export const snapshotsService = new SnapshotsService(db);
