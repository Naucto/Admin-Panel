import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import { adminReportApi } from "@api/admin";
import { extractErrorMessage } from "@api/client";
import { useAsync } from "@hooks/useAsync";
import { AsyncBoundary } from "@components/AsyncBoundary";
import { PageHeader } from "@components/PageHeader";
import { EntityLink } from "@components/EntityLink";
import { formatDate } from "@utils/format";

export function ReportDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const reportId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => adminReportApi.get(reportId),
    [reportId]
  );

  useEffect(() => {
    if (data) setNote(data.resolutionNote ?? "");
  }, [data]);

  const handleSaveNote = async (): Promise<void> => {
    setSavingNote(true);
    try {
      await adminReportApi.updateNote(reportId, note || null);
      enqueueSnackbar("Note saved", { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setSavingNote(false);
    }
  };

  const handleTransition = async (action: "review" | "resolve" | "dismiss"): Promise<void> => {
    setTransitioning(action);
    try {
      if (action === "review") await adminReportApi.review(reportId, note || undefined);
      if (action === "resolve") await adminReportApi.resolve(reportId, note || undefined);
      if (action === "dismiss") await adminReportApi.dismiss(reportId, note || undefined);
      enqueueSnackbar("Status updated", { variant: "success" });
      await reload();
    } catch (err) {
      enqueueSnackbar(extractErrorMessage(err), { variant: "error" });
    } finally {
      setTransitioning(null);
    }
  };

  return (
    <>
      <PageHeader
        title={data ? `Report #${data.id}` : "Report"}
        actions={
          <Button variant="text" onClick={() => navigate("/reports")}>
            Back to list
          </Button>
        }
      />
      <AsyncBoundary loading={loading} error={error}>
        {data && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardHeader title="Report" />
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={data.targetType} variant="outlined" />
                      <Typography>
                        <EntityLink
                          type={data.targetType}
                          id={data.targetId}
                          label={data.targetLabel}
                        />
                      </Typography>
                    </Stack>
                    <Typography variant="overline">Reason</Typography>
                    <Typography variant="body1">{data.reason}</Typography>
                    {data.details && (
                      <>
                        <Typography variant="overline">Details</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {data.details}
                        </Typography>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardHeader title="Resolution" />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      label="Resolution note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      multiline
                      rows={4}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        disabled={savingNote}
                        onClick={() => void handleSaveNote()}
                      >
                        Save note
                      </Button>
                      {data.status === "OPEN" && (
                        <Button
                          variant="outlined"
                          color="info"
                          disabled={transitioning === "review"}
                          onClick={() => void handleTransition("review")}
                        >
                          Mark in review
                        </Button>
                      )}
                      {(data.status === "OPEN" || data.status === "IN_REVIEW") && (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            disabled={transitioning === "resolve"}
                            onClick={() => void handleTransition("resolve")}
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="contained"
                            color="warning"
                            disabled={transitioning === "dismiss"}
                            onClick={() => void handleTransition("dismiss")}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardHeader title="Moderation actions linked to this report" />
                <CardContent>
                  {data.moderationActions.length === 0 ? (
                    <Typography color="text.secondary">No linked actions yet</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Target</TableCell>
                          <TableCell>Actor</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>When</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.moderationActions.map((action) => (
                          <TableRow key={action.id}>
                            <TableCell>
                              <Chip label={action.action} size="small" />
                            </TableCell>
                            <TableCell>
                              <EntityLink
                                type={action.targetType}
                                id={action.targetId}
                              />
                            </TableCell>
                            <TableCell>{action.actorId ? `#${action.actorId}` : "—"}</TableCell>
                            <TableCell>{action.reason ?? "—"}</TableCell>
                            <TableCell>{formatDate(action.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title="Status" />
                <CardContent>
                  <Stack spacing={1}>
                    <Chip
                      label={data.status}
                      color={
                        data.status === "OPEN"
                          ? "warning"
                          : data.status === "IN_REVIEW"
                            ? "info"
                            : data.status === "RESOLVED"
                              ? "success"
                              : "default"
                      }
                    />
                    <Typography>Created: {formatDate(data.createdAt)}</Typography>
                    <Typography>Updated: {formatDate(data.updatedAt)}</Typography>
                    {data.resolvedAt && (
                      <Typography>Resolved: {formatDate(data.resolvedAt)}</Typography>
                    )}
                    {data.resolvedById && (
                      <Typography>By user #{data.resolvedById}</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ mt: 2 }}>
                <CardHeader title="Reporter" />
                <CardContent>
                  <Stack spacing={1}>
                    <Typography>
                      {data.reporterUsername
                        ? `@${data.reporterUsername}`
                        : `User #${data.reporterId}`}
                    </Typography>
                    <Button
                      variant="text"
                      onClick={() => navigate(`/users/${data.reporterId}`)}
                    >
                      View user
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </AsyncBoundary>
    </>
  );
}
