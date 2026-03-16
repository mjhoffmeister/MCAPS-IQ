/**
 * Eval: Tool Call Correctness
 *
 * Validates that skill activations produce the correct tool calls
 * with proper parameters, ordering, and sequencing.
 * All write operations are mocked — no real CRM/vault/M365 mutations.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  MockMcpRecorder,
  MockCrmServer,
  MockOilServer,
  MockM365Server,
  computeOverallScore,
  passLevel,
  type EvalResult,
} from "../harness.js";
import { judgeToolSequence } from "../judges/tool-sequence.js";
import { CrmFixtureFactory } from "../fixtures/generators/crm-factory.js";
import { OilFixtureFactory } from "../fixtures/generators/oil-factory.js";

let recorder: MockMcpRecorder;
let crm: MockCrmServer;
let oil: MockOilServer;
let m365: MockM365Server;

beforeAll(async () => {
  recorder = new MockMcpRecorder();
  crm = new MockCrmServer(recorder);
  oil = new MockOilServer(recorder);
  m365 = new MockM365Server(recorder);
  try {
    await crm.loadFixtures();
  } catch {
    // Disk fixtures not available — use synthetic factory
    crm.loadFromFactory(CrmFixtureFactory.pipelineHealth().build());
    oil.loadFromFactory(OilFixtureFactory.standard().build());
  }
});

beforeEach(() => {
  recorder.reset();
  crm.stagedWrites.length = 0;
  oil.stagedWrites.length = 0;
});

describe("Tool Call Correctness", () => {
  describe("milestone-health-review — scoped query", () => {
    it("calls auth, vault, then scoped milestones in order", ({ task }) => {
      // Simulate the expected tool call sequence
      crm.handle("msx-crm:crm_auth_status");
      oil.handle("oil:get_customer_context", { customer: "Contoso" });
      crm.handle("msx-crm:get_milestones", {
        customerKeyword: "Contoso",
        statusFilter: "active",
        includeTasks: true,
      });

      const result = judgeToolSequence(
        recorder.calls,
        [
          { tool: "msx-crm:crm_auth_status", order: 1 },
          { tool: "oil:get_customer_context", order: 2 },
          { tool: "msx-crm:get_milestones", order: 3, paramsContains: { customerKeyword: "Contoso" } },
        ],
      );

      task.meta.evalScenarioId = "milestone-health-scoped";
      task.meta.evalDimension = "toolCorrectness";
      task.meta.evalScore = result.score;
      task.meta.evalPass = result.pass;

      expect(result.pass).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.orderViolations).toHaveLength(0);
      expect(result.score).toBeGreaterThanOrEqual(0.85);
    });

    it("flags unscoped get_milestones as forbidden", () => {
      crm.handle("msx-crm:crm_auth_status");
      crm.handle("msx-crm:get_milestones", {}); // unscoped — bad!

      const result = judgeToolSequence(
        recorder.calls,
        [{ tool: "msx-crm:crm_auth_status" }, { tool: "msx-crm:get_milestones" }],
        [{ tool: "msx-crm:get_milestones", params: {} }],
      );

      expect(result.missing).toContain("FORBIDDEN: msx-crm:get_milestones was called");
    });

    it("matches paramsContains against the best candidate when tool appears multiple times", () => {
      crm.handle("msx-crm:get_milestones", { customerKeyword: "Contoso" });
      crm.handle("msx-crm:get_milestones", { statusFilter: "active" });

      const result = judgeToolSequence(recorder.calls, [
        { tool: "msx-crm:get_milestones", paramsContains: { statusFilter: "active" } },
      ]);

      expect(result.pass).toBe(true);
      expect(result.paramMismatches).toHaveLength(0);
    });
  });

  describe("morning-brief — parallel retrieval", () => {
    it("calls vault and auth in parallel, then CRM queries", ({ task }) => {
      // Phase 1: parallel
      oil.handle("oil:get_vault_context");
      crm.handle("msx-crm:crm_auth_status");

      // Phase 2: CRM queries
      crm.handle("msx-crm:get_my_active_opportunities");
      crm.handle("msx-crm:get_milestones", {
        statusFilter: "active",
        includeTasks: true,
      });

      const result = judgeToolSequence(recorder.calls, [
        { tool: "oil:get_vault_context", phase: 1 },
        { tool: "msx-crm:crm_auth_status", phase: 1 },
        { tool: "msx-crm:get_my_active_opportunities", phase: 2 },
        { tool: "msx-crm:get_milestones", phase: 2 },
      ]);

      task.meta.evalScenarioId = "morning-brief-parallel";
      task.meta.evalDimension = "toolCorrectness";
      task.meta.evalScore = result.score;
      task.meta.evalPass = result.pass;

      expect(result.pass).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe("vault-first — CRM after vault", () => {
    it("vault context is fetched before any CRM call", () => {
      oil.handle("oil:get_vault_context");
      oil.handle("oil:get_customer_context", { customer: "Contoso" });
      crm.handle("msx-crm:crm_query", {
        entitySet: "opportunities",
        filter: "contains(name,'Contoso')",
      });

      expect(recorder.wasCalledBefore("oil:get_vault_context", "msx-crm:crm_query")).toBe(true);
    });

    it("detects vault skip when CRM is called first", () => {
      crm.handle("msx-crm:crm_query", { entitySet: "opportunities" });
      oil.handle("oil:get_vault_context");

      expect(recorder.wasCalledBefore("oil:get_vault_context", "msx-crm:crm_query")).toBe(false);
    });
  });

  describe("pipeline-hygiene-triage — auth then opportunities", () => {
    it("calls auth before opportunity retrieval", () => {
      crm.handle("msx-crm:crm_auth_status");
      crm.handle("msx-crm:get_my_active_opportunities");

      const result = judgeToolSequence(recorder.calls, [
        { tool: "msx-crm:crm_auth_status", order: 1 },
        { tool: "msx-crm:get_my_active_opportunities", order: 2 },
      ]);

      expect(result.pass).toBe(true);
    });
  });

  describe("write operations — staging guard", () => {
    it("CRM write operations are staged, not directly executed", () => {
      crm.handle("msx-crm:crm_whoami");
      crm.handle("msx-crm:update_milestone", {
        milestoneId: "ms-111111-aaaa-bbbb-cccc-111111111111",
        payload: { msp_milestonestatus: 861980002 },
      });

      // Write should be staged, not executed
      expect(crm.stagedWrites).toHaveLength(1);
      expect(crm.stagedWrites[0].tool).toBe("update_milestone");

      // Recorder should show it was staged
      const writeCall = recorder.callsTo("msx-crm:update_milestone");
      expect(writeCall).toHaveLength(1);
      expect((writeCall[0].response as Record<string, unknown>).staged).toBe(true);
    });

    it("OIL write operations are staged, not directly executed", () => {
      oil.handle("oil:write_note", {
        path: "Meetings/2026-03-16.md",
        content: "# Meeting Notes",
      });

      expect(oil.stagedWrites).toHaveLength(1);
      expect(oil.stagedWrites[0].tool).toBe("write_note");
    });

    it("no execute_operation or execute_all without prior staging", () => {
      // Directly calling execute without staging should be recorded
      crm.handle("msx-crm:execute_operation", { operationId: "OP-1" });

      expect(crm.stagedWrites).toHaveLength(1);
      expect(crm.stagedWrites[0].description).toContain("MOCK");
    });
  });
});
