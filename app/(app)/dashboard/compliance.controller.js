// =======================
// src/dashboard/compliance.controller.js
// =======================

const prisma = require("../prisma");

function parseIntSafe(v, fallback) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function upper(v) {
  return String(v || "").trim().toUpperCase();
}

async function getComplianceAlerts(req, res) {
  try {
    const days = Math.min(365, Math.max(1, parseIntSafe(req.query.days, 30)));
    const now = new Date();
    const limit = Math.min(200, Math.max(10, parseIntSafe(req.query.limit, 100)));

    const until = new Date(now);
    until.setDate(until.getDate() + days);

    // =========================
    // Vehicles
    // =========================
    const [vehiclesExpiring, vehiclesExpiredCount] = await Promise.all([
      prisma.vehicles.findMany({
        where: {
          is_active: true,
          license_expiry_date: { gte: now, lte: until },
        },
        orderBy: { license_expiry_date: "asc" },
        take: limit,
        select: {
          id: true,
          fleet_no: true,
          plate_no: true,
          display_name: true,
          status: true,
          is_active: true,
          license_no: true,
          license_issue_date: true,
          license_expiry_date: true,
          disable_reason: true,
          supervisor_id: true,
          updated_at: true,
        },
      }),
      prisma.vehicles.count({
        where: {
          is_active: true,
          license_expiry_date: { lt: now },
        },
      }),
    ]);

    // =========================
    // Drivers
    // =========================
    const [driversExpiring, driversExpiredCount] = await Promise.all([
      prisma.drivers.findMany({
        where: {
          is_active: true,
          license_expiry_date: { gte: now, lte: until },
          // لو عندك status ACTIVE فقط في drop-down: نخليه تنبيه برضه لكل النشطين
          // ...(اختياري) status: "ACTIVE"
        },
        orderBy: { license_expiry_date: "asc" },
        take: limit,
        select: {
          id: true,
          full_name: true,
          phone: true,
          phone2: true,
          national_id: true,
          hire_date: true,
          license_no: true,
          license_issue_date: true,
          license_expiry_date: true,
          status: true,
          disable_reason: true,
          is_active: true,
          updated_at: true,
        },
      }),
      prisma.drivers.count({
        where: {
          is_active: true,
          license_expiry_date: { lt: now },
        },
      }),
    ]);

    // =========================
    // Counts (Expiring)
    // =========================
    const [vehiclesExpiringCount, driversExpiringCount] = await Promise.all([
      prisma.vehicles.count({
        where: {
          is_active: true,
          license_expiry_date: { gte: now, lte: until },
        },
      }),
      prisma.drivers.count({
        where: {
          is_active: true,
          license_expiry_date: { gte: now, lte: until },
        },
      }),
    ]);

    return res.json({
      range: {
        days,
        now,
        until,
        limit,
      },
      counts: {
        vehicles: {
          expiring: vehiclesExpiringCount,
          expired: vehiclesExpiredCount,
        },
        drivers: {
          expiring: driversExpiringCount,
          expired: driversExpiredCount,
        },
      },
      items: {
        vehicles_expiring: vehiclesExpiring,
        drivers_expiring: driversExpiring,
      },
    });
  } catch (e) {
    return res.status(500).json({
      message: "Failed to load compliance alerts",
      error: e.message,
    });
  }
}

module.exports = { getComplianceAlerts };