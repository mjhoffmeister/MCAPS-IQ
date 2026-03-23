import "@typespec/http";
import "@typespec/openapi3";
import "@microsoft/typespec-m365-copilot";
import "./actions/github.tsp";
import "./actions/crm.tsp";
import "./prompts/instructions.tsp";
import "./env.tsp";

using TypeSpec.M365.Copilot.Agents;

@agent(
  "MCAPS-IQ",
  "AI-powered sales operations agent for MCAPS account teams. Strengthens cross-role communication and strategic alignment across CRM, M365, and knowledge sources. Supports Specialist, Solution Engineer, CSA, and CSAM workflows through the MCEM lifecycle — from pipeline qualification through value realization."
)
@instructions(Prompts.INSTRUCTIONS)
@disclaimer(#{
  text: "MCAPS-IQ provides guidance based on CRM data and M365 signals. Always verify critical decisions with your manager. Write operations require explicit approval."
})

// --- Conversation Starters (12 max) ---
@conversationStarter(#{
  title: "Morning Brief",
  text: "Give me my morning brief — pipeline health, milestone status, today's meetings, and risk signals."
})
@conversationStarter(#{
  title: "My Opportunities",
  text: "Show me my active opportunities with stage, health, and deal team."
})
@conversationStarter(#{
  title: "Milestone Health",
  text: "Review milestone health for [customer] — flag overdue, at-risk, and blocked items."
})
@conversationStarter(#{
  title: "Pipeline Hygiene",
  text: "Run pipeline hygiene triage — stale opportunities, missing fields, close-date slippage."
})
@conversationStarter(#{
  title: "Stage Check",
  text: "What MCEM stage is [opportunity] actually at based on CRM evidence?"
})
@conversationStarter(#{
  title: "Deal Risk Radar",
  text: "Surface deal risks for [customer] — relationship decay, silent stakeholders, looming threats."
})
@conversationStarter(#{
  title: "Prepare for Meeting",
  text: "Prepare a briefing for my meeting with [customer] — open items, recent activity, risk signals."
})
@conversationStarter(#{
  title: "Task Hygiene",
  text: "Check task hygiene for my milestones — stale tasks, missing owners, overdue items."
})
@conversationStarter(#{
  title: "Create Milestone",
  text: "Create a new milestone on [opportunity] for [customer]."
})
@conversationStarter(#{
  title: "Handoff Readiness",
  text: "Check STU-to-CSU handoff readiness for [opportunity]."
})
@conversationStarter(#{
  title: "Account Landscape",
  text: "Show me the full account landscape for [customer] — all pipeline, cross-role activity."
})
@conversationStarter(#{
  title: "Exit Criteria",
  text: "Validate exit criteria for [opportunity] — are we ready to advance?"
})

namespace mcapsiq {
  // --- Native M365 Capabilities ---
  op people is AgentCapabilities.People;
  op meetings is AgentCapabilities.Meetings;
  op teamsMessages is AgentCapabilities.TeamsMessages;
  op email is AgentCapabilities.Email;
  op oneDriveAndSharePoint is AgentCapabilities.OneDriveAndSharePoint;
  op codeInterpreter is AgentCapabilities.CodeInterpreter;

  // --- CRM API Plugin Actions ---
  op whoAmI is CrmAPI.whoAmI;
  op queryEntities is CrmAPI.queryEntities;
  op getRecord is CrmAPI.getRecord;
  op listOpportunities is CrmAPI.listOpportunities;
  op getMyOpportunities is CrmAPI.getMyOpportunities;
  op getMilestones is CrmAPI.getMilestones;
  op getMilestoneActivities is CrmAPI.getMilestoneActivities;
  op createMilestone is CrmAPI.createMilestone;
  op updateMilestone is CrmAPI.updateMilestone;
  op createTask is CrmAPI.createTask;
  op updateTask is CrmAPI.updateTask;
  op closeTask is CrmAPI.closeTask;
  op listAccountsByTpid is CrmAPI.listAccountsByTpid;
  op findMilestonesNeedingTasks is CrmAPI.findMilestonesNeedingTasks;
  op getMilestoneFieldOptions is CrmAPI.getMilestoneFieldOptions;
  op getTaskStatusOptions is CrmAPI.getTaskStatusOptions;
  op viewMilestoneTimeline is CrmAPI.viewMilestoneTimeline;
  op viewOpportunityCostTrend is CrmAPI.viewOpportunityCostTrend;
  op manageDealTeam is CrmAPI.manageDealTeam;
  op listPendingOperations is CrmAPI.listPendingOperations;
  op executeOperation is CrmAPI.executeOperation;
  op executeAll is CrmAPI.executeAll;
  op cancelOperation is CrmAPI.cancelOperation;
  op cancelAll is CrmAPI.cancelAll;
  op viewStagedDiff is CrmAPI.viewStagedDiff;
  op manageMilestoneTeam is CrmAPI.manageMilestoneTeam;

  // --- GitHub API Plugin Actions (optional) ---
  op searchIssues is GitHubAPI.searchIssues;
}