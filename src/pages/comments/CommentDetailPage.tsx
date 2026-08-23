import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminCommentApi } from "@api/admin";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";
import { ModerationHistory } from "@components/ModerationHistory";
import { EntityLink } from "@components/EntityLink";
import { formatDate } from "@utils/format";

export function CommentDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const commentId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState<"hide" | "restore" | null>(null);
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => adminCommentApi.get(commentId),
    [commentId]
  );

  useEffect(() => {
    if (data) {
      setContent(data.content);
    }
  }, [data]);

  const handleSave = async (): Promise<void> => {
    if (!data || content === data.content) return;
    setSaving(true);
    try {
      await adminCommentApi.update(data.projectId, commentId, {
        content,
        moderationReason: reason || undefined
      });
      enqueueSnackbar("Comment updated", { variant: "success" });
      setReason("");
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (dialogReason: string): Promise<void> => {
    if (!dialog || !data) return;
    try {
      if (dialog === "hide")
        await adminCommentApi.hide(data.projectId, commentId, dialogReason);
      if (dialog === "restore")
        await adminCommentApi.restore(data.projectId, commentId, dialogReason);
      enqueueSnackbar("Done", { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader
        title={data ? `Comment #${data.id}` : "Comment"}
        actions={
          <Button variant="text" onClick={() => navigate("/comments")}>
            Back to list
          </Button>
        }
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardHeader title="Content" />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      label="Comment text"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      multiline
                      rows={6}
                      fullWidth
                    />
                    <TextField
                      label="Audit reason (optional)"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        disabled={saving || content === data.content}
                        onClick={() => void handleSave()}
                      >
                        Save edit
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title="Metadata" />
                <CardContent>
                  <Stack spacing={1}>
                    <Typography>
                      Author:{" "}
                      <EntityLink
                        type="USER"
                        id={data.authorId}
                        label={data.authorUsername ? `@${data.authorUsername}` : null}
                      />
                    </Typography>
                    <Typography>
                      Project:{" "}
                      <EntityLink
                        type="PROJECT"
                        id={data.projectId}
                        label={data.projectName}
                      />
                    </Typography>
                    <Typography>Created: {formatDate(data.createdAt)}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>Status:</Typography>
                      {data.deleted && <Chip label="Deleted" size="small" />}
                      {data.hidden && <Chip label="Hidden" color="error" size="small" />}
                      {!data.deleted && !data.hidden && (
                        <Chip label="Visible" color="success" size="small" />
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ mt: 2 }}>
                <CardHeader title="Moderation" />
                <CardContent>
                  <Stack spacing={1}>
                    {!data.hidden && (
                      <Button variant="outlined" color="warning" onClick={() => setDialog("hide")}>
                        Hide
                      </Button>
                    )}
                    {data.hidden && (
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => setDialog("restore")}
                      >
                        Restore
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
              <ModerationHistory targetType="COMMENT" targetId={commentId} />
            </Grid>
          </Grid>
        )}
      </AsyncBoundary>

      <ReasonDialog
        open={dialog === "hide"}
        title="Hide comment"
        confirmLabel="Hide"
        confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog === "restore"}
        title="Restore comment"
        confirmLabel="Restore"
        confirmColor="success"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
