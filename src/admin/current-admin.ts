export type StaffRole = "Admin" | "Moderator";

export type CurrentAdmin = {
  id: string;
  databaseId: number;
  email: string;
  username: string;
  title: string;
  roles: StaffRole[];
  role: StaffRole;
};

export function isAdmin(currentAdmin?: CurrentAdmin | null): boolean {
  return currentAdmin?.roles.includes("Admin") ?? false;
}

export function isStaff(currentAdmin?: CurrentAdmin | null): boolean {
  return Boolean(
    currentAdmin?.roles.includes("Admin") ||
      currentAdmin?.roles.includes("Moderator")
  );
}
