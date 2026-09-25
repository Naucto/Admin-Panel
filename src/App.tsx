import { PAGE_PERMISSIONS } from "@auth/page-permissions";
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
          <Route index element={<HomeRoute />} />
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["access"]} />}>
            <Route path="access" element={<AccessManagementPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["roles"]} />}>
            <Route path="roles" element={<RolesPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["live"]} />}>
            <Route path="live" element={<LiveActivityPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["social"]} />}>
            <Route path="social" element={<SocialOverviewPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["users"]} />}>
            <Route path="users" element={<UsersListPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["users"]} />}>
            <Route path="users/:id" element={<UserDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["projects"]} />}>
            <Route path="projects" element={<ProjectsListPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["projects"]} />}>
            <Route path="projects/:id" element={<ProjectDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["comments"]} />}>
            <Route path="comments" element={<CommentsListPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["comments"]} />}>
            <Route path="comments/:id" element={<CommentDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["reports"]} />}>
            <Route path="reports" element={<ReportsListPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["reports"]} />}>
            <Route path="reports/:id" element={<ReportDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["moderation-log"]} />}>
            <Route path="moderation-log" element={<ModerationLogPage />} />
          </Route>
          <Route element={<ProtectedRoute permissions={PAGE_PERMISSIONS["moderation-log"]} />}>
            <Route path="moderation-log/:id" element={<ModerationLogDetailPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
