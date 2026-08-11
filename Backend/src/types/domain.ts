export const USER_ROLES = ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CUSTOMER_TYPES = ["Retail", "Wholesale", "Distributor"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_STATUSES = ["Lead", "Active", "Inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const MOVEMENT_TYPES = ["IN", "OUT"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const CHALLAN_STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED"] as const;
export type ChallanStatus = (typeof CHALLAN_STATUSES)[number];
