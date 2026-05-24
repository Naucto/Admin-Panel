import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma.service.js";
import { CurrentAdmin, StaffRole } from "./current-admin.js";

const STAFF_ROLES: StaffRole[] = ["Admin", "Moderator"];

export async function authenticateStaff(
  prisma: PrismaService,
  email: string,
  password: string
): Promise<CurrentAdmin | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true }
  });

  if (!user || !user.password || user.accountStatus !== "ACTIVE") {
    return null;
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    return null;
  }

  const roles = user.roles
    .map((role) => role.name)
    .filter((role): role is StaffRole =>
      STAFF_ROLES.includes(role as StaffRole)
    );

  if (roles.length === 0) {
    return null;
  }

  return {
    id: String(user.id),
    databaseId: user.id,
    email: user.email,
    username: user.username,
    title: user.nickname ?? user.username,
    roles,
    role: roles.includes("Admin") ? "Admin" : "Moderator"
  };
}
