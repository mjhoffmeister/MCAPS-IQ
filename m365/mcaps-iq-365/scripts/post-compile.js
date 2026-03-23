#!/usr/bin/env node

/**
 * Post-compile script: replaces auto-generated Kiota adaptive card stubs
 * with proper data-binding card templates for each CRM API operation.
 *
 * Run after: npm run compile
 * Usage:     node scripts/post-compile.js
 */

const fs = require("fs");
const path = require("path");

const GENERATED_CARDS_DIR = path.resolve(
  __dirname,
  "..",
  "appPackage",
  ".generated",
  "adaptiveCards"
);

// --- Card templates ---

const opportunityCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "**Opp # ${if(opportunityNumber, opportunityNumber, 'N/A')}**",
                  wrap: true,
                  size: "Medium",
                  weight: "Bolder",
                },
                {
                  type: "TextBlock",
                  text: "${if(name, name, 'Unnamed Opportunity')}",
                  wrap: true,
                  spacing: "Small",
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "TextBlock",
                  text: "${if(stage, stage, 'Unknown')}",
                  wrap: true,
                  weight: "Bolder",
                  color: "Accent",
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Est. Close Date",
              value:
                "${if(estimatedCloseDate, estimatedCloseDate, 'Unknown')}",
            },
            {
              title: "Health/Risk",
              value: "${if(healthRisk, healthRisk, 'Unknown')}",
            },
            {
              title: "Relationship",
              value: "${if(relationship, relationship, 'Unknown')}",
            },
            {
              title: "Next Step",
              value: "${if(nextStep, nextStep, 'None specified')}",
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      type: "Action.OpenUrl",
      title: "Open in CRM",
      url: "${recordUrl}",
    },
  ],
};

const milestoneCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "**${if(name, name, 'Unnamed Milestone')}**",
                  wrap: true,
                  size: "Medium",
                  weight: "Bolder",
                },
                {
                  type: "TextBlock",
                  text: "${if(milestoneNumber, milestoneNumber, '')}",
                  wrap: true,
                  spacing: "Small",
                  isSubtle: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "TextBlock",
                  text: "${if(status, status, 'Unknown')}",
                  wrap: true,
                  weight: "Bolder",
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [
            { title: "Due Date", value: "${if(dueDate, dueDate, 'Unknown')}" },
            { title: "Owner", value: "${if(owner, owner, 'Unassigned')}" },
            {
              title: "Workload",
              value: "${if(monthlyUse, monthlyUse, 'Unknown')}",
            },
            {
              title: "Blocker/Risk",
              value: "${if(blockerRisk, blockerRisk, 'None')}",
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      type: "Action.OpenUrl",
      title: "Open in CRM",
      url: "${recordUrl}",
    },
  ],
};

const taskCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "**${if(subject, subject, 'Unnamed Task')}**",
          wrap: true,
          size: "Medium",
          weight: "Bolder",
        },
        {
          type: "FactSet",
          facts: [
            { title: "Status", value: "${if(status, status, 'Unknown')}" },
            { title: "Owner", value: "${if(owner, owner, 'Unassigned')}" },
            {
              title: "Due Date",
              value: "${if(scheduledEnd, scheduledEnd, 'Unknown')}",
            },
          ],
        },
        {
          type: "TextBlock",
          text: "${if(description, description, '')}",
          wrap: true,
          spacing: "Small",
          isSubtle: true,
        },
      ],
    },
  ],
  actions: [
    {
      type: "Action.OpenUrl",
      title: "Open in CRM",
      url: "${recordUrl}",
    },
  ],
};

const stagedOperationCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "**Staged: ${if(operationType, operationType, 'Unknown')}**",
          wrap: true,
          size: "Medium",
          weight: "Bolder",
        },
        {
          type: "TextBlock",
          text: "${if(summary, summary, 'No summary')}",
          wrap: true,
          spacing: "Small",
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Operation ID",
              value: "${if(operationId, operationId, 'N/A')}",
            },
            {
              title: "Entity Type",
              value: "${if(entityType, entityType, 'Unknown')}",
            },
            {
              title: "Target ID",
              value: "${if(targetId, targetId, 'New record')}",
            },
            {
              title: "Status",
              value: "${if(staged, 'Pending Approval', 'Executed')}",
            },
          ],
        },
        {
          type: "TextBlock",
          text: "**Changes:** ${if(proposedChanges, proposedChanges, 'None')}",
          wrap: true,
          spacing: "Medium",
        },
      ],
    },
  ],
};

const operationResultCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "**${if(success, '✓ Success', '✗ Failed')}**",
          wrap: true,
          size: "Medium",
          weight: "Bolder",
          color: "${if(success, 'Good', 'Attention')}",
        },
        {
          type: "TextBlock",
          text: "${if(message, message, 'No message')}",
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Record ID",
              value: "${if(recordId, recordId, 'N/A')}",
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      type: "Action.OpenUrl",
      title: "Open in CRM",
      url: "${recordUrl}",
    },
  ],
};

const identityCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "**${if(fullName, fullName, 'Unknown User')}**",
          wrap: true,
          size: "Medium",
          weight: "Bolder",
        },
        {
          type: "FactSet",
          facts: [
            { title: "Email", value: "${if(email, email, 'N/A')}" },
            {
              title: "Business Unit",
              value: "${if(businessUnit, businessUnit, 'Unknown')}",
            },
            {
              title: "Inferred Role",
              value: "${if(inferredRole, inferredRole, 'Unknown')}",
            },
            { title: "User ID", value: "${if(userId, userId, 'N/A')}" },
          ],
        },
      ],
    },
  ],
};

const fieldOptionCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "**${if(label, label, 'Unknown')}** (${if(value, value, '?')})",
          wrap: true,
        },
      ],
    },
  ],
};

const accountCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "**${if(name, name, 'Unknown Account')}**",
          wrap: true,
          size: "Medium",
          weight: "Bolder",
        },
        {
          type: "FactSet",
          facts: [
            { title: "TPID", value: "${if(tpid, tpid, 'N/A')}" },
            { title: "Owner", value: "${if(owner, owner, 'Unknown')}" },
            {
              title: "Account ID",
              value: "${if(accountId, accountId, 'N/A')}",
            },
          ],
        },
      ],
    },
  ],
};

const genericResultCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "Container",
      $data: "${$root}",
      items: [
        {
          type: "TextBlock",
          text: "${if($root, $root, 'No data')}",
          wrap: true,
        },
      ],
    },
  ],
};

// --- Operation → card template mapping ---

const cardMapping = {
  // Opportunity operations
  listOpportunities: opportunityCard,
  getMyOpportunities: opportunityCard,
  viewOpportunityCostTrend: genericResultCard,
  manageDealTeam: operationResultCard,

  // Milestone operations
  getMilestones: milestoneCard,
  findMilestonesNeedingTasks: milestoneCard,
  getMilestoneActivities: taskCard,
  getMilestoneFieldOptions: fieldOptionCard,
  viewMilestoneTimeline: genericResultCard,
  manageMilestoneTeam: operationResultCard,

  // Write operations (staged)
  createMilestone: stagedOperationCard,
  updateMilestone: stagedOperationCard,
  createTask: stagedOperationCard,
  updateTask: stagedOperationCard,
  closeTask: stagedOperationCard,
  listPendingOperations: stagedOperationCard,

  // Approval operations
  executeOperation: operationResultCard,
  executeAll: operationResultCard,
  cancelOperation: operationResultCard,
  cancelAll: operationResultCard,
  viewStagedDiff: genericResultCard,

  // Identity & metadata
  whoAmI: identityCard,
  queryEntities: genericResultCard,
  getRecord: genericResultCard,
  getTaskStatusOptions: fieldOptionCard,
  listAccountsByTpid: accountCard,
};

// --- Execute ---

function main() {
  if (!fs.existsSync(GENERATED_CARDS_DIR)) {
    console.log(
      `Generated cards directory not found: ${GENERATED_CARDS_DIR}`
    );
    console.log("Run 'npm run compile' first.");
    process.exit(1);
  }

  let replaced = 0;
  let skipped = 0;

  for (const [operationName, cardTemplate] of Object.entries(cardMapping)) {
    const cardPath = path.join(GENERATED_CARDS_DIR, `${operationName}.json`);
    const content = JSON.stringify(cardTemplate, null, 2) + "\n";

    if (fs.existsSync(cardPath)) {
      fs.writeFileSync(cardPath, content, "utf8");
      replaced++;
    } else {
      // Card file doesn't exist (operation may not have auto-generated one)
      fs.writeFileSync(cardPath, content, "utf8");
      skipped++;
      console.log(`  Created missing card: ${operationName}.json`);
    }
  }

  console.log(
    `Adaptive cards: ${replaced} replaced, ${skipped} created. Total: ${replaced + skipped}`
  );
}

main();
