import {
  Card,
  CardContent,
  CardHeader,
  Grid
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const PIE_COLORS = ["#3d763d", "#ac3931", "#e5d351"];

export function SocialOverviewPage(): JSX.Element {
  const { data, loading, error } = useAsync(() => adminInsightsApi.social(), []);

  return (
    <>
      <PageHeader title="Social Overview" subtitle="Likes, comments, friendships and subscriptions" />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Likes" value={data.metrics.likes} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Comments" value={data.metrics.comments} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Friendships" value={data.metrics.friendships} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Friend Requests" value={data.metrics.friendRequests} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Subscriptions" value={data.metrics.subscriptions} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Active Subscriptions" value={data.metrics.activeSubscriptions} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Visible comments" value={data.metrics.visibleComments} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard
                  title="Hidden comments"
                  value={data.metrics.hiddenComments}
                  color="warning"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardHeader title="Comment breakdown" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={data.commentBreakdown}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={90}
                          label
                        >
                          {data.commentBreakdown.map((_entry, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardHeader title="Top liked games" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.topLikedGames} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" />
                        <XAxis type="number" stroke="#a6a6a6" />
                        <YAxis dataKey="name" type="category" stroke="#a6a6a6" width={140} />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                        <Bar dataKey="value" fill="#e5d351" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardHeader title="Top commented games" />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.topCommentedGames} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#3e3e3e" />
                        <XAxis type="number" stroke="#a6a6a6" />
                        <YAxis dataKey="name" type="category" stroke="#a6a6a6" width={140} />
                        <Tooltip contentStyle={{ background: "#222", border: "1px solid #3e3e3e" }} />
                        <Bar dataKey="value" fill="#537d8d" />
                      </BarChart>
                    </ResponsiveContainer>
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
