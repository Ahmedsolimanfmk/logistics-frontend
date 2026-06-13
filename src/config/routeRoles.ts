export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": [],
  "/trips": [],
  "/finance": ["ADMIN", "ACCOUNTANT", "FIELD_SUPERVISOR", "SUPER_ADMIN"],
  "/clients": ["ADMIN", "HR", "SUPER_ADMIN"],
  "/sites": ["ADMIN", "HR", "SUPER_ADMIN"],
  "/contracts": ["ADMIN", "HR", "ACCOUNTANT", "SUPER_ADMIN"],
  "/contract-pricing": ["ADMIN", "HR", "ACCOUNTANT", "SUPER_ADMIN"],
  "/contract-pricing/vehicle-classes": ["ADMIN", "CONTRACT_MANAGER", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/contract-pricing/cargo-types": ["ADMIN", "CONTRACT_MANAGER", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/contract-pricing/zones": ["ADMIN", "CONTRACT_MANAGER", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/contract-pricing/routes": ["ADMIN", "CONTRACT_MANAGER", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/vehicles": ["ADMIN", "HR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/drivers": ["ADMIN", "HR", "SUPER_ADMIN"],
  "/cash": ["FIELD_SUPERVISOR", "SUPER_ADMIN"],
  "/maintenance": ["ADMIN", "HR", "ACCOUNTANT", "FIELD_SUPERVISOR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/maintenance/requests": ["ADMIN", "HR", "ACCOUNTANT", "FIELD_SUPERVISOR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/maintenance/work-orders": ["ADMIN", "ACCOUNTANT", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/maintenance/issued-parts": ["ADMIN", "HR", "ACCOUNTANT", "FIELD_SUPERVISOR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"], // Fallback if missing
  "/vendors": ["ADMIN", "ACCOUNTANT", "HR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/inventory": ["ADMIN", "STOREKEEPER", "ACCOUNTANT", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
  "/users": ["ADMIN", "SUPER_ADMIN"],
  "/supervisors": ["ADMIN", "HR", "GENERAL_SUPERVISOR", "SUPER_ADMIN"],
};

export function canAccessRoute(
  pathname: string,
  userRole?: string,
  effectiveRole?: string
): boolean {
  // Super Admins bypass everything
  if (
    userRole === "SUPER_ADMIN" ||
    effectiveRole === "SUPER_ADMIN"
  ) {
    return true;
  }

  const role = String(userRole || "").toUpperCase();
  const effRole = String(effectiveRole || "").toUpperCase();

  // Find matching route prefix (longest match first)
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(route + "/"));

  if (!matchedRoute) {
    // If no route matches, assume public/default access (or we can block). We allow for now.
    return true;
  }

  const allowedRoles = ROUTE_PERMISSIONS[matchedRoute];

  if (!allowedRoles || allowedRoles.length === 0) {
    // Empty array means everyone authenticated can access
    return true;
  }

  return allowedRoles.includes(role) || allowedRoles.includes(effRole);
}
