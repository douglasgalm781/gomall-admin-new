const PILL_MAP = {
  active: "pill-success",
  verified: "pill-success",
  completed: "pill-success",
  approved: "pill-success",
  delivered: "pill-success",
  pending: "pill-warning",
  reviewing: "pill-warning",
  processing: "pill-warning",
  shipped: "pill-info",
  rejected: "pill-danger",
  banned: "pill-danger",
  suspended: "pill-danger",
  frozen: "pill-danger",
  cancelled: "pill-danger",
  none: "pill-muted",
  inactive: "pill-muted",
};

export default function StatusPill({ status }) {
  const cls = PILL_MAP[status] || "pill-muted";
  return <span className={`pill ${cls} capitalize`}>{status || "—"}</span>;
}
