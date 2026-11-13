/**
 * Pramana AI — Deterministic Schema Validator (INV-08)
 * Pure JS runtime validator for AuditReportPayload & URL brand extraction.
 */

export const REQUIRED_SKILLS = Object.freeze([
  'BrowserSandboxSkill',
  'TraceCorrelatorSkill',
  'ASTBlastRadiusSkill',
  'GitPatchSkill',
]);

export const MAX_TELEMETRY_COST_USD = 0.03;

/**
 * Extracts a clean display brand name from a target URL.
 * @param {string} url
 * @returns {string}
 */
export function extractBrandFromUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return 'UnknownBrand';
  try {
    const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./i, '');
    const parts = host.split('.').filter(Boolean);
    const core = parts.length >= 2 ? parts[0] : host;
    if (!core) return 'UnknownBrand';
    return core
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  } catch {
    return 'UnknownBrand';
  }
}

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Validates an AuditReportPayload against INV-08.
 * @param {object} payload
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAuditReportPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Payload must be a non-null JSON object.'] };
  }

  if (!isNonEmptyString(payload.audit_id)) {
    errors.push('audit_id must be a non-empty string.');
  }

  if (!isNonEmptyString(payload.target_url)) {
    errors.push('target_url must be a non-empty URL string.');
  } else {
    try {
      const u = new URL(payload.target_url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        errors.push('target_url must use http or https protocol.');
      }
    } catch {
      errors.push('target_url is not a valid URL.');
    }
  }

  // viewport
  if (!payload.viewport || typeof payload.viewport !== 'object') {
    errors.push('viewport must be an object.');
  } else {
    if (!isFiniteNumber(payload.viewport.width) || payload.viewport.width <= 0) {
      errors.push('viewport.width must be a positive number.');
    }
    if (!isFiniteNumber(payload.viewport.height) || payload.viewport.height <= 0) {
      errors.push('viewport.height must be a positive number.');
    }
  }

  // anomaly
  if (!payload.anomaly || typeof payload.anomaly !== 'object') {
    errors.push('anomaly must be an object.');
  } else {
    if (!isNonEmptyString(payload.anomaly.id)) errors.push('anomaly.id is required.');
    if (!isNonEmptyString(payload.anomaly.title)) errors.push('anomaly.title is required.');
    if (!isNonEmptyString(payload.anomaly.severity)) errors.push('anomaly.severity is required.');
    if (!payload.anomaly.bounding_box || typeof payload.anomaly.bounding_box !== 'object') {
      errors.push('anomaly.bounding_box is required.');
    } else {
      for (const k of ['x', 'y', 'width', 'height']) {
        if (!isFiniteNumber(payload.anomaly.bounding_box[k])) {
          errors.push(`anomaly.bounding_box.${k} must be a finite number.`);
        }
      }
    }
  }

  // revenue_impact
  if (!payload.revenue_impact || typeof payload.revenue_impact !== 'object') {
    errors.push('revenue_impact must be an object.');
  } else {
    const hasLoss =
      isFiniteNumber(payload.revenue_impact.estimated_monthly_loss_usd) ||
      isFiniteNumber(payload.revenue_impact.estimated_monthly_loss_inr);
    if (!hasLoss) {
      errors.push('revenue_impact must include estimated_monthly_loss_usd or estimated_monthly_loss_inr.');
    }
  }

  // agent_skills_trace
  if (!Array.isArray(payload.agent_skills_trace)) {
    errors.push('agent_skills_trace must be an array.');
  } else {
    const present = new Set(payload.agent_skills_trace.map((s) => s && s.skill));
    for (const reqSkill of REQUIRED_SKILLS) {
      if (!present.has(reqSkill)) {
        errors.push(`agent_skills_trace is missing required skill: ${reqSkill}`);
      }
    }
  }

  // visual_patch
  if (!payload.visual_patch || typeof payload.visual_patch !== 'object') {
    errors.push('visual_patch must be an object.');
  } else if (!isNonEmptyString(payload.visual_patch.mode)) {
    errors.push('visual_patch.mode is required.');
  }

  // self_healing_pr
  if (!payload.self_healing_pr || typeof payload.self_healing_pr !== 'object') {
    errors.push('self_healing_pr must be an object.');
  } else {
    if (!isNonEmptyString(payload.self_healing_pr.target_file)) {
      errors.push('self_healing_pr.target_file is required.');
    }
    if (payload.self_healing_pr.verified_in_ast !== true) {
      errors.push('self_healing_pr.verified_in_ast must be true (INV-04).');
    }
    if (!isNonEmptyString(payload.self_healing_pr.unified_diff)) {
      errors.push('self_healing_pr.unified_diff is required.');
    }
  }

  // telemetry_cost_usd <= 0.03
  if (!isFiniteNumber(payload.telemetry_cost_usd)) {
    errors.push('telemetry_cost_usd must be a finite number.');
  } else if (payload.telemetry_cost_usd < 0 || payload.telemetry_cost_usd > MAX_TELEMETRY_COST_USD) {
    errors.push(`telemetry_cost_usd (${payload.telemetry_cost_usd}) exceeds INV-08 ceiling of ${MAX_TELEMETRY_COST_USD}.`);
  }

  return { valid: errors.length === 0, errors };
}

export default validateAuditReportPayload;
