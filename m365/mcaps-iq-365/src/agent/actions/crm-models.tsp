import "@typespec/http";

using TypeSpec.Http;

// --- Shared CRM Models ---

/** User identity from CRM whoAmI probe */
model UserIdentity {
  @doc("System user GUID")
  userId: string;

  @doc("Full display name")
  fullName: string;

  @doc("Corporate email address")
  email: string;

  @doc("Business unit name")
  businessUnit?: string;

  @doc("Inferred MSX role: Specialist, SE, CSA, or CSAM")
  inferredRole?: string;
}

/** Opportunity summary for table display */
model OpportunitySummary {
  @doc("Opportunity GUID — use for all tool parameters")
  id: string;

  @doc("Human-readable opportunity number for display as 'Opp #'")
  opportunityNumber?: string;

  @doc("Opportunity name")
  name: string;

  @doc("MCEM active sales stage")
  stage?: string;

  @doc("Estimated completion date (msp_estcompletiondate)")
  estimatedCloseDate?: string;

  @doc("Health or risk indicator")
  healthRisk?: string;

  @doc("Next recommended step")
  nextStep?: string;

  @doc("Deal team members")
  dealTeam?: string[];

  @doc("User's relationship: owner, deal-team, or both")
  relationship?: string;

  @doc("Direct CRM record URL")
  recordUrl?: string;
}

/** Milestone summary for table display */
model MilestoneSummary {
  @doc("Milestone GUID")
  id: string;

  @doc("Milestone display number")
  milestoneNumber?: string;

  @doc("Milestone name")
  name: string;

  @doc("Monthly use / workload type")
  monthlyUse?: string;

  @doc("Due date (msp_milestonedate)")
  dueDate?: string;

  @doc("Status: On Track, At Risk, Blocked, Completed, etc.")
  status?: string;

  @doc("Owner display name")
  owner?: string;

  @doc("Blocker or risk description")
  blockerRisk?: string;

  @doc("Direct CRM record URL")
  recordUrl?: string;

  @doc("Inline tasks when includeTasks is true")
  tasks?: TaskSummary[];
}

/** Task summary */
model TaskSummary {
  @doc("Task activity GUID (activityid)")
  id: string;

  @doc("Task subject")
  subject: string;

  @doc("Task description")
  description?: string;

  @doc("Scheduled end date")
  scheduledEnd?: string;

  @doc("Status code")
  status?: string;

  @doc("Owner display name")
  owner?: string;

  @doc("Direct CRM record URL")
  recordUrl?: string;
}

/** Staged operation returned by write actions */
model StagedOperation {
  @doc("Operation ID for approval/rejection")
  operationId: string;

  @doc("Operation type: create, update, close")
  operationType: string;

  @doc("Target entity type")
  entityType: string;

  @doc("Target record ID (if updating existing)")
  targetId?: string;

  @doc("Human-readable summary of proposed changes")
  proposedChanges: string;

  @doc("Whether this is a staged/mock operation")
  staged: boolean;

  @doc("Human-readable summary of the change")
  summary: string;
}

/** Picklist field option */
model FieldOption {
  @doc("Numeric code value")
  value: integer;

  @doc("Human-readable label")
  label: string;
}

/** Generic query result wrapper */
model QueryResult {
  @doc("Array of entity records as JSON objects")
  value: string;

  @doc("Total number of records matching the query")
  count?: integer;
}

/** Milestone creation request */
model CreateMilestoneRequest {
  @doc("Opportunity GUID to attach the milestone to")
  opportunityId: string;

  @doc("Milestone name")
  name: string;

  @doc("Target date in ISO 8601 format")
  milestoneDate: string;

  @doc("Workload type numeric code (e.g. Azure=861980000)")
  workloadType: integer;

  @doc("Delivered by numeric code (e.g. Customer=606820000)")
  deliveredBy: integer;

  @doc("Preferred Azure region numeric code")
  preferredAzureRegion: integer;

  @doc("Azure capacity type numeric code(s)")
  azureCapacityType: string;
}

/** Milestone update request */
model UpdateMilestoneRequest {
  @doc("Comma-separated list of field=value pairs to update. Use numeric codes for picklist fields.")
  updates: string;
}

/** Task creation request */
model CreateTaskRequest {
  @doc("Milestone GUID to attach the task to (regardingobjectid)")
  milestoneId: string;

  @doc("Task subject")
  subject: string;

  @doc("Task description")
  description?: string;

  @doc("Scheduled end date in ISO 8601 format")
  scheduledEnd?: string;

  @doc("Owner system user GUID")
  ownerId?: string;
}

/** Task update request */
model UpdateTaskRequest {
  @doc("Comma-separated list of field=value pairs to update")
  updates: string;
}

/** Deal team management request */
model DealTeamRequest {
  @doc("Action: list, add, or remove")
  action: string;

  @doc("User GUID to add/remove (required for add/remove)")
  userId?: string;
}

/** Deal team management response */
model DealTeamResponse {
  @doc("Whether the operation succeeded")
  success: boolean;

  @doc("Result message or team member list")
  message: string;

  @doc("Team members (populated when action=list)")
  members?: string[];
}

/** Timeline visualization data */
model TimelineData {
  @doc("Timeline entries as formatted text")
  timeline: string;

  @doc("Total milestones in the timeline")
  milestoneCount?: integer;
}

/** Cost trend visualization data */
model CostTrendData {
  @doc("Cost trend entries as formatted text")
  costTrend: string;

  @doc("Opportunity name")
  opportunityName?: string;
}

/** Account summary */
model AccountSummary {
  @doc("Account GUID")
  accountId: string;

  @doc("Account name")
  name: string;

  @doc("Top Parent ID (TPID)")
  tpid?: string;

  @doc("Account owner")
  owner?: string;
}

/** Staged diff response */
model StagedDiffResponse {
  @doc("Formatted diff showing current vs proposed values")
  diff: string;

  @doc("Number of operations in the diff")
  operationCount: integer;
}

/** Operation execution result */
model OperationResult {
  @doc("Whether the operation succeeded")
  success: boolean;

  @doc("Result message")
  message: string;

  @doc("Created/updated record ID")
  recordId?: string;

  @doc("CRM record URL for the affected record")
  recordUrl?: string;
}
