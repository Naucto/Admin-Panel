import React, { useEffect, useMemo, useState } from "react";
import { ApiClient } from "adminjs";
import { Box, H2, H3, Text } from "@adminjs/design-system";
import { useParams } from "react-router";
import {
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
import { ThemeBoot } from "./theme-tools.js";

type MetricMap = Record<string, number>;

type Row = {
  id?: number;
  projectId?: number;
  name: string;
  value?: number;
  players?: number;
  creators?: number;
  views?: number;
  likes?: number;
  startedAt?: string;
  endedAt?: string | null;
  lastActiveAt?: string;
};

type OverviewData = {
  forbidden?: boolean;
  pageType: "live" | "social";
  metrics: MetricMap;
  activeGames?: Row[];
  activeWork?: Row[];
  recentGames?: Row[];
  commentBreakdown?: Row[];
  topLikedGames?: Row[];
  topCommentedGames?: Row[];
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

const metricLabels: Record<string, string> = {
  activePlayers: "Active players",
  activeGameSessions: "Active game sessions",
  activeCreators: "Active creators",
  activeWorkSessions: "Active build sessions",
  gamesToday: "Plays today",
  games7Days: "Plays, 7 days",
  gamesAllTime: "All-time plays",
  workToday: "Builds today",
  work7Days: "Builds, 7 days",
  workAllTime: "All-time builds",
  likes: "Likes",
  comments: "Comments",
  visibleComments: "Visible comments",
  deletedComments: "Deleted comments",
  hiddenComments: "Hidden comments",
  friendships: "Friendships",
  friendRequests: "Friend requests",
  subscriptions: "Subscriptions",
  activeSubscriptions: "Active subscriptions"
};

function formatNumber(value?: number): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

function pageNameFromLocation(): string {
  const match = window.location.pathname.match(/\/pages\/([^/]+)/);
  return match?.[1] ?? "liveActivity";
}

function normalizeOverviewPageName(pageName?: string): "liveActivity" | "socialOverview" {
  return pageName === "socialOverview" ? "socialOverview" : "liveActivity";
}

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box className="naucto-card" p="lg">
    <Text className="naucto-muted">{label}</Text>
    <H3>{formatNumber(value)}</H3>
  </Box>
);

const Panel: React.FC<{
  title: string;
  children: React.ReactNode;
  height?: string;
}> = ({ title, children, height = "320px" }) => (
  <Box className="naucto-card naucto-chart" p="lg">
    <H3>{title}</H3>
    <Box mt="lg" height={height}>
      {children}
    </Box>
  </Box>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <Box height="100%" display="flex" alignItems="center" justifyContent="center">
    <Text className="naucto-muted">{label}</Text>
  </Box>
);

const HorizontalBars: React.FC<{
  rows: Row[];
  valueKey?: keyof Row;
  valueName: string;
  emptyLabel: string;
}> = ({ rows, valueKey = "value", valueName, emptyLabel }) => {
  if (!rows.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 12, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={135}
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
          dataKey={valueKey as string}
          name={valueName}
          fill="var(--naucto-primary)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const Donut: React.FC<{ rows: Row[]; emptyLabel: string }> = ({ rows, emptyLabel }) => {
  if (!rows.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={54}
          outerRadius={96}
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
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

const PrettyList: React.FC<{
  rows: Row[];
  emptyLabel: string;
  mode: "game" | "work" | "recent";
}> = ({ rows, emptyLabel, mode }) => {
  if (!rows.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <Box>
      {rows.map((row) => (
        <Box key={`${row.id}-${row.name}`} className="naucto-soft-card" p="lg" mb="default">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Text fontWeight="bold">{row.name}</Text>
              <Text className="naucto-muted">
                {mode === "recent" && row.endedAt ? "Finished" : "Started"}{" "}
                {row.startedAt ? new Date(row.startedAt).toLocaleString() : ""}
              </Text>
            </Box>
            <Box display="flex" gridGap="default">
              {row.players !== undefined ? (
                <span className="naucto-pill">{formatNumber(row.players)} players</span>
              ) : null}
              {row.creators !== undefined ? (
                <span className="naucto-pill">{formatNumber(row.creators)} creators</span>
              ) : null}
              {row.views !== undefined ? (
                <span className="naucto-pill">{formatNumber(row.views)} views</span>
              ) : null}
              {row.likes !== undefined ? (
                <span className="naucto-pill">{formatNumber(row.likes)} likes</span>
              ) : null}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const OverviewPage: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useParams<{ pageName?: string }>();
  const api = useMemo(() => new ApiClient(), []);
  const pageName = normalizeOverviewPageName(params.pageName ?? pageNameFromLocation());

  useEffect(() => {
    let isCurrent = true;
    setData(null);
    setError(null);

    api
      .getPage({ pageName })
      .then((response) => {
        if (isCurrent) {
          setData(response.data as OverviewData);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError("The overview data could not be loaded.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [api, pageName]);

  if (error) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <H2>Overview unavailable</H2>
        <Text>{error}</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <Text>Loading {pageName === "socialOverview" ? "social overview" : "live activity"}...</Text>
      </Box>
    );
  }

  if (data.forbidden) {
    return (
      <Box p="xl" className="naucto-admin-page">
        <ThemeBoot />
        <H2>Not available</H2>
        <Text>You do not have access to this page.</Text>
      </Box>
    );
  }

  const isLive = data.pageType === "live";

  return (
    <Box p="xl" className="naucto-admin-page">
      <ThemeBoot />
      <H2>{isLive ? "Live Activity" : "Social Overview"}</H2>
      <Text className="naucto-muted">
        {isLive
          ? "Current game and creation activity without digging through session tables."
          : "Community health, social graph, and interaction signals."}
      </Text>

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(190px, 1fr))"
        gridGap="lg"
        mt="lg"
      >
        {Object.entries(data.metrics).map(([key, value]) => (
          <StatCard key={key} label={metricLabels[key] ?? key} value={value} />
        ))}
      </Box>

      {isLive ? (
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fit, minmax(360px, 1fr))"
          gridGap="lg"
          mt="xl"
        >
          <Panel title="Active games now" height="420px">
            <PrettyList
              rows={data.activeGames ?? []}
              mode="game"
              emptyLabel="No active games right now"
            />
          </Panel>
          <Panel title="Active build sessions" height="420px">
            <PrettyList
              rows={data.activeWork ?? []}
              mode="work"
              emptyLabel="No active build sessions"
            />
          </Panel>
          <Panel title="Recent play sessions">
            <PrettyList
              rows={data.recentGames ?? []}
              mode="recent"
              emptyLabel="No play sessions yet"
            />
          </Panel>
          <Panel title="Most populated active games">
            <HorizontalBars
              rows={data.activeGames ?? []}
              valueKey="players"
              valueName="Players"
              emptyLabel="No active games"
            />
          </Panel>
        </Box>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fit, minmax(360px, 1fr))"
          gridGap="lg"
          mt="xl"
        >
          <Panel title="Comment health">
            <Donut rows={data.commentBreakdown ?? []} emptyLabel="No comments yet" />
          </Panel>
          <Panel title="Top liked games">
            <HorizontalBars
              rows={data.topLikedGames ?? []}
              valueName="Likes"
              emptyLabel="No likes yet"
            />
          </Panel>
          <Panel title="Top commented games">
            <HorizontalBars
              rows={data.topCommentedGames ?? []}
              valueName="Comments"
              emptyLabel="No comments yet"
            />
          </Panel>
        </Box>
      )}
    </Box>
  );
};

export default OverviewPage;
