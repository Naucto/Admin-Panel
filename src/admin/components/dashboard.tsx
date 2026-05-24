import React, { useEffect, useState } from "react";
import { ApiClient } from "adminjs";
import { Box, H2, H3, Text } from "@adminjs/design-system";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ThemeBoot } from "./theme-tools.js";
import { AdminRecordLink } from "./admin-resource-link.js";

type ChartRow = {
  name: string;
  value: number;
  [key: string]: number | string | undefined;
};

type DailyRow = {
  date: string;
  accountsCreated: number;
  logins: number;
  projectsCreated: number;
  projectsPublished: number;
  projectsUnpublished: number;
  commentsCreated: number;
  likesCreated: number;
  likesRemoved: number;
  gameViews: number;
  gameSessionsStarted: number;
  gameSessionsEnded: number;
  workSessionsStarted: number;
  workSessionsJoined: number;
  workSessionsLeft: number;
};

type RecentReport = {
  id: number;
  targetLabel?: string;
  targetRecordId?: number;
  targetResourceId?: string;
  targetType: string;
  targetId: number;
  status: string;
  reason: string;
  createdAt: string;
};

type DashboardData = {
  forbidden?: boolean;
  current?: {
    players: number;
    creators: number;
    activeGameSessions: number;
    activeWorkSessions: number;
  };
  currentPlayers?: number;
  currentCreators?: number;
  totals: Record<string, number>;
  breakdowns: {
    accounts: ChartRow[];
    projects: ChartRow[];
    reports: ChartRow[];
    moderationActions: ChartRow[];
  };
  top: {
    activeGames: ChartRow[];
    activeCreationProjects: ChartRow[];
    byViews: ChartRow[];
    byLikes: ChartRow[];
    byPlays: ChartRow[];
    byComments: ChartRow[];
  };
  recentReports: RecentReport[];
  daily: DailyRow[];
};

const palette = [
  "var(--naucto-primary)",
  "var(--naucto-secondary)",
  "var(--naucto-success)",
  "var(--naucto-danger)",
  "var(--naucto-muted)"
];

const tooltipStyle = {
  background: "var(--naucto-surface)",
  border: "1px solid var(--naucto-border)",
  borderRadius: "8px",
  color: "var(--naucto-text)"
};

const tooltipItemStyle = {
  color: "var(--naucto-text)"
};

const statLabels: Record<string, string> = {
  users: "Users",
  activeUsers: "Active users",
  suspendedUsers: "Suspended users",
  bannedUsers: "Banned users",
  totalProjects: "Total games",
  publishedProjects: "Published games",
  hiddenProjects: "Hidden games",
  totalViews: "All-time views",
  totalProjectLikes: "Project like counter",
  comments: "All comments",
  deletedComments: "Deleted comments",
  hiddenComments: "Hidden comments",
  openReports: "Open reports",
  reportsLast7Days: "Reports, 7 days",
  moderationActionsLast7Days: "Mod actions, 7 days",
  likes: "Like records",
  totalGameSessions: "All-time plays",
  endedGameSessions: "Completed plays",
  totalWorkSessions: "Build sessions",
  eventsLast24Hours: "Events, 24 hours"
};

function formatNumber(value?: number): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const StatCard: React.FC<{ label: string; value: number; hint?: string }> = ({
  label,
  value,
  hint
}) => (
  <Box className="naucto-card" p="lg">
    <Text className="naucto-muted">{label}</Text>
    <H3>{formatNumber(value)}</H3>
    {hint ? <Text className="naucto-muted">{hint}</Text> : null}
  </Box>
);

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  height?: string;
}> = ({ title, children, height = "320px" }) => (
  <Box className="naucto-card naucto-chart" p="lg">
    <H3>{title}</H3>
    <Box height={height} mt="lg">
      {children}
    </Box>
  </Box>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <Box height="100%" display="flex" alignItems="center" justifyContent="center">
    <Text className="naucto-muted">{label}</Text>
  </Box>
);

