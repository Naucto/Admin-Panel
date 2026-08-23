import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminProjectApi } from "@api/admin";
import type { AdminProject } from "@api/types";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { ReasonDialog } from "@components/ReasonDialog";
import { formatDate } from "@utils/format";
import { resolvePublication } from "@utils/projectLinks";
import { PlayProjectButton } from "@components/PlayProjectButton";
import { ProjectStatusChip } from "@components/ProjectStatusChip";
import { ModerationHistory } from "@components/ModerationHistory";
import { EntityLink } from "@components/EntityLink";

type DialogState = "hide" | "restore" | "unpublish" | null;

export function ProjectDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<AdminProject> & { reason?: string }>({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => adminProjectApi.get(projectId),
    [projectId]
  );


  useEffect(() => {
    if (data) {
      setDraft({
        name: data.name,
        shortDesc: data.shortDesc,
        longDesc: data.longDesc,
        publishedName: data.publishedName,
        publishedShortDesc: data.publishedShortDesc,
        publishedLongDesc: data.publishedLongDesc
      });
    }
  }, [data]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await adminProjectApi.update(projectId, {
        name: draft.name,
        shortDesc: draft.shortDesc,
        longDesc: draft.longDesc,
        moderationReason: draft.reason
      });
      enqueueSnackbar("Project updated", { variant: "success" });
      setEditing(false);
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (reason: string): Promise<void> => {
    if (!dialog) return;
    try {
      if (dialog === "hide") await adminProjectApi.hide(projectId, reason);
      if (dialog === "restore") await adminProjectApi.restore(projectId, reason);
      if (dialog === "unpublish") await adminProjectApi.unpublish(projectId);
      enqueueSnackbar("Done", { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    }
  };

  return (
    <>
      <PageHeader
        title={data ? data.publishedName || data.name : "Project"}
        subtitle={
          data ? (
            <>
              #{data.id} · by{" "}
              <EntityLink type="USER" id={data.userId} />
            </>
          ) : undefined
        }
        actions={
          <Button variant="text" onClick={() => navigate("/projects")}>
            Back to list
          </Button>
        }
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardHeader
                  title="Content"
                  action={
                    editing ? (
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setEditing(false);
                            setDraft({
                              name: data.name,
                              shortDesc: data.shortDesc,
                              longDesc: data.longDesc,
                              publishedName: data.publishedName,
                              publishedShortDesc: data.publishedShortDesc,
                              publishedLongDesc: data.publishedLongDesc
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          disabled={saving}
                          onClick={() => void handleSave()}
                        >
                          Save
                        </Button>
                      </Stack>
                    ) : (
                      <Button variant="outlined" onClick={() => setEditing(true)}>
                        Edit
                      </Button>
                    )
                  }
                />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      label="Internal name"
                      value={draft.name ?? ""}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      disabled={!editing}
                      fullWidth
                    />
                    <TextField
                      label="Short description"
                      value={draft.shortDesc ?? ""}
                      onChange={(event) => setDraft({ ...draft, shortDesc: event.target.value })}
                      disabled={!editing}
                      multiline
                      rows={2}
                      fullWidth
                    />
                    <TextField
                      label="Long description"
                      value={draft.longDesc ?? ""}
                      onChange={(event) => setDraft({ ...draft, longDesc: event.target.value })}
                      disabled={!editing}
                      multiline
                      rows={4}
                      fullWidth
                    />
                    <Divider>Published snapshot</Divider>
                    <TextField
                      label="Published name"
                      value={draft.publishedName ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, publishedName: event.target.value })
                      }
                      disabled={!editing}
                      fullWidth
                    />
                    <TextField
                      label="Published short"
                      value={draft.publishedShortDesc ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, publishedShortDesc: event.target.value })
                      }
                      disabled={!editing}
                      multiline
                      rows={2}
                      fullWidth
                    />
                    <TextField
                      label="Published long"
                      value={draft.publishedLongDesc ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, publishedLongDesc: event.target.value })
                      }
                      disabled={!editing}
                      multiline
                      rows={4}
                      fullWidth
                    />
                    {editing && (
                      <TextField
                        label="Reason (audit log)"
                        value={draft.reason ?? ""}
                        onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                        fullWidth
                      />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title="Status" />
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>Publication:</Typography>
                      <ProjectStatusChip project={data} showRawStatus />
                    </Stack>
                    <PlayProjectButton project={data} />
                    <Typography variant="caption" color="text.secondary">
                      {resolvePublication(data).isPublic
                        ? "Opens the public game page — what players see."
                        : "Opens the staff preview — latest save, no views recorded."}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography>Views: {data.viewCount}</Typography>
                    <Typography>Likes: {data.likes}</Typography>
                    <Typography>Created: {formatDate(data.createdAt)}</Typography>
                    <Typography>Updated: {formatDate(data.updatedAt)}</Typography>
                    <Typography>Published: {formatDate(data.publishedAt)}</Typography>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardHeader title="Moderation" />
                <CardContent>
                  <Stack spacing={1}>
                    {!data.hidden && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => setDialog("hide")}
                      >
                        Hide project
                      </Button>
                    )}
                    {data.hidden && (
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => setDialog("restore")}
                      >
                        Restore project
                      </Button>
                    )}
                    {data.status === "COMPLETED" && (
                      <Button variant="outlined" onClick={() => setDialog("unpublish")}>
                        Unpublish
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <ModerationHistory targetType="PROJECT" targetId={projectId} />
            </Grid>
          </Grid>
        )}
      </AsyncBoundary>

      <ReasonDialog
        open={dialog === "hide"}
        title="Hide project"
        confirmLabel="Hide"
        confirmColor="warning"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog === "restore"}
        title="Restore project"
        confirmLabel="Restore"
        confirmColor="success"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
      <ReasonDialog
        open={dialog === "unpublish"}
        title="Unpublish project"
        confirmLabel="Unpublish"
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
