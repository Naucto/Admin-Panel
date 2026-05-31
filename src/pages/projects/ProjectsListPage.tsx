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
  VisibilityOff as HideIcon,
  Restore as RestoreIcon,
  Archive as ArchiveIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminProjectApi, type AdminProjectFilter } from "@api/admin";
import type { AdminProject, ProjectStatus } from "@api/types";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";
import { formatDate } from "@utils/format";

type DialogState =
  | { type: "hide"; project: AdminProject }
  | { type: "restore"; project: AdminProject }
  | { type: "unpublish"; project: AdminProject }
  | null;

export function ProjectsListPage(): JSX.Element {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState<AdminProjectFilter>({
    page: 1,
    limit: 25,
    order: "desc"
  });
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data, loading, error, reload } = useAsync(
    () => adminProjectApi.list(filter),
    [JSON.stringify(filter)]
  );

  const handleConfirm = async (reason: string, reportId?: number): Promise<void> => {
    if (!dialog) return;
    try {
      if (dialog.type === "hide") await adminProjectApi.hide(dialog.project.id, reason, reportId);
      if (dialog.type === "restore") await adminProjectApi.restore(dialog.project.id, reason, reportId);
      if (dialog.type === "unpublish") await adminProjectApi.unpublish(dialog.project.id, reason, reportId);
      enqueueSnackbar(`Project ${dialog.type}d`, { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader title="Projects" subtitle="Browse, hide, restore, or unpublish projects" />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Name"
            value={filter.name ?? ""}
            onChange={(event) => setFilter({ ...filter, name: event.target.value, page: 1 })}
            size="small"
          />
          <TextField
            label="Status"
            select
            value={filter.status ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                status: (event.target.value || undefined) as ProjectStatus | undefined,
                page: 1
              })
            }
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="IN_PROGRESS">In progress</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="ARCHIVED">Archived</MenuItem>
          </TextField>
          <TextField
            label="Hidden"
            select
            value={filter.hidden === undefined ? "" : filter.hidden ? "true" : "false"}
            onChange={(event) =>
              setFilter({
                ...filter,
                hidden:
                  event.target.value === ""
                    ? undefined
                    : event.target.value === "true",
                page: 1
              })
            }
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="false">Visible</MenuItem>
            <MenuItem value="true">Hidden</MenuItem>
          </TextField>
          <TextField
            label="Creator ID"
            value={filter.userId ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                userId: event.target.value ? Number(event.target.value) : undefined,
                page: 1
              })
            }
            size="small"
            inputProps={{ inputMode: "numeric" }}
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
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Hidden</TableCell>
                    <TableCell align="right">Views</TableCell>
                    <TableCell align="right">Likes</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((project) => (
                    <TableRow key={project.id} hover>
                      <TableCell>{project.id}</TableCell>
                      <TableCell>{project.publishedName || project.name}</TableCell>
                      <TableCell>
                        <Chip label={project.status ?? "—"} size="small" />
                      </TableCell>
                      <TableCell>
                        {project.hidden ? (
                          <Chip label="Hidden" color="error" size="small" />
                        ) : (
                          <Chip label="Visible" color="success" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">{project.viewCount}</TableCell>
                      <TableCell align="right">{project.likes}</TableCell>
                      <TableCell>{formatDate(project.updatedAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton onClick={() => navigate(`/projects/${project.id}`)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!project.hidden && (
                          <Tooltip title="Hide">
                            <IconButton
                              color="warning"
                              onClick={() => setDialog({ type: "hide", project })}
                            >
                              <HideIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {project.hidden && (
                          <Tooltip title="Restore">
                            <IconButton
                              color="success"
                              onClick={() => setDialog({ type: "restore", project })}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {project.status === "COMPLETED" && (
                          <Tooltip title="Unpublish">
                            <IconButton onClick={() => setDialog({ type: "unpublish", project })}>
                              <ArchiveIcon fontSize="small" />
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
        open={dialog?.type === "hide"}
        title="Hide project"
        description="Hides the project from public surfaces and archives it."
        confirmLabel="Hide"
        confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "restore"}
        title="Restore project"
        confirmLabel="Restore"
        confirmColor="success"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "unpublish"}
        title="Unpublish project"
        description="Reverts the project to IN_PROGRESS status."
        confirmLabel="Unpublish"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
