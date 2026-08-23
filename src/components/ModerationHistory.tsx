import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Typography
} from "@mui/material";
import { auditApi, type ModeratableType } from "@api/admin";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { formatDate } from "@utils/format";

type ModerationHistoryProps = {
  targetType: ModeratableType;
  targetId: number;
  /** How many entries to show. The newest is the current state. */
  limit?: number;
};

/**
 * Moderation history for anything moderatable.
 *
 * One component for projects, comments and users because the backend answers
 * all three through the same `/moderation-log/:type/:id` route -- the same
 * reason those entities no longer each carry their own `hidden*` columns.
 */
export function ModerationHistory({
  targetType,
  targetId,
  limit = 10
}: ModerationHistoryProps): JSX.Element {
  const { data, loading, error } = useAsync(
    () => auditApi.historyOf(targetType, targetId, { page: 1, limit }),
    [targetType, targetId, limit]
  );

  return (
    <Card sx={{ mt: 2 }}>
      <CardHeader
        title="Moderation history"
        subheader={
          data?.meta.total
            ? `${data.meta.total} action${data.meta.total > 1 ? "s" : ""}`
            : undefined
        }
      />
      <CardContent>
        <AsyncBoundary loading={loading} error={error}>
          {data && data.data.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Never moderated.
            </Typography>
          )}
          {data && data.data.length > 0 && (
            <Stack spacing={1.5}>
              {data.data.map((entry, index) => (
                <Stack key={entry.id} spacing={0.5}>
                  {index > 0 && <Divider />}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={entry.action} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(entry.createdAt)}
                      {entry.actorLabel ? ` · ${entry.actorLabel}` : ""}
                    </Typography>
                  </Stack>
                  {entry.reason && (
                    <Typography variant="body2">{entry.reason}</Typography>
                  )}
                  {entry.reportId && (
                    <Typography variant="caption" color="text.secondary">
                      From report #{entry.reportId}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </AsyncBoundary>
      </CardContent>
    </Card>
  );
}
