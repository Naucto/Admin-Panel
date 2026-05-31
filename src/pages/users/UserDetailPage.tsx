import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminUserApi } from "@api/admin";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { useAdminAuth, useIsAdmin } from "@auth/AdminAuthProvider";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";
import { formatDate } from "@utils/format";

type DialogState =
  | { type: "suspend" }
  | { type: "ban" }
  | { type: "restore" }
  | { type: "grant" }
  | { type: "revoke" }
  | { type: "delete" }
  | null;

export function UserDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const navigate = useNavigate();
  const { user: currentUser } = useAdminAuth();
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [resetting, setResetting] = useState(false);

  const { data, loading, error, reload } = useAsync(() => adminUserApi.get(userId), [userId]);

  const handleConfirm = async (reason: string, reportId?: number): Promise<void> => {
    if (!dialog) return;
    try {
      switch (dialog.type) {
        case "suspend":
          await adminUserApi.suspend(userId, reason, reportId);
          break;
        case "ban":
          await adminUserApi.ban(userId, reason, reportId);
          break;
        case "restore":
          await adminUserApi.restore(userId, reason, reportId);
          break;
        case "grant":
          await adminUserApi.grantModerator(userId, reason);
          break;
        case "revoke":
          await adminUserApi.revokeModerator(userId, reason);
          break;
        case "delete":
          await adminUserApi.remove(userId, reason);
          enqueueSnackbar("User deleted", { variant: "success" });
          navigate("/users");
          return;
      }
      enqueueSnackbar("Done", { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!newPassword) return;
    setResetting(true);
    try {
      await adminUserApi.resetPassword(userId, newPassword, resetReason || undefined);
      enqueueSnackbar("Password reset", { variant: "success" });
      setNewPassword("");
      setResetReason("");
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={data ? `@${data.username}` : "User"}
        subtitle={data?.email}
        actions={
          <Button variant="text" onClick={() => navigate("/users")}>
            Back to list
          </Button>
        }
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardHeader title="Identity" />
                <CardContent>
                  <Stack spacing={1}>
                    <Typography>Email: {data.email}</Typography>
                    <Typography>Username: @{data.username}</Typography>
                    <Typography>Nickname: {data.nickname ?? "—"}</Typography>
                    <Typography>Joined: {formatDate(data.createdAt)}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>Status:</Typography>
                      <Chip
                        label={data.accountStatus}
                        size="small"
                        color={
                          data.accountStatus === "ACTIVE"
                            ? "success"
                            : data.accountStatus === "SUSPENDED"
                              ? "warning"
                              : "error"
                        }
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>Roles:</Typography>
                      {data.roles.length === 0 ? (
                        <Typography color="text.secondary">none</Typography>
                      ) : (
                        data.roles.map((role) => (
                          <Chip key={role} label={role} size="small" variant="outlined" />
                        ))
                      )}
                    </Stack>
                    {data.moderationReason && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="overline">Last moderation</Typography>
                        <Typography variant="body2">{data.moderationReason}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(data.moderatedAt)}
                          {data.moderatedById ? ` by user #${data.moderatedById}` : ""}
                        </Typography>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card sx={{ mt: 2 }}>
                  <CardHeader title="Reset password" />
                  <CardContent>
                    <Stack spacing={2}>
                      <TextField
                        label="New password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        helperText="Minimum 8 characters"
                      />
                      <TextField
                        label="Reason (audit log)"
                        value={resetReason}
                        onChange={(event) => setResetReason(event.target.value)}
                      />
                      <Box>
                        <Button
                          variant="contained"
                          color="warning"
                          disabled={resetting || newPassword.length < 8}
                          onClick={() => void handleResetPassword()}
                        >
                          Reset password
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title="Stats" />
                <CardContent>
                  <Stack spacing={1}>
                    <Typography>Projects created: {data.projectsCreatedCount}</Typography>
                    <Typography>Comments posted: {data.commentsCount}</Typography>
                    <Typography>Reports filed: {data.reportsFiledCount}</Typography>
                    <Typography>Moderation actions: {data.moderationActionsTakenCount}</Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardHeader title="Moderation actions" />
                <CardContent>
                  <Stack spacing={1}>
                    {data.accountStatus === "ACTIVE" && (
                      <>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => setDialog({ type: "suspend" })}
                        >
                          Suspend
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => setDialog({ type: "ban" })}
                        >
                          Ban
                        </Button>
                      </>
                    )}
                    {data.accountStatus !== "ACTIVE" && (
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => setDialog({ type: "restore" })}
                      >
                        Restore to ACTIVE
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Divider />
                        {data.roles.includes("Moderator") ? (
                          <Button
                            variant="outlined"
                            onClick={() => setDialog({ type: "revoke" })}
                          >
                            Revoke Moderator
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            onClick={() => setDialog({ type: "grant" })}
                          >
                            Grant Moderator
                          </Button>
                        )}
                        <Divider />
                        <Button
                          variant="contained"
                          color="error"
                          disabled={currentUser?.id === userId}
                          onClick={() => setDialog({ type: "delete" })}
                        >
                          Hard delete
                        </Button>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </AsyncBoundary>

      <ReasonDialog
        open={dialog?.type === "suspend"}
        title="Suspend user"
        confirmLabel="Suspend"
        confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "ban"}
        title="Ban user"
        confirmLabel="Ban"
        confirmColor="error"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "restore"}
        title="Restore user"
        confirmLabel="Restore"
        confirmColor="success"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "grant"}
        title="Grant Moderator"
        showReportId={false}
        confirmLabel="Grant"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "revoke"}
        title="Revoke Moderator"
        showReportId={false}
        confirmLabel="Revoke"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "delete"}
        title="Hard delete user"
        description="This permanently removes the user and cannot be undone."
        showReportId={false}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
