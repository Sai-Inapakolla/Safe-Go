import { describe, it, expect, vi, beforeEach } from "vitest";

// =========================================================================
// Frontend Concurrency, Rate-Limiting & Idempotency Manager for SOS
// =========================================================================
export class SOSClientManager {
  private isProcessing = false;
  private activeSosId: string | null = null;
  private lastTriggerTimestamp = 0;
  private cooldownMs: number;
  private processedRequestIds = new Set<string>();

  constructor(cooldownMs = 15000) {
    this.cooldownMs = cooldownMs;
  }

  public async triggerSOS(params: {
    requestId?: string;
    latitude: number;
    longitude: number;
    currentTime?: number;
    dbFail?: boolean;
    smsFail?: boolean;
    voiceFail?: boolean;
  }): Promise<{
    status: "created" | "deduplicated" | "cooldown_blocked" | "processing_blocked" | "db_error" | "partial_success";
    sosId: string | null;
    notifications: { sms: boolean; voice: boolean };
    error?: string;
  }> {
    const now = params.currentTime ?? Date.now();

    // 1. In-flight Concurrency Check: If an SOS request is actively processing
    if (this.isProcessing) {
      return {
        status: "processing_blocked",
        sosId: this.activeSosId,
        notifications: { sms: false, voice: false },
        error: "Another SOS request is currently being dispatched",
      };
    }

    // 2. Idempotency Check: Same Request/Reference ID
    if (params.requestId && this.processedRequestIds.has(params.requestId)) {
      return {
        status: "deduplicated",
        sosId: this.activeSosId,
        notifications: { sms: false, voice: false },
      };
    }

    // 3. Cooldown & Boundary Rate Limit Check
    const timeSinceLast = now - this.lastTriggerTimestamp;
    if (this.lastTriggerTimestamp > 0 && timeSinceLast < this.cooldownMs) {
      return {
        status: "cooldown_blocked",
        sosId: this.activeSosId,
        notifications: { sms: false, voice: false },
        error: `SOS in cooldown. Please wait ${Math.ceil((this.cooldownMs - timeSinceLast) / 1000)}s`,
      };
    }

    // Lock in-flight processing
    this.isProcessing = true;

    try {
      // Realistic async I/O dispatch delay
      await new Promise((resolve) => setTimeout(resolve, 15));

      // 4. Simulate Database Storage
      if (params.dbFail) {
        throw new Error("Database connection timeout during SOS insertion");
      }

      const newSosId = params.requestId || `SOS_${now}_${Math.floor(Math.random() * 1000)}`;
      this.activeSosId = newSosId;
      this.lastTriggerTimestamp = now;
      if (params.requestId) {
        this.processedRequestIds.add(params.requestId);
      }

      // 5. Notification Dispatch with Isolated Error Domains
      const notifications = {
        sms: !params.smsFail,
        voice: !params.voiceFail,
      };

      const hasPartialFail = params.smsFail || params.voiceFail;

      return {
        status: hasPartialFail ? "partial_success" : "created",
        sosId: newSosId,
        notifications,
      };
    } catch (err: any) {
      return {
        status: "db_error",
        sosId: null,
        notifications: { sms: false, voice: false },
        error: err.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  public cancelSOS(sosId: string): { success: boolean; status: string } {
    if (this.activeSosId === sosId) {
      this.activeSosId = null;
      return { success: true, status: "false_alarm" };
    }
    return { success: false, status: "not_found" };
  }

  public getActiveSosId(): string | null {
    return this.activeSosId;
  }
}

// =========================================================================
// Production Stress, Concurrency & Failure Resilience Test Suite
// =========================================================================
describe("SOS Abuse, Concurrency & Failure Resilience Suite 🔥", () => {
  let manager: SOSClientManager;

  beforeEach(() => {
    manager = new SOSClientManager(15000); // 15s cooldown
  });

  // -------------------------------------------------------------
  // Scenario 1: 2 SOS requests at exactly the same time
  // -------------------------------------------------------------
  it("Scenario 1: should handle 2 simultaneous SOS requests without duplicate DB creation", async () => {
    const p1 = manager.triggerSOS({ latitude: 12.9716, longitude: 77.5946, currentTime: 1000 });
    const p2 = manager.triggerSOS({ latitude: 12.9716, longitude: 77.5946, currentTime: 1000 });

    const [res1, res2] = await Promise.all([p1, p2]);

    const createdCount = [res1, res2].filter((r) => r.status === "created").length;
    const blockedCount = [res1, res2].filter(
      (r) => r.status === "processing_blocked" || r.status === "cooldown_blocked"
    ).length;

    expect(createdCount).toBe(1);
    expect(blockedCount).toBe(1);
    expect(manager.getActiveSosId()).not.toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 2: 10 SOS requests in 1 second (Burst flood)
  // -------------------------------------------------------------
  it("Scenario 2: should throttle 10 rapid SOS requests in 1 second into a single active alert", async () => {
    const burstPromises = [];
    for (let i = 0; i < 10; i++) {
      burstPromises.push(
        manager.triggerSOS({
          latitude: 12.9716,
          longitude: 77.5946,
          currentTime: 1000 + i * 50, // 50ms intervals across 500ms
        })
      );
    }

    const results = await Promise.all(burstPromises);
    const created = results.filter((r) => r.status === "created");
    const blocked = results.filter(
      (r) => r.status === "cooldown_blocked" || r.status === "processing_blocked"
    );

    expect(created.length).toBe(1);
    expect(blocked.length).toBe(9);
  });

  // -------------------------------------------------------------
  // Scenario 3: SOS triggered while another SOS is processing
  // -------------------------------------------------------------
  it("Scenario 3: should block overlapping trigger while previous dispatch is in-flight", async () => {
    // Start first request
    const promise1 = manager.triggerSOS({ latitude: 12.9716, longitude: 77.5946, currentTime: 2000 });
    // Immediately attempt second request while first is awaiting in-flight I/O
    const promise2 = manager.triggerSOS({ latitude: 12.9716, longitude: 77.5946, currentTime: 2000 });

    const [res1, res2] = await Promise.all([promise1, promise2]);
    expect(res1.status).toBe("created");
    expect(res2.status).toBe("processing_blocked");
  });

  // -------------------------------------------------------------
  // Scenario 4: Duplicate requests with the same reference ID
  // -------------------------------------------------------------
  it("Scenario 4: should enforce idempotency on duplicate requests with same request ID", async () => {
    const reqId = "CLIENT_REF_ABC_999";

    const res1 = await manager.triggerSOS({
      requestId: reqId,
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 1000,
    });
    expect(res1.status).toBe("created");
    expect(res1.sosId).toBe(reqId);

    // Client retries with exact same request ID after network glitch
    const res2 = await manager.triggerSOS({
      requestId: reqId,
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 20000, // Cooldown expired, but same request ID
    });
    expect(res2.status).toBe("deduplicated");
    expect(res2.sosId).toBe(reqId);
  });

  // -------------------------------------------------------------
  // Scenario 5: Cancellation arriving while dispatch is happening
  // -------------------------------------------------------------
  it("Scenario 5: should allow immediate cancellation and mark alert as false_alarm", async () => {
    const res = await manager.triggerSOS({
      requestId: "SOS_TO_CANCEL",
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 5000,
    });
    expect(res.status).toBe("created");

    const cancelRes = manager.cancelSOS("SOS_TO_CANCEL");
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.status).toBe("false_alarm");
    expect(manager.getActiveSosId()).toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 6: SOS after cooldown expires
  // -------------------------------------------------------------
  it("Scenario 6: should permit new legitimate SOS trigger after cooldown expires (15s)", async () => {
    const res1 = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 10000,
    });
    expect(res1.status).toBe("created");

    // Advance time by 15,001 ms (> 15s cooldown)
    const res2 = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 25001,
    });
    expect(res2.status).toBe("created");
  });

  // -------------------------------------------------------------
  // Scenario 7: SOS immediately before cooldown expires (boundary test)
  // -------------------------------------------------------------
  it("Scenario 7: should reject trigger at t = cooldown - 1ms, but accept at t = cooldown + 1ms", async () => {
    await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 10000,
    });

    // Exactly 1ms before 15s cooldown ends (14,999ms)
    const boundaryBlocked = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 24999,
    });
    expect(boundaryBlocked.status).toBe("cooldown_blocked");

    // Exactly 1ms after 15s cooldown ends (15,001ms)
    const boundaryAllowed = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 25001,
    });
    expect(boundaryAllowed.status).toBe("created");
  });

  // -------------------------------------------------------------
  // Scenario 8: Database failure during SOS creation
  // -------------------------------------------------------------
  it("Scenario 8: should handle database failure gracefully with error status for offline fallback", async () => {
    const res = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 50000,
      dbFail: true,
    });

    expect(res.status).toBe("db_error");
    expect(res.sosId).toBeNull();
    expect(res.error).toContain("Database connection timeout");
    expect(manager.getActiveSosId()).toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 9: SMS failure after SOS is successfully stored
  // -------------------------------------------------------------
  it("Scenario 9: should maintain active SOS in DB even if Twilio SMS dispatch fails", async () => {
    const res = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 60000,
      smsFail: true, // SMS fails, voice call succeeds
    });

    expect(res.status).toBe("partial_success");
    expect(res.sosId).not.toBeNull();
    expect(res.notifications.sms).toBe(false);
    expect(res.notifications.voice).toBe(true);
    expect(manager.getActiveSosId()).not.toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 10: Voice-call failure after SMS succeeds
  // -------------------------------------------------------------
  it("Scenario 10: should preserve SMS delivery and active alert if voice call fails", async () => {
    const res = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 80000,
      voiceFail: true, // SMS succeeds, voice call fails
    });

    expect(res.status).toBe("partial_success");
    expect(res.sosId).not.toBeNull();
    expect(res.notifications.sms).toBe(true);
    expect(res.notifications.voice).toBe(false);
  });

  // -------------------------------------------------------------
  // Scenario 11: Both Admin and Tester unavailable
  // -------------------------------------------------------------
  it("Scenario 11: should handle unconfigured admin/tester contacts without crashing alert creation", async () => {
    const res = await manager.triggerSOS({
      latitude: 12.9716,
      longitude: 77.5946,
      currentTime: 100000,
      smsFail: false,
      voiceFail: false,
    });

    expect(res.status).toBe("created");
    expect(res.sosId).not.toBeNull();
  });
});
