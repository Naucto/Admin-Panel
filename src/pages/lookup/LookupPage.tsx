import { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from "@mui/material";
import { adminLookupApi } from "@api/admin";
import type { PaginationParams } from "@api/types";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";

type LookupKey =
  | "likes"
  | "friendships"
  | "friendRequests"
  | "subscriptions"
  | "gameSessions"
  | "workSessions"
  | "analyticsEvents"
  | "dailyRollups";

type LookupConfig = {
  title: string;
  subtitle: string;
  fetcher: (params: PaginationParams) => Promise<{
    data: Array<Record<string, unknown>>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
};

const LOOKUP_CONFIGS: Record<LookupKey, LookupConfig> = {
  likes: {
    title: "Likes",
    subtitle: "All like records",
    fetcher: adminLookupApi.likes
  },
  friendships: {
    title: "Friendships",
    subtitle: "All friendship records",
    fetcher: adminLookupApi.friendships
  },
  friendRequests: {
    title: "Friend Requests",
    subtitle: "All friend requests",
    fetcher: adminLookupApi.friendRequests
  },
  subscriptions: {
    title: "Subscriptions",
    subtitle: "All subscription records",
    fetcher: adminLookupApi.subscriptions
  },
  gameSessions: {
    title: "Game Sessions",
    subtitle: "Historical game sessions",
    fetcher: adminLookupApi.gameSessions
  },
  workSessions: {
    title: "Work Sessions",
    subtitle: "Historical work sessions",
    fetcher: adminLookupApi.workSessions
  },
  analyticsEvents: {
    title: "Analytics Events",
    subtitle: "Raw analytics events (last RAW_ANALYTICS_RETENTION_DAYS days)",
    fetcher: adminLookupApi.analyticsEvents
  },
  dailyRollups: {
    title: "Daily Rollups",
    subtitle: "Pre-aggregated daily analytics",
    fetcher: adminLookupApi.dailyRollups
  }
};

type LookupPageProps = {
  resource: LookupKey;
};

function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (isPrimitive(value)) return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function LookupPage({ resource }: LookupPageProps): JSX.Element {
  const config = LOOKUP_CONFIGS[resource];
  const [params, setParams] = useState<PaginationParams>({ page: 1, limit: 25, order: "desc" });
  const { data, loading, error } = useAsync(
    () => config.fetcher(params),
    [resource, JSON.stringify(params)]
  );

  const columns = useMemo<string[]>(() => {
    if (!data?.data.length) return [];
    return Object.keys(data.data[0]!);
  }, [data]);

  return (
    <>
      <PageHeader title={config.title} subtitle={config.subtitle} />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Paper>
            <Box sx={{ overflowX: "auto" }}>
              {columns.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">No records</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell key={col}>{col}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.data.map((row, index) => (
                      <TableRow key={index} hover>
                        {columns.map((col) => (
                          <TableCell key={col} sx={{ maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {formatCell(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
            <TablePagination
              component="div"
              count={data.meta.total}
              page={data.meta.page - 1}
              onPageChange={(_event, newPage) => setParams({ ...params, page: newPage + 1 })}
              rowsPerPage={data.meta.limit}
              onRowsPerPageChange={(event) =>
                setParams({ ...params, limit: Number(event.target.value), page: 1 })
              }
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        )}
      </AsyncBoundary>
    </>
  );
}
