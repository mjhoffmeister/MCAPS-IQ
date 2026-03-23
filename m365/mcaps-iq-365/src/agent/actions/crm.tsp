import "@typespec/http";
import "@microsoft/typespec-m365-copilot";
import "../env.tsp";
import "./crm-models.tsp";

using TypeSpec.Http;
using TypeSpec.M365.Copilot.Actions;

@service
@server(CrmAPI.SERVER_URL)
@actions(CrmAPI.ACTIONS_METADATA)
namespace CrmAPI {
  /**
   * Metadata for the MSX CRM API actions.
   */
  const ACTIONS_METADATA = #{
    nameForHuman: "MSX CRM",
    descriptionForHuman: "Query and manage Dynamics 365 CRM opportunities, milestones, and tasks for MCAPS account teams.",
    descriptionForModel: "CRM operations for MCAPS account teams. Use getMyOpportunities for deal-team-first discovery. Use getMilestones with customerKeyword for scoped milestone retrieval. ALWAYS use GUIDs for parameters, display msp_opportunitynumber as 'Opp #'. Write operations are staged — call listPendingOperations and executeOperation for approval. Key fields: msp_activesalesstage (stage), msp_estcompletiondate (close date), msp_milestonedate (milestone date). Commitment: Uncommitted=861980000, Committed=861980003. NEVER use 861980001.",
    legalInfoUrl: "https://www.microsoft.com/en-us/legal/terms-of-use",
    privacyPolicyUrl: "https://privacy.microsoft.com/en-us/privacystatement"
  };

  /**
   * The base URL for the CRM API proxy.
   */
  const SERVER_URL = Environment.CRM_API_URL;

  // ========================================================================
  // Identity & Metadata
  // ========================================================================

  /**
   * Get the current user's CRM identity, role, and business unit.
   * Use this as the first call to detect user role (Specialist, SE, CSA, CSAM).
   */
  @route("/api/crm/whoami")
  @get op whoAmI(): UserIdentity;

  /**
   * Execute an OData query against allowlisted CRM entity sets.
   * Use for ad-hoc queries not covered by composite tools.
   * Enforces entity allowlist and 500-record ceiling.
   * @param entitySet The OData entity set (e.g. "opportunities", "msp_engagementmilestones")
   * @param filter OData $filter expression
   * @param select Comma-separated field names for $select
   * @param orderby OData $orderby expression
   * @param top Maximum number of records (default 25, max 500)
   */
  @route("/api/crm/query")
  @get op queryEntities(
    @query entitySet: string,
    @query filter?: string,
    @query select?: string,
    @query orderby?: string,
    @query top?: integer = 25,
  ): QueryResult;

  /**
   * Get a single CRM record by entity set and GUID.
   * @param entitySet The OData entity set name (e.g. "opportunities")
   * @param id The record GUID
   * @param select Comma-separated field names for $select
   */
  @route("/api/crm/{entitySet}/{id}")
  @get op getRecord(
    @path entitySet: string,
    @path id: string,
    @query select?: string,
  ): string;

  // ========================================================================
  // Opportunities
  // ========================================================================

  /**
   * List opportunities with optional filtering by customer, keyword, or IDs.
   * Returns enriched view with stage, estimated close date, and deal team.
   * @param customerKeyword Customer name for account-scoped lookup
   * @param opportunityKeyword Opportunity name keyword search
   * @param opportunityIds Comma-separated opportunity GUIDs for batch lookup
   * @param includeDealTeam Whether to include deal team members (default true)
   * @param format Response format: "full" or "summary"
   * @param maxResults Maximum results to return
   */
  @route("/api/opportunities")
  @card(#{
    dataPath: "$",
    file: "adaptiveCards/opportunity.json",
    properties: #{
      title: "$.name",
      url: "$.recordUrl"
    }
  })
  @get op listOpportunities(
    @query customerKeyword?: string,
    @query opportunityKeyword?: string,
    @query opportunityIds?: string,
    @query includeDealTeam?: boolean = true,
    @query format?: string = "full",
    @query maxResults?: integer = 25,
  ): OpportunitySummary[];

  /**
   * Get the current user's active opportunities via deal-team-first discovery.
   * Returns opportunities where the user is owner or deal-team member.
   * Each result includes a 'relationship' tag: owner, deal-team, or both.
   * @param customerKeyword Optional customer name to narrow results
   * @param maxResults Maximum results to return
   * @param includeDealTeam Include deal team member details (default true)
   */
  @route("/api/opportunities/mine")
  @card(#{
    dataPath: "$",
    file: "adaptiveCards/opportunity.json",
    properties: #{
      title: "$.name",
      url: "$.recordUrl"
    }
  })
  @get op getMyOpportunities(
    @query customerKeyword?: string,
    @query maxResults?: integer = 25,
    @query includeDealTeam?: boolean = true,
  ): OpportunitySummary[];

  /**
   * Get opportunity cost trend data for visualization.
   * @param id Opportunity GUID
   */
  @route("/api/opportunities/{id}/cost-trend")
  @get op viewOpportunityCostTrend(
    @path id: string,
  ): CostTrendData;

  /**
   * Manage deal team membership on an opportunity.
   * Supports list, add, and remove actions.
   * @param id Opportunity GUID
   */
  @route("/api/opportunities/{id}/deal-team")
  @post op manageDealTeam(
    @path id: string,
    @body request: DealTeamRequest,
  ): DealTeamResponse;

  // ========================================================================
  // Milestones
  // ========================================================================

  /**
   * Primary milestone retrieval tool. Supports multiple scoping strategies.
   * ALWAYS provide at least one scoping parameter — unscoped calls are rejected.
   *
   * Preferred patterns:
   * - customerKeyword: resolves name → accounts → opportunities → milestones (1 call)
   * - opportunityKeyword: resolves opportunity name → milestones (1 call)
   * - opportunityId / opportunityIds: direct GUID-based lookup
   * - mine=true: explicit user-scoped listing
   *
   * @param customerKeyword Customer name for full chain resolution
   * @param opportunityKeyword Opportunity name keyword
   * @param opportunityId Single opportunity GUID
   * @param opportunityIds Comma-separated opportunity GUIDs for batch
   * @param milestoneId Direct milestone GUID lookup
   * @param milestoneNumber Milestone number (e.g. "7-123456789")
   * @param ownerId Filter by owner GUID
   * @param mine Current user's milestones (must be explicit true)
   * @param statusFilter Filter: "active" or "all" (default "active")
   * @param keyword Case-insensitive text search across milestone names
   * @param format Response format: "full" or "summary"
   * @param taskFilter Filter by task presence: "all", "with-tasks", "without-tasks"
   * @param includeTasks Embed linked tasks inline on each milestone
   */
  @route("/api/milestones")
  @card(#{
    dataPath: "$",
    file: "adaptiveCards/milestone.json",
    properties: #{
      title: "$.name",
      url: "$.recordUrl"
    }
  })
  @get op getMilestones(
    @query customerKeyword?: string,
    @query opportunityKeyword?: string,
    @query opportunityId?: string,
    @query opportunityIds?: string,
    @query milestoneId?: string,
    @query milestoneNumber?: string,
    @query ownerId?: string,
    @query mine?: boolean,
    @query statusFilter?: string = "active",
    @query keyword?: string,
    @query format?: string = "full",
    @query taskFilter?: string,
    @query includeTasks?: boolean = false,
  ): MilestoneSummary[];

  /**
   * Get tasks (activities) for one or more milestones. Prefer batch mode.
   * @param id Comma-separated milestone GUIDs for batch retrieval
   */
  @route("/api/milestones/{id}/activities")
  @get op getMilestoneActivities(
    @path id: string,
  ): TaskSummary[];

  /**
   * Create a new milestone on an opportunity. Returns a staged operation for approval.
   * All picklist fields (workloadType, deliveredBy, preferredAzureRegion, azureCapacityType) are mandatory.
   * Use getMilestoneFieldOptions to look up valid numeric codes before calling.
   */
  @route("/api/milestones")
  @post op createMilestone(
    @body request: CreateMilestoneRequest,
  ): StagedOperation;

  /**
   * Update an existing milestone. Returns a staged operation for approval.
   * Use numeric codes for picklist fields. Show "Label (code)" in confirmation.
   * @param id Milestone GUID
   */
  @route("/api/milestones/{id}")
  @patch(#{implicitOptionality: true}) op updateMilestone(
    @path id: string,
    @body request: UpdateMilestoneRequest,
  ): StagedOperation;

  /**
   * Find milestones that have no linked tasks — gap analysis tool.
   * @param customerKeywords Comma-separated customer names
   */
  @route("/api/milestones/needing-tasks")
  @card(#{
    dataPath: "$",
    file: "adaptiveCards/milestone.json",
    properties: #{
      title: "$.name",
      url: "$.recordUrl"
    }
  })
  @get op findMilestonesNeedingTasks(
    @query customerKeywords?: string,
  ): MilestoneSummary[];

  /**
   * Get picklist field options for milestone fields.
   * Use when user provides a value that doesn't match known codes.
   * @param field Field name: "workloadType", "deliveredBy", "preferredAzureRegion", "azureCapacityType", "milestoneStatus"
   */
  @route("/api/milestones/field-options")
  @get op getMilestoneFieldOptions(
    @query field: string,
  ): FieldOption[];

  /**
   * Get milestone timeline data for visualization.
   * @param customerKeyword Customer name scope
   * @param opportunityId Opportunity GUID scope
   */
  @route("/api/milestones/timeline")
  @get op viewMilestoneTimeline(
    @query customerKeyword?: string,
    @query opportunityId?: string,
  ): TimelineData;

  /**
   * Manage milestone team membership.
   * @param id Milestone GUID
   */
  @route("/api/milestones/{id}/team")
  @post op manageMilestoneTeam(
    @path id: string,
    @body request: DealTeamRequest,
  ): DealTeamResponse;

  // ========================================================================
  // Tasks
  // ========================================================================

  /**
   * Create a new task on a milestone. Returns a staged operation for approval.
   */
  @route("/api/tasks")
  @post op createTask(
    @body request: CreateTaskRequest,
  ): StagedOperation;

  /**
   * Update an existing task. Returns a staged operation for approval.
   * @param id Task activity GUID (activityid)
   */
  @route("/api/tasks/{id}")
  @patch(#{implicitOptionality: true}) op updateTask(
    @path id: string,
    @body request: UpdateTaskRequest,
  ): StagedOperation;

  /**
   * Close a task. Returns a staged operation for approval.
   * @param id Task activity GUID (activityid)
   */
  @route("/api/tasks/{id}/close")
  @post op closeTask(
    @path id: string,
  ): StagedOperation;

  /**
   * Get valid status options for task status field.
   */
  @route("/api/tasks/status-options")
  @get op getTaskStatusOptions(): FieldOption[];

  // ========================================================================
  // Accounts
  // ========================================================================

  /**
   * Look up accounts by TPID (Top Parent ID).
   * @param tpid The TPID value (msp_mstopparentid)
   */
  @route("/api/accounts/by-tpid")
  @get op listAccountsByTpid(
    @query tpid: string,
  ): AccountSummary[];

  // ========================================================================
  // Staged Operations (Approval Queue)
  // ========================================================================

  /**
   * List all pending staged operations awaiting approval.
   * Show this to the user before they approve writes.
   */
  @route("/api/operations/pending")
  @get op listPendingOperations(): StagedOperation[];

  /**
   * Execute (approve) a single staged operation.
   * @param id The operation ID from the staged response
   */
  @route("/api/operations/{id}/execute")
  @post op executeOperation(
    @path id: string,
  ): OperationResult;

  /**
   * Execute (approve) all pending staged operations.
   */
  @route("/api/operations/execute-all")
  @post op executeAll(): OperationResult[];

  /**
   * Cancel (reject) a single staged operation.
   * @param id The operation ID to cancel
   */
  @route("/api/operations/{id}")
  @delete op cancelOperation(
    @path id: string,
  ): OperationResult;

  /**
   * Cancel (reject) all pending staged operations.
   */
  @route("/api/operations")
  @delete op cancelAll(): OperationResult[];

  /**
   * View a diff of staged changes before approval.
   * Shows current vs proposed values for review.
   * @param operationIds Array of operation IDs to diff
   */
  @route("/api/operations/diff")
  @post op viewStagedDiff(
    @body operationIds: string[],
  ): StagedDiffResponse;
}
