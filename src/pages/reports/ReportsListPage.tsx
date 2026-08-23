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
import { adminReportApi, type AdminReportFilter } from "@api/admin";
import type { ReportStatus, ReportTargetType } from "@api/types";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { formatDate } from "@utils/format";

const STATUS_COLOR: Record<ReportStatus, "warning" | "info" | "success" | "default"> = {
  OPEN: "warning",
  IN_REVIEW: "info",
  RESOLVED: "success",
  DISMISSED: "default"
};

export function ReportsListPage(): JSX.Element {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<AdminReportFilter>({
    page: 1,
    limit: 25,
    order: "desc"
  });
  const { data, loading, error } = useAsync(
    () => adminReportApi.list(filter),
    [JSON.stringify(filter)]
  );

  return (
    <>
      <PageHeader title="Reports" subtitle="Triage user-submitted reports" />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Target type"
            select
            value={filter.targetType ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                targetType: (event.target.value || undefined) as ReportTargetType | undefined,
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
          </TextField>
          <TextField
            label="Status"
            select
            value={filter.status ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                status: (event.target.value || undefined) as ReportStatus | undefined,
                page: 1
              })
            }
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="OPEN">Open</MenuItem>
            <MenuItem value="IN_REVIEW">In review</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
            <MenuItem value="DISMISSED">Dismissed</MenuItem>
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
            label="Reporter ID"
            value={filter.reporterId ?? ""}
            onChange={(event) =>
              setFilter({
                ...filter,
                reporterId: event.target.value ? Number(event.target.value) : undefined,
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
                    <TableCell>Target</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Reporter</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell>#{report.id}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Chip label={report.targetType} size="small" variant="outlined" />
                          <span>{report.targetLabel}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>
                        {report.reporterUsername
                          ? `@${report.reporterUsername}`
                          : `#${report.reporterId}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.status}
                          size="small"
                          color={STATUS_COLOR[report.status]}
                        />
                      </TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton onClick={() => navigate(`/reports/${report.id}`)}>
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
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        )}
      </AsyncBoundary>
    </>
  );
}
