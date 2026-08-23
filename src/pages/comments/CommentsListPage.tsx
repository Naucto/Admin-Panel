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
  Restore as RestoreIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminCommentApi, type AdminCommentFilter } from "@api/admin";
import type { AdminComment } from "@api/types";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { EntityLink } from "@components/EntityLink";
import { ReasonDialog } from "@components/ReasonDialog";
import { formatDate } from "@utils/format";

type DialogState =
  | { type: "hide"; comment: AdminComment }
  | { type: "restore"; comment: AdminComment }
  | null;

export function CommentsListPage(): JSX.Element {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState<AdminCommentFilter>({
    page: 1,
    limit: 25,
    order: "desc"
  });
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data, loading, error, reload } = useAsync(
    () => adminCommentApi.list(filter),
    [JSON.stringify(filter)]
  );

  const handleConfirm = async (reason: string): Promise<void> => {
    if (!dialog) return;
    try {
      if (dialog.type === "hide") await adminCommentApi.hide(dialog.comment.projectId, dialog.comment.id, reason);
      if (dialog.type === "restore")
        await adminCommentApi.restore(dialog.comment.projectId, dialog.comment.id, reason);
      enqueueSnackbar(`Comment ${dialog.type}d`, { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader title="Comments" subtitle="Browse, hide, or restore comments" />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Project ID"
            value={filter.projectId ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                projectId: event.target.value ? Number(event.target.value) : undefined,
                page: 1
              })
            }
            size="small"
            inputProps={{ inputMode: "numeric" }}
          />
          <TextField
            label="Author ID"
            value={filter.authorId ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                authorId: event.target.value ? Number(event.target.value) : undefined,
                page: 1
              })
            }
            size="small"
            inputProps={{ inputMode: "numeric" }}
          />
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
                    <TableCell>Project</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Content</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((comment) => (
                    <TableRow key={comment.id} hover>
                      <TableCell>{comment.id}</TableCell>
                      <TableCell>
                        <EntityLink
                          type="PROJECT"
                          id={comment.projectId}
                          label={comment.projectName}
                        />
                      </TableCell>
                      <TableCell>
                        <EntityLink
                          type="USER"
                          id={comment.authorId}
                          label={
                            comment.authorUsername
                              ? `@${comment.authorUsername}`
                              : null
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {comment.content}
                      </TableCell>
                      <TableCell>
                        {comment.deleted && <Chip label="Deleted" color="default" size="small" />}
                        {comment.hidden && <Chip label="Hidden" color="error" size="small" />}
                        {!comment.deleted && !comment.hidden && (
                          <Chip label="Visible" color="success" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(comment.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton onClick={() => navigate(`/comments/${comment.id}`)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!comment.hidden && (
                          <Tooltip title="Hide">
                            <IconButton
                              color="warning"
                              onClick={() => setDialog({ type: "hide", comment })}
                            >
                              <HideIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {comment.hidden && (
                          <Tooltip title="Restore">
                            <IconButton
                              color="success"
                              onClick={() => setDialog({ type: "restore", comment })}
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
        open={dialog?.type === "hide"}
        title="Hide comment"
        confirmLabel="Hide"
        confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog?.type === "restore"}
        title="Restore comment"
        confirmLabel="Restore"
        confirmColor="success"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
