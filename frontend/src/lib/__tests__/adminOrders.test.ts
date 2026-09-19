/**
 * The transition map here mirrors ORDER_STATUS_TRANSITIONS in the backend's
 * order_service.py. It exists so the UI only offers moves the API will accept;
 * these tests pin the shape so the two can't drift silently.
 */
import { allowedNextStatuses, ORDER_STATUS_TRANSITIONS } from "../adminOrders";

describe("allowedNextStatuses", () => {
  it("offers forward moves and cancellation from a live order", () => {
    expect(allowedNextStatuses("pending")).toEqual([
      "payment_confirmed",
      "processing",
      "cancelled",
    ]);
  });

  it("offers nothing once an order is delivered", () => {
    expect(allowedNextStatuses("delivered")).toEqual([]);
  });

  it("offers nothing once an order is cancelled, so stock can't be returned twice", () => {
    expect(allowedNextStatuses("cancelled")).toEqual([]);
  });

  it("returns an empty list for an unknown status rather than throwing", () => {
    expect(allowedNextStatuses("refunded")).toEqual([]);
  });

  it("lets every live status be cancelled", () => {
    const live = ["pending", "payment_confirmed", "processing", "shipped"];
    live.forEach((status) => {
      expect(allowedNextStatuses(status)).toContain("cancelled");
    });
  });

  it("never allows a move out of a terminal status", () => {
    expect(ORDER_STATUS_TRANSITIONS.delivered).toHaveLength(0);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });
});
