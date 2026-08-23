import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { adminModerationLogApi } from "@api/admin";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { EntityLink } from "@components/EntityLink";
import { formatDate } from "@utils/format";

export function ModerationLogDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const entryId = Number(id);
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(
    () => adminModerationLogApi.get(entryId),
    [entryId]
  );

  return (
    <>
      <PageHeader
        title={data ? `Action #${data.id}` : "Moderation entry"}
        subtitle={data?.action}
        actions={
          <Button variant="text" onClick={() => navigate("/moderation-log")}>
            Back to log
          </Button>
        }
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Metadata" />
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>Action:</Typography>
                      <Chip label={data.action} size="small" />
                    </Stack>
                    <Typography>
                      Target:{" "}
                      <EntityLink
                        type={data.targetType}
                        id={data.targetId}
                        label={data.targetLabel}
                      />
                    </Typography>
                    <Typography>Actor: {data.actorLabel ?? "system"}</Typography>
                    <Typography>Reason: {data.reason ?? "—"}</Typography>
                    <Typography>Report: {data.reportId ? `#${data.reportId}` : "—"}</Typography>
                    <Typography>When: {formatDate(data.createdAt)}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Before" />
                <CardContent>
                  <pre style={{ margin: 0, overflowX: "auto", fontSize: 12 }}>
                    {JSON.stringify(data.before ?? null, null, 2)}
                  </pre>
                </CardContent>
              </Card>
              <Card sx={{ mt: 2 }}>
                <CardHeader title="After" />
                <CardContent>
                  <pre style={{ margin: 0, overflowX: "auto", fontSize: 12 }}>
                    {JSON.stringify(data.after ?? null, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </AsyncBoundary>
    </>
  );
}
