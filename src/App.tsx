import { Route, Routes } from "react-router-dom";
import { AdminShell } from "@layout/AdminShell";
import { ProtectedRoute } from "@auth/ProtectedRoute";
import { LoginPage } from "@auth/LoginPage";
import { ForbiddenPage } from "@auth/ForbiddenPage";
import { DashboardPage } from "@pages/DashboardPage";
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
import { LookupPage } from "@pages/lookup/LookupPage";

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route index element={<DashboardPage />} />
            <Route path="access" element={<AccessManagementPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="lookup/analytics-events" element={<LookupPage resource="analyticsEvents" />} />
            <Route path="lookup/daily-rollups" element={<LookupPage resource="dailyRollups" />} />
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
          <Route path="lookup/likes" element={<LookupPage resource="likes" />} />
          <Route path="lookup/friendships" element={<LookupPage resource="friendships" />} />
          <Route path="lookup/friend-requests" element={<LookupPage resource="friendRequests" />} />
          <Route path="lookup/subscriptions" element={<LookupPage resource="subscriptions" />} />
          <Route path="lookup/game-sessions" element={<LookupPage resource="gameSessions" />} />
          <Route path="lookup/work-sessions" element={<LookupPage resource="workSessions" />} />
        </Route>
      </Route>
    </Routes>
  );
}
