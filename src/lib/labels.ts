import type { Enums } from "@/lib/database.types";

export const RESERVATION_STATUS: Record<Enums<"reservation_status">, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  checked_in: "In house",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const ROOM_STATUS: Record<Enums<"room_status">, string> = {
  vacant_clean: "Vacant · clean",
  vacant_dirty: "Vacant · dirty",
  occupied: "Occupied",
  out_of_order: "Out of order",
};

export const ITEM_KIND: Record<Enums<"folio_item_kind">, string> = {
  room: "Room",
  food: "Food & drink",
  laundry: "Laundry",
  minibar: "Minibar",
  other: "Other",
  tax: "Tax",
  discount: "Discount",
};

export const PAYMENT_METHOD: Record<Enums<"payment_method">, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  paystack: "Card (Paystack)",
};

export const REQUEST_TYPE: Record<Enums<"request_type">, string> = {
  housekeeping: "Housekeeping",
  laundry: "Laundry pickup",
  room_service: "Room service",
  repair: "Something's broken",
};

export const REQUEST_STATUS: Record<Enums<"request_status">, string> = {
  open: "Sent",
  in_progress: "On it",
  done: "Done",
  cancelled: "Cancelled",
};
