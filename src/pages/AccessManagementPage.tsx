import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { PersonAdd, PersonRemove, Search as SearchIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { adminUserApi } from "@api/admin";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";

type DialogState =
  | { type: "grant"; userId: number; username: string }
  | { type: "revoke"; userId: number; username: string }
  | null;

export function AccessManagementPage(): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);

  const staffAsync = useAsync(
    () => adminUserApi.list({ page: 1, limit: 50, role: "Moderator" }),
    []
  );
  const adminsAsync = useAsync(
    () => adminUserApi.list({ page: 1, limit: 50, role: "Admin" }),
    []
  );
  const candidatesAsync = useAsync(
    () =>
      searchQuery
        ? adminUserApi.list({ page: 1, limit: 25, email: searchQuery })
        : Promise.resolve({
            data: [],
            meta: { page: 1, limit: 25, total: 0, totalPages: 0 }
          }),
    [searchQuery]
  );

  const handleConfirm = async (reason: string): Promise<void> => {
    if (!dialog) return;
    try {
      if (dialog.type === "grant") {
        await adminUserApi.grantModerator(dialog.userId, reason);
        enqueueSnackbar(`Granted Moderator to @${dialog.username}`, { variant: "success" });
      } else {
        await adminUserApi.revokeModerator(dialog.userId, reason);
        enqueueSnackbar(`Revoked Moderator from @${dialog.username}`, { variant: "success" });
      }
      await staffAsync.reload();
      await candidatesAsync.reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader
        title="Access Management"
        subtitle="Grant or revoke Moderator role. Admins are read-only here — manage from Users."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Current Admins" />
            <CardContent>
              <AsyncBoundary loading={adminsAsync.loading} error={adminsAsync.error}>
                {adminsAsync.data && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {adminsAsync.data.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>@{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.accountStatus}
                              size="small"
                              color={user.accountStatus === "ACTIVE" ? "success" : "error"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AsyncBoundary>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Current Moderators" />
            <CardContent>
              <AsyncBoundary loading={staffAsync.loading} error={staffAsync.error}>
                {staffAsync.data && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staffAsync.data.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography color="text.secondary">No moderators yet</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {staffAsync.data.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>@{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              color="error"
                              onClick={() =>
                                setDialog({
                                  type: "revoke",
                                  userId: user.id,
                                  username: user.username
                                })
                              }
                            >
                              <PersonRemove fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AsyncBoundary>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title="Add Moderator" />
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Search by email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  size="small"
                  fullWidth
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setSearchQuery(search);
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={() => setSearchQuery(search)}
                >
                  Search
                </Button>
              </Stack>
              <AsyncBoundary loading={candidatesAsync.loading} error={candidatesAsync.error}>
                {candidatesAsync.data && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Roles</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidatesAsync.data.data.length === 0 && searchQuery && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography color="text.secondary">No matches</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {candidatesAsync.data.data.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>@{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              {user.roles.map((role) => (
                                <Chip key={role} label={role} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {!user.roles.includes("Moderator") && (
                              <IconButton
                                color="success"
                                onClick={() =>
                                  setDialog({
                                    type: "grant",
                                    userId: user.id,
                                    username: user.username
                                  })
                                }
                              >
                                <PersonAdd fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AsyncBoundary>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ReasonDialog
        open={dialog?.type === "grant"}
        title={`Grant Moderator to @${dialog?.type === "grant" ? dialog.username : ""}`}
        showReportId={false}
        confirmLabel="Grant"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "revoke"}
        title={`Revoke Moderator from @${dialog?.type === "revoke" ? dialog.username : ""}`}
        showReportId={false}
        confirmLabel="Revoke"
        confirmColor="error"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
