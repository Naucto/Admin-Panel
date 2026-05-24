import React from "react";
import { ViewHelpers } from "adminjs";
import type { BasePropertyProps } from "adminjs";
import { Link } from "react-router-dom";

type AdminRecordLinkProps = {
  resourceId?: string | null;
  recordId?: string | number | null;
  label?: React.ReactNode;
};

function isPresent(value: unknown): value is string | number {
  return value !== undefined && value !== null && value !== "";
}

export const AdminRecordLink: React.FC<AdminRecordLinkProps> = ({
  resourceId,
  recordId,
  label
}) => {
  if (!resourceId || !isPresent(recordId)) {
    return <span>{label ?? "Unknown"}</span>;
  }

  const helpers = new ViewHelpers();
  const href = helpers.recordActionUrl({
    resourceId,
    recordId: String(recordId),
    actionName: "show"
  });

  return (
    <Link className="naucto-admin-resource-link" to={href}>
      {label ?? `${resourceId} #${recordId}`}
    </Link>
  );
};

const AdminResourceLink: React.FC<BasePropertyProps> = ({ property, record }) => {
  const params = record?.params ?? {};
  const populated = record?.populated?.[property.path];
  const value = params[property.path];
  const custom = property.custom ?? {};
  const resourceId = String(
    params[String(custom["resourceParam"] ?? "")] ??
      custom["resourceId"] ??
      property.reference ??
      ""
  );
  const recordId = params[String(custom["recordIdParam"] ?? "")] ?? value;
  const label =
    params[String(custom["labelParam"] ?? "")] ??
    populated?.title ??
    (isPresent(recordId) && custom["labelPrefix"]
      ? `${custom["labelPrefix"]}${recordId}`
      : undefined) ??
    (isPresent(recordId) ? `${resourceId} #${recordId}` : "None");

  return (
    <AdminRecordLink
      resourceId={resourceId}
      recordId={recordId as string | number | null}
      label={String(label)}
    />
  );
};

export default AdminResourceLink;
