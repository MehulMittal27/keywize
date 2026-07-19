import assert from "node:assert/strict";
import test from "node:test";
import { toPublicMission } from "../lib/publicMission";
import type { Mission } from "../lib/types";

test("replaces private call-correlation IDs with deterministic browser slot keys", () => {
  const privateCorrelationId = "private-call-correlation-id";
  const mission = {
    vendorCalls: [
      {
        id: privateCorrelationId,
        role: "caller",
        vendorId: "vendor_a",
      },
      {
        id: "private-closer-correlation-id",
        role: "closer",
        vendorId: "vendor_c",
      },
    ],
  } as Mission;

  const publicMission = toPublicMission(mission);

  assert.deepEqual(
    publicMission.vendorCalls.map((call) => call.id),
    ["slot-caller-vendor_a", "slot-closer-vendor_c"]
  );
  assert.equal(JSON.stringify(publicMission).includes(privateCorrelationId), false);
  assert.equal(mission.vendorCalls[0].id, privateCorrelationId);
});
