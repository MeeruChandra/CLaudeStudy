"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Fetches all projects for the authenticated user.
 * Returns projects ordered by most recently updated.
 * @throws {Error} If user is not authenticated
 */
export async function getProjects() {
  const session = await getSession();

  // Only authenticated users can access their projects
  if (!session) {
    throw new Error("Unauthorized");
  }

  const projects = await prisma.project.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return projects;
}