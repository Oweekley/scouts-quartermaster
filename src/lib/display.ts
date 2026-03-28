import { EquipmentCondition, EquipmentStatus, MaintenancePriority, MaintenanceStatus } from "@prisma/client";

export function statusLabel(status: EquipmentStatus) {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "CHECKED_OUT":
      return "Checked out";
    case "MAINTENANCE":
      return "Maintenance";
    case "RETIRED":
      return "Retired";
  }
}

export function conditionLabel(condition: EquipmentCondition) {
  switch (condition) {
    case "EXCELLENT":
      return "Excellent";
    case "GOOD":
      return "Good";
    case "FAIR":
      return "Fair";
    case "POOR":
      return "Poor";
    case "DAMAGED":
      return "Damaged";
    case "OUT_OF_SERVICE":
      return "Out of service";
  }
}

export function maintenanceStatusLabel(status: MaintenanceStatus) {
  switch (status) {
    case "OPEN":
      return "Open";
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
    case "CANCELED":
      return "Canceled";
  }
}

export function maintenancePriorityLabel(priority: MaintenancePriority) {
  switch (priority) {
    case "LOW":
      return "Low";
    case "MEDIUM":
      return "Medium";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
  }
}

