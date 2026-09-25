import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { adminInsightsApi } from "@api/admin";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { MetricCard } from "@components/MetricCard";
import { PageHeader } from "@components/PageHeader";
import { formatRelative } from "@utils/format";

export function LiveActivityPage(): JSX.Element {
  const { data, loading, error, reload } = useAsync(() => adminInsightsApi.live(), []);

  useEffect(() => {
    const id = setInterval(() => {
      void reload();
    }, 30_000);
    return () => clearInterval(id);
  }, [reload]);

  return (
    <>
      <PageHeader
        title="Live Activity"
        subtitle="Real-time game and work sessions (auto-refreshes every 30s)"
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Active Players" value={data.metrics.activePlayers} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Active Game Sessions" value={data.metrics.activeGameSessions} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Active Creators" value={data.metrics.activeCreators} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Active Work Sessions" value={data.metrics.activeWorkSessions} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Games Today" value={data.metrics.gamesToday} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Games (7d)" value={data.metrics.games7Days} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Work Today" value={data.metrics.workToday} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Work (7d)" value={data.metrics.work7Days} />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Active games" />
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Project</TableCell>
                          <TableCell align="right">Players</TableCell>
                          <TableCell>Started</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.activeGames.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3}>
                              <Typography color="text.secondary">No active games</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {data.activeGames.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>{session.name}</TableCell>
                            <TableCell align="right">{session.players}</TableCell>
                            <TableCell>{formatRelative(session.startedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Active work sessions" />
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Project</TableCell>
                          <TableCell align="right">Creators</TableCell>
                          <TableCell>Last activity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.activeWork.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3}>
                              <Typography color="text.secondary">No active work sessions</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {data.activeWork.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>{session.name}</TableCell>
                            <TableCell align="right">{session.creators}</TableCell>
                            <TableCell>{formatRelative(session.lastActiveAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardHeader title="Recent games" />
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Project</TableCell>
                          <TableCell align="right">Players</TableCell>
                          <TableCell>Started</TableCell>
                          <TableCell>Ended</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.recentGames.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>{session.name}</TableCell>
                            <TableCell align="right">{session.players}</TableCell>
                            <TableCell>{formatRelative(session.startedAt)}</TableCell>
                            <TableCell>
                              {session.endedAt ? formatRelative(session.endedAt) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </AsyncBoundary>
    </>
  );
}
