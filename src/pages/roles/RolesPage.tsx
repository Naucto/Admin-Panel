import { useState, useEffect, type FormEvent } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { adminRoleApi } from "@api/admin";
import type { AdminRole } from "@api/types";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";

type DialogState =
  | { type: "rename"; role: AdminRole }
  | { type: "delete"; role: AdminRole }
  | null;

export function RolesPage(): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [newName, setNewName] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameReason, setRenameReason] = useState("");
  const [renaming, setRenaming] = useState(false);

  const { data, loading, error, reload } = useAsync(() => adminRoleApi.list(), []);

  useEffect(() => {
    if (dialog?.type === "rename") {
      setRenameValue(dialog.role.name);
      setRenameReason("");
    }
  }, [dialog]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await adminRoleApi.create(newName.trim(), createReason || undefined);
      enqueueSnackbar(`Role "${newName}" created`, { variant: "success" });
      setNewName("");
      setCreateReason("");
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleRenameSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (dialog?.type !== "rename" || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await adminRoleApi.rename(dialog.role.id, renameValue.trim(), renameReason || undefined);
      enqueueSnackbar("Role renamed", { variant: "success" });
      setDialog(null);
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteConfirm = async (reason: string): Promise<void> => {
    if (dialog?.type !== "delete") return;
    try {
      await adminRoleApi.remove(dialog.role.id, reason || undefined);
      enqueueSnackbar("Role deleted", { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Manage custom roles. Admin and Moderator are protected."
      />
      <Card sx={{ mb: 2 }}>
        <CardHeader title="Create role" />
        <CardContent>
          <form onSubmit={handleCreate}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Role name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                size="small"
                required
              />
              <TextField
                label="Reason (audit log)"
                value={createReason}
                onChange={(event) => setCreateReason(event.target.value)}
                size="small"
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={creating}>
                Create
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Card>
            <CardHeader title={`Roles (${data.length})`} />
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography color="text.secondary">No roles defined</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {data.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>{role.id}</TableCell>
                      <TableCell>{role.name}</TableCell>
                      <TableCell>{role.userCount}</TableCell>
                      <TableCell>
                        {role.canonical ? (
                          <Chip label="Canonical" color="primary" size="small" />
                        ) : (
                          <Chip label="Custom" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={role.canonical ? "Canonical roles cannot be renamed" : "Rename"}>
                          <span>
                            <IconButton
                              disabled={role.canonical}
                              onClick={() => setDialog({ type: "rename", role })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            role.canonical
                              ? "Canonical roles cannot be deleted"
                              : role.userCount > 0
                                ? "Cannot delete: role still has users"
                                : "Delete"
                          }
                        >
                          <span>
                            <IconButton
                              color="error"
                              disabled={role.canonical || role.userCount > 0}
                              onClick={() => setDialog({ type: "delete", role })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </AsyncBoundary>

      <Dialog
        open={dialog?.type === "rename"}
        onClose={renaming ? undefined : () => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleRenameSubmit}>
          <DialogTitle>Rename role</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="New name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label="Reason (audit log)"
                value={renameReason}
                onChange={(event) => setRenameReason(event.target.value)}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)} disabled={renaming}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={renaming}>
              Rename
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ReasonDialog
        open={dialog?.type === "delete"}
        title={
          dialog?.type === "delete" ? `Delete role "${dialog.role.name}"` : "Delete role"
        }
        description="This role will be permanently removed."
        showReportId={false}
        confirmLabel="Delete"
        confirmColor="error"
        onClose={() => setDialog(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
