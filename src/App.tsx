import { Route, Routes } from "react-router-dom";
import { AdminShell } from "@layout/AdminShell";
import { ProtectedRoute } from "@auth/ProtectedRoute";
import { LoginPage } from "@auth/LoginPage";
import { ForbiddenPage } from "@auth/ForbiddenPage";
import { HomeRoute } from "@auth/HomeRoute";
import { LiveActivityPage } from "@pages/LiveActivityPage";
import { SocialOverviewPage } from "@pages/SocialOverviewPage";
import { AccessManagementPage } from "@pages/AccessManagementPage";
import { UsersListPage } from "@pages/users/UsersListPage";
import { UserDetailPage } from "@pages/users/UserDetailPage";
import { ProjectsListPage } from "@pages/projects/ProjectsListPage";
import { ProjectDetailPage } from "@pages/projects/ProjectDetailPage";
import { CommentsListPage } from "@pages/comments/CommentsListPage";
import { CommentDetailPage } from "@pages/comments/CommentDetailPage";
import { ReportsListPage } from "@pages/reports/ReportsListPage";
import { ReportDetailPage } from "@pages/reports/ReportDetailPage";
import { ModerationLogPage } from "@pages/moderation/ModerationLogPage";
import { ModerationLogDetailPage } from "@pages/moderation/ModerationLogDetailPage";
import { RolesPage } from "@pages/roles/RolesPage";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          {/* Not inside `requireAdmin`: HomeRoute decides per role, so a
              moderator lands on their queue instead of "Access denied". */}
          <Route index element={<HomeRoute />} />

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="access" element={<AccessManagementPage />} />
            <Route path="roles" element={<RolesPage />} />
          </Route>

          <Route path="live" element={<LiveActivityPage />} />
          <Route path="social" element={<SocialOverviewPage />} />
          <Route path="users" element={<UsersListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="comments" element={<CommentsListPage />} />
          <Route path="comments/:id" element={<CommentDetailPage />} />
          <Route path="reports" element={<ReportsListPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="moderation-log" element={<ModerationLogPage />} />
          <Route path="moderation-log/:id" element={<ModerationLogDetailPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
