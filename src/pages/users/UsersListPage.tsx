import { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Pause as SuspendIcon,
  Close as BanIcon,
  Check as RestoreIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminUserApi, type AdminUserFilter } from "@api/admin";
import type { AccountStatus, AdminUser } from "@api/types";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";
import { formatDate } from "@utils/format";

type DialogState =
  | { type: "suspend"; user: AdminUser }
  | { type: "ban"; user: AdminUser }
  | { type: "restore"; user: AdminUser }
  | null;

function statusColor(status: AccountStatus): "success" | "warning" | "error" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  return "error";
}

export function UsersListPage(): JSX.Element {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState<AdminUserFilter>({ page: 1, limit: 25, order: "desc" });
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data, loading, error, reload } = useAsync(
    () => adminUserApi.list(filter),
    [JSON.stringify(filter)]
  );

  const handleDialogConfirm = async (reason: string, reportId?: number): Promise<void> => {
    if (!dialog) return;
    try {
      if (dialog.type === "suspend") await adminUserApi.suspend(dialog.user.id, reason, reportId);
      if (dialog.type === "ban") await adminUserApi.ban(dialog.user.id, reason, reportId);
      if (dialog.type === "restore") await adminUserApi.restore(dialog.user.id, reason, reportId);
      enqueueSnackbar(`User ${dialog.type}d`, { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Browse, filter, and moderate user accounts" />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Email"
            value={filter.email ?? ""}
            onChange={(event) => setFilter({ ...filter, email: event.target.value, page: 1 })}
            size="small"
          />
          <TextField
            label="Username"
            value={filter.username ?? ""}
            onChange={(event) => setFilter({ ...filter, username: event.target.value, page: 1 })}
            size="small"
          />
          <TextField
            label="Nickname"
            value={filter.nickname ?? ""}
            onChange={(event) => setFilter({ ...filter, nickname: event.target.value, page: 1 })}
            size="small"
          />
          <TextField
            label="Status"
            select
            value={filter.accountStatus ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                accountStatus: (event.target.value || undefined) as AccountStatus | undefined,
                page: 1
              })
            }
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
            <MenuItem value="BANNED">Banned</MenuItem>
          </TextField>
          <TextField
            label="Role"
            value={filter.role ?? ""}
            onChange={(event) => setFilter({ ...filter, role: event.target.value || undefined, page: 1 })}
            size="small"
          />
        </Stack>
      </Paper>

      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Paper>
            <Box sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Nickname</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Roles</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.nickname ?? "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.accountStatus}
                          color={statusColor(user.accountStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {user.roles.map((role) => (
                            <Chip key={role} label={role} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton onClick={() => navigate(`/users/${user.id}`)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {user.accountStatus === "ACTIVE" && (
                          <>
                            <Tooltip title="Suspend">
                              <IconButton onClick={() => setDialog({ type: "suspend", user })}>
                                <SuspendIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ban">
                              <IconButton
                                color="error"
                                onClick={() => setDialog({ type: "ban", user })}
                              >
                                <BanIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {user.accountStatus !== "ACTIVE" && (
                          <Tooltip title="Restore">
                            <IconButton
                              color="success"
                              onClick={() => setDialog({ type: "restore", user })}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={data.meta.total}
              page={data.meta.page - 1}
              onPageChange={(_event, newPage) => setFilter({ ...filter, page: newPage + 1 })}
              rowsPerPage={data.meta.limit}
              onRowsPerPageChange={(event) =>
                setFilter({ ...filter, limit: Number(event.target.value), page: 1 })
              }
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        )}
      </AsyncBoundary>

      <ReasonDialog
        open={dialog?.type === "suspend"}
        title="Suspend user"
        description={`Suspending @${dialog?.user.username ?? ""} prevents them from creating, publishing, commenting, liking or joining sessions.`}
        confirmLabel="Suspend"
        confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "ban"}
        title="Ban user"
        description={`Banning @${dialog?.user.username ?? ""} blocks all access and sign-in.`}
        confirmLabel="Ban"
        confirmColor="error"
        onClose={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "restore"}
        title="Restore user"
        description={`Restore @${dialog?.user.username ?? ""} to ACTIVE status?`}
        confirmLabel="Restore"
        confirmColor="success"
        onClose={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      />
    </>
  );
}
