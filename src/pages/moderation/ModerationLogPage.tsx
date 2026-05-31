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
import { Visibility as ViewIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { adminModerationLogApi, type ModerationLogFilter } from "@api/admin";
import type { ModerationActionType, ModerationTargetType } from "@api/types";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { formatDate } from "@utils/format";

const ACTION_TYPES: ModerationActionType[] = [
  "SUSPEND_USER",
  "BAN_USER",
  "RESTORE_USER",
  "HIDE_PROJECT",
  "RESTORE_PROJECT",
  "UNPUBLISH_PROJECT",
  "HIDE_COMMENT",
  "RESTORE_COMMENT",
  "REVIEW_REPORT",
  "RESOLVE_REPORT",
  "DISMISS_REPORT",
  "UPDATE_ROLES",
  "EDIT_USER",
  "EDIT_PROJECT",
  "EDIT_COMMENT",
  "UPDATE_REPORT",
  "RESET_PASSWORD",
  "HARD_DELETE_USER",
  "CREATE_STAFF_USER",
  "CREATE_ROLE",
  "RENAME_ROLE",
  "DELETE_ROLE"
];

export function ModerationLogPage(): JSX.Element {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ModerationLogFilter>({
    page: 1,
    limit: 50,
    order: "desc"
  });
  const { data, loading, error } = useAsync(
    () => adminModerationLogApi.list(filter),
    [JSON.stringify(filter)]
  );

  return (
    <>
      <PageHeader title="Moderation Log" subtitle="Audit trail of every staff action" />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Actor ID"
            value={filter.actorId ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                actorId: event.target.value ? Number(event.target.value) : undefined,
                page: 1
              })
            }
            size="small"
            inputProps={{ inputMode: "numeric" }}
          />
          <TextField
            label="Target type"
            select
            value={filter.targetType ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                targetType: (event.target.value || undefined) as ModerationTargetType | undefined,
                page: 1
              })
            }
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="USER">User</MenuItem>
            <MenuItem value="PROJECT">Project</MenuItem>
            <MenuItem value="COMMENT">Comment</MenuItem>
            <MenuItem value="REPORT">Report</MenuItem>
          </TextField>
          <TextField
            label="Target ID"
            value={filter.targetId ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                targetId: event.target.value ? Number(event.target.value) : undefined,
                page: 1
              })
            }
            size="small"
            inputProps={{ inputMode: "numeric" }}
          />
          <TextField
            label="Action"
            select
            value={filter.action ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                action: (event.target.value || undefined) as ModerationActionType | undefined,
                page: 1
              })
            }
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            {ACTION_TYPES.map((action) => (
              <MenuItem key={action} value={action}>
                {action}
              </MenuItem>
            ))}
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
                    <TableCell>Action</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>When</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>#{entry.id}</TableCell>
                      <TableCell>
                        <Chip label={entry.action} size="small" />
                      </TableCell>
                      <TableCell>{entry.targetLabel}</TableCell>
                      <TableCell>{entry.actorLabel ?? "system"}</TableCell>
                      <TableCell sx={{ maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {entry.reason ?? "—"}
                      </TableCell>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View snapshot">
                          <IconButton onClick={() => navigate(`/moderation-log/${entry.id}`)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
              rowsPerPageOptions={[25, 50, 100]}
            />
          </Paper>
        )}
      </AsyncBoundary>
    </>
  );
}