const BreakdownPie: React.FC<{ rows: ChartRow[] }> = ({ rows }) => {
  if (!rows.length) {
    return <EmptyState label="No data yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
        >
          {rows.map((row, index) => (
            <Cell key={row.name} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatNumber(Number(value))}
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
        />
        <Legend formatter={(value) => humanize(String(value))} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const TopBarChart: React.FC<{
  rows: ChartRow[];
  emptyLabel: string;
  valueName: string;
}> = ({ rows, emptyLabel, valueName }) => {
  if (!rows.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 12, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          dataKey="name"
          type="category"
          width={130}
          tickFormatter={(value) =>
            String(value).length > 18 ? `${String(value).slice(0, 18)}...` : value
          }
        />
        <Tooltip
          formatter={(value) => formatNumber(Number(value))}
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
        />
        <Bar
          dataKey="value"
          name={valueName}
          fill="var(--naucto-primary)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const TopList: React.FC<{
  rows: ChartRow[];
  columns: Array<{ key: string; label: string }>;
  emptyLabel: string;
}> = ({ rows, columns, emptyLabel }) => {
  if (!rows.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <Box>
      {rows.map((row) => (
        <Box key={`${row.projectId}-${row.name}`} className="naucto-soft-card" p="lg" mb="default">
          <Box display="flex" justifyContent="space-between" alignItems="center" gridGap="lg">
            <Box>
              <Text fontWeight="bold">{row.name}</Text>
              <Text className="naucto-muted">Project {row.projectId}</Text>
            </Box>
            <Box display="flex" gridGap="default" flexWrap="wrap" justifyContent="flex-end">
              {columns.map((column) => (
                <span key={column.key} className="naucto-pill">
                  {formatNumber(Number(row[column.key] ?? 0))} {column.label.toLowerCase()}
                </span>
              ))}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const RecentReports: React.FC<{ reports: RecentReport[] }> = ({ reports }) => {
  if (!reports.length) {
    return <EmptyState label="No open reports" />;
  }

  return (
    <Box>
      {reports.map((report) => (
        <Box key={report.id} py="sm" borderBottom="default">
          <Text>
            #{report.id}{" "}
            <AdminRecordLink
              resourceId={report.targetResourceId}
              recordId={report.targetRecordId ?? report.targetId}
              label={report.targetLabel ?? `${humanize(report.targetType)} #${report.targetId}`}
            />
          </Text>
          <Text className="naucto-muted">
            {humanize(report.status)} · {report.reason} ·{" "}
            {new Date(report.createdAt).toLocaleString()}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const api = new ApiClient();
    api.getDashboard().then((response) => {
      setData(response.data as DashboardData);
    });
  }, []);

  if (data?.forbidden) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <H2>Naucto Admin</H2>
        <Text>Moderation tools are available from the sidebar.</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <Text>Loading dashboard...</Text>
      </Box>
    );
  }

  const currentPlayers = data.current?.players ?? data.currentPlayers ?? 0;
  const currentCreators = data.current?.creators ?? data.currentCreators ?? 0;

  return (
    <Box p="xl" className="naucto-admin-page">
      <ThemeBoot />
      <H2>Naucto Traffic</H2>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(190px, 1fr))"
        gridGap="lg"
        mt="lg"
      >
        <StatCard
          label="Current players"
          value={currentPlayers}
          hint={`${formatNumber(data.current?.activeGameSessions)} active sessions`}
        />
        <StatCard
          label="Current creators"
          value={currentCreators}
          hint={`${formatNumber(data.current?.activeWorkSessions)} build sessions`}
        />
        {Object.entries(data.totals).map(([key, value]) => (
          <StatCard key={key} label={statLabels[key] ?? humanize(key)} value={value} />
        ))}
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(360px, 1fr))"
        gridGap="lg"
        mt="xl"
      >
        <Section title="Live games now">
          <TopList
            rows={data.top.activeGames}
            columns={[
              { key: "players", label: "Players" },
              { key: "value", label: "Sessions" },
              { key: "views", label: "Views" },
              { key: "likes", label: "Likes" }
            ]}
            emptyLabel="No games are being played right now"
          />
        </Section>

        <Section title="Live build sessions">
          <TopList
            rows={data.top.activeCreationProjects}
            columns={[
              { key: "creators", label: "Creators" },
              { key: "value", label: "Sessions" }
            ]}
            emptyLabel="No active creation sessions"
          />
        </Section>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(360px, 1fr))"
        gridGap="lg"
        mt="xl"
      >
        <Section title="Game traffic history">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
              <Legend />
              <Area
                type="monotone"
                dataKey="gameViews"
                stackId="traffic"
                stroke="var(--naucto-primary)"
                fill="var(--naucto-primary-soft)"
                name="Views"
              />
              <Area
                type="monotone"
                dataKey="gameSessionsStarted"
                stackId="traffic"
                stroke="var(--naucto-success)"
                fill="var(--naucto-success-soft)"
                name="Plays"
              />
              <Area
                type="monotone"
                dataKey="workSessionsStarted"
                stackId="traffic"
                stroke="var(--naucto-secondary)"
                fill="var(--naucto-secondary-soft)"
                name="Builds"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Creation and social history">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="accountsCreated"
                stroke="var(--naucto-primary)"
                name="Accounts"
              />
              <Line
                type="monotone"
                dataKey="projectsCreated"
                stroke="var(--naucto-secondary)"
                name="Projects"
              />
              <Line
                type="monotone"
                dataKey="projectsPublished"
                stroke="var(--naucto-success)"
                name="Published"
              />
              <Line
                type="monotone"
                dataKey="commentsCreated"
                stroke="var(--naucto-danger)"
                name="Comments"
              />
              <Line
                type="monotone"
                dataKey="likesCreated"
                stroke="var(--naucto-muted)"
                name="Likes"
              />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))"
        gridGap="lg"
        mt="xl"
      >
        <Section title="Accounts">
          <BreakdownPie rows={data.breakdowns.accounts} />
        </Section>
        <Section title="Game status">
          <BreakdownPie rows={data.breakdowns.projects} />
        </Section>
        <Section title="Report status">
          <BreakdownPie rows={data.breakdowns.reports} />
        </Section>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(360px, 1fr))"
        gridGap="lg"
        mt="xl"
      >
        <Section title="Top games by plays">
          <TopBarChart
            rows={data.top.byPlays}
            valueName="Plays"
            emptyLabel="No play sessions yet"
          />
        </Section>
        <Section title="Top games by views">
          <TopBarChart
            rows={data.top.byViews}
            valueName="Views"
            emptyLabel="No game views yet"
          />
        </Section>
        <Section title="Top games by likes">
          <TopBarChart
            rows={data.top.byLikes}
            valueName="Likes"
            emptyLabel="No likes yet"
          />
        </Section>
        <Section title="Top games by comments">
          <TopBarChart
            rows={data.top.byComments}
            valueName="Comments"
            emptyLabel="No comments yet"
          />
        </Section>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(360px, 1fr))"
        gridGap="lg"
        mt="xl"
      >
        <Section title="Moderation actions, 30 days">
          <TopBarChart
            rows={data.breakdowns.moderationActions.map((row) => ({
              ...row,
              name: humanize(row.name)
            }))}
            valueName="Actions"
            emptyLabel="No moderation actions in this period"
          />
        </Section>
        <Section title="Latest open reports">
          <RecentReports reports={data.recentReports} />
        </Section>
      </Box>
    </Box>
  );
};

export default Dashboard;
