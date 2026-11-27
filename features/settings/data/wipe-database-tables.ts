export const WIPEABLE_DATA_TABLES = [
  { name: "DATA_DatabaseMonitorSamples", label: "Database monitor samples", description: "Stored database status and latency history." },
  { name: "DATA_Projects", label: "Projects", description: "Project records. Linked phases, tags, repositories, and environments are removed automatically." },
  { name: "DATA_ProjectPhases", label: "Project phases", description: "Planned and actual project timeline phases." },
  { name: "DATA_ProjectTags", label: "Project tags", description: "Project-to-category assignments." },
  { name: "DATA_ProjectRepositories", label: "Project repositories", description: "Repository links assigned to projects." },
  { name: "DATA_ProjectEnvironments", label: "Project environments", description: "Environment URLs assigned to projects." },
  { name: "DATA_Issues", label: "Issues", description: "Issue records. Linked comments, activity, and request links may also be removed." },
  { name: "DATA_IssueComments", label: "Issue comments", description: "Issue discussion comments." },
  { name: "DATA_IssueActivity", label: "Issue activity", description: "Issue status and change history." },
  { name: "DATA_ServiceRequests", label: "Service requests", description: "Service requests. Linked comments, activity, attachments, and issue links are removed automatically." },
  { name: "DATA_ServiceRequestComments", label: "Service request comments", description: "Service request discussion comments." },
  { name: "DATA_ServiceRequestActivities", label: "Service request activities", description: "Service request status and change history." },
  { name: "DATA_ServiceRequestAttachments", label: "Service request attachments", description: "Files attached to service requests." },
  { name: "DATA_ServiceRequestIssues", label: "Service request issue links", description: "Links between service requests and issues." },
  { name: "DATA_Kanban", label: "Kanban cards", description: "Cards and their saved details." },
  { name: "DATA_AuditTrail", label: "Audit trail", description: "Application audit events. The wipe action itself will be recorded." },
  { name: "DATA_Notifications", label: "Notifications", description: "User notifications." },
] as const;

export type WipeableDataTable = (typeof WIPEABLE_DATA_TABLES)[number]["name"];
