import { Card, CardContent, Stack, Typography } from "@mui/material";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
};

export function MetricCard({ title, value, subtitle, color }: MetricCardProps): JSX.Element {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" color={color ?? "text.primary"}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
