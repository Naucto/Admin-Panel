import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { adminInsightsApi } from "@api/admin";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { MetricCard } from "@components/MetricCard";
import { PageHeader } from "@components/PageHeader";
import { formatDate, formatShortDate } from "@utils/format";

const PIE_COLORS = ["#e5d351", "#537d8d", "#3d763d", "#ac3931", "#a3963a"];

export function DashboardPage(): JSX.Element {
  const { data, loading, error } = useAsync(() => adminInsightsApi.dashboard(30), []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide moderation and analytics summary (last 30 days)"
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Active Players"
                  value={data.current.players}
                  subtitle={`${data.current.activeGameSessions} game sessions`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Active Creators"
                  value={data.current.creators}
                  subtitle={`${data.current.activeWorkSessions} work sessions`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Open Reports"
                  value={data.totals.openReports}
                  subtitle={`${data.totals.reportsLast7Days} new in last 7 days`}
                  color="warning"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Moderation Actions (7d)"
                  value={data.totals.moderationActionsLast7Days}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Total Users" value={data.totals.users} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Active Users" value={data.totals.activeUsers} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Suspended"
                  value={data.totals.suspendedUsers}
                  color="warning"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Banned"
                  value={data.totals.bannedUsers}
                  color="error"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Published Projects" value={data.totals.publishedProjects} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Hidden Projects"
                  value={data.totals.hiddenProjects}
                  color="error"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Total Views" value={data.totals.totalViews} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Likes" value={data.totals.likes} />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card>
                  <CardHeader title="Daily activity (last 30 days)" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={data.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" />
                        <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="#a6a6a6" />
                        <YAxis stroke="#a6a6a6" />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="logins"
                          name="Logins"
                          stroke="#e5d351"
                          fill="#e5d35155"
                        />
                        <Area
                          type="monotone"
                          dataKey="accountsCreated"
                          name="Accounts"
                          stroke="#537d8d"
                          fill="#537d8d55"
                        />
                        <Area
                          type="monotone"
                          dataKey="projectsPublished"
                          name="Publishes"
                          stroke="#3d763d"
                          fill="#3d763d55"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%" }}>
                  <CardHeader title="Account status" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={data.breakdowns.accounts}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={90}
                          label
                        >
                          {data.breakdowns.accounts.map((_entry, index) => (
                            <Cell
                              key={index}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Moderation actions by type (30d)" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.breakdowns.moderationActions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" />
                        <XAxis dataKey="name" stroke="#a6a6a6" interval={0} angle={-30} textAnchor="end" height={80} />
                        <YAxis stroke="#a6a6a6" />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                        <Bar dataKey="value" fill="#e5d351" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Top games by plays" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.top.byPlays} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" />
                        <XAxis type="number" stroke="#a6a6a6" />
                        <YAxis dataKey="name" type="category" stroke="#a6a6a6" width={150} />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                        <Bar dataKey="value" fill="#537d8d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card>
              <CardHeader title="Recent open reports" />
              <CardContent>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Reported</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentReports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography color="text.secondary">No open reports — nice!</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {data.recentReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>#{report.id}</TableCell>
                        <TableCell>{report.targetLabel}</TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>
                          <Chip
                            label={report.status}
                            size="small"
                            color={report.status === "OPEN" ? "warning" : "info"}
                          />
                        </TableCell>
                        <TableCell>{formatDate(report.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </AsyncBoundary>
    </>
  );
}
