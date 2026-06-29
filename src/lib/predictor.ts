// Deterministic zero-day risk predictor.
// Same input → same output, always. No randomness, no time-based logic.

export type InputType = "url" | "code" | "log";

export interface VulnFinding {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
}

export interface Breakdown {
  input_validation: number;     // 20%
  authentication: number;       // 15%
  injection: number;            // 25%
  dependency: number;           // 15%
  api_exposure: number;         // 10%
  behavioral: number;           // 15%
}

export interface PredictionResult {
  risk_score: number;            // 0–100, 2 decimals
  risk_level: "Safe" | "Moderate" | "High" | "Critical";
  breakdown: Breakdown;
  vulnerabilities: VulnFinding[];
  input_hash: string;
}

// FNV-1a 32-bit — deterministic, pure
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function hashHex(input: string): string {
  return fnv1a(input).toString(16).padStart(8, "0");
}

// Deterministic 0..1 pseudo-jitter from input hash; stable per input.
function jitter(hash: number, seed: number): number {
  const x = Math.imul(hash ^ seed, 0x9e3779b9) >>> 0;
  return (x % 1000) / 1000;
}

interface Rule {
  id: string;
  title: string;
  category: keyof Breakdown;
  weight: number; // points contributed to that category (0..100)
  severity: VulnFinding["severity"];
  pattern: RegExp;
}

const RULES: Rule[] = [
  // Injection
  { id: "sqli-concat", title: "Possible SQL Injection (string concatenation)", category: "injection", weight: 72, severity: "critical", pattern: /(SELECT|INSERT|UPDATE|DELETE)\b[^;]{0,80}(\+|\$\{|%s|\%\(|\bconcat\b)/i },
  { id: "sqli-or-1", title: "Classic SQLi payload signature (' OR 1=1)", category: "injection", weight: 88, severity: "critical", pattern: /('|%27)\s*or\s+1\s*=\s*1/i },
  { id: "xss-script", title: "Reflected XSS payload (<script>)", category: "injection", weight: 78, severity: "high", pattern: /<\s*script\b[^>]*>/i },
  { id: "xss-on", title: "Inline event handler (onerror/onload)", category: "injection", weight: 52, severity: "medium", pattern: /\bon(error|load|click|mouseover)\s*=/i },
  { id: "innerhtml", title: "Unsanitized innerHTML / dangerouslySetInnerHTML", category: "injection", weight: 60, severity: "high", pattern: /\b(innerHTML|dangerouslySetInnerHTML)\b/ },
  { id: "cmd-inject", title: "Shell command execution with user input", category: "injection", weight: 80, severity: "critical", pattern: /\b(exec|spawn|system|popen|child_process)\b[^;]{0,80}(\+|\$\{|req\.|request\.|input)/i },
  { id: "py-eval", title: "Use of eval / exec / pickle.loads", category: "injection", weight: 70, severity: "high", pattern: /\b(eval|exec|pickle\.loads)\s*\(/ },

  // Authentication
  { id: "hardcoded-secret", title: "Hardcoded credential / API key", category: "authentication", weight: 80, severity: "critical", pattern: /(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i },
  { id: "md5", title: "Weak password hash (MD5/SHA1)", category: "authentication", weight: 55, severity: "high", pattern: /\b(md5|sha1)\s*\(/i },
  { id: "jwt-none", title: 'JWT "none" algorithm accepted', category: "authentication", weight: 75, severity: "critical", pattern: /alg\s*[:=]\s*["']none["']/i },
  { id: "no-auth", title: "Auth check disabled (auth=false)", category: "authentication", weight: 45, severity: "medium", pattern: /\b(verify|auth|require_auth)\s*[:=]\s*false/i },
  { id: "default-creds", title: "Default credentials in code (admin/admin)", category: "authentication", weight: 60, severity: "high", pattern: /(admin\s*[:=]\s*["']admin["']|root\s*[:=]\s*["']root["'])/i },

  // Input validation
  { id: "no-validate", title: "Missing input validation on request body", category: "input_validation", weight: 40, severity: "medium", pattern: /req\.(body|query|params)\.[a-zA-Z_]+/ },
  { id: "regex-dos", title: "Catastrophic regex / ReDoS pattern", category: "input_validation", weight: 50, severity: "medium", pattern: /\(\.\*\)\+|\(\.\+\)\+|\([^)]*\+\)\+/ },
  { id: "path-traversal", title: "Path traversal payload (../)", category: "input_validation", weight: 65, severity: "high", pattern: /\.\.\/|\.\.\\|%2e%2e%2f/i },
  { id: "open-redirect", title: "Open redirect parameter", category: "input_validation", weight: 35, severity: "medium", pattern: /[?&](redirect|url|next|return)=https?:\/\//i },

  // Dependency
  { id: "outdated-lib", title: "Reference to known-vulnerable library", category: "dependency", weight: 55, severity: "high", pattern: /\b(log4j|struts2|jquery@?1\.|lodash@?3\.|express@?3\.)/i },
  { id: "unsafe-dep", title: "Unrestricted dependency wildcard (^* or latest)", category: "dependency", weight: 35, severity: "medium", pattern: /"[^"]+"\s*:\s*"(\*|latest)"/ },

  // API exposure
  { id: "cors-all", title: "Wide-open CORS (Access-Control-Allow-Origin: *)", category: "api_exposure", weight: 60, severity: "high", pattern: /access-control-allow-origin\s*[:=]\s*["']?\*/i },
  { id: "debug-on", title: "Debug mode enabled in production code", category: "api_exposure", weight: 45, severity: "medium", pattern: /\bDEBUG\s*=\s*True\b|debug\s*:\s*true/ },
  { id: "exposed-key", title: "Server secret in client/URL", category: "api_exposure", weight: 70, severity: "high", pattern: /(aws_secret|service_role|private_key)/i },
  { id: "http-url", title: "Plaintext HTTP endpoint", category: "api_exposure", weight: 30, severity: "low", pattern: /\bhttp:\/\/(?!localhost|127\.0\.0\.1)/ },

  // Behavioral / log anomalies
  { id: "many-401", title: "Burst of 401/403 responses (possible brute force)", category: "behavioral", weight: 70, severity: "high", pattern: /\b(401|403)\b[^\n]{0,40}\b(401|403)\b[^\n]{0,40}\b(401|403)\b/ },
  { id: "sqli-log", title: "SQLi probe in request log", category: "behavioral", weight: 65, severity: "high", pattern: /(union\s+select|information_schema|sleep\(\d+\))/i },
  { id: "scanner-ua", title: "Known vulnerability scanner User-Agent", category: "behavioral", weight: 55, severity: "medium", pattern: /\b(sqlmap|nikto|nmap|acunetix|nessus|burp)\b/i },
  { id: "rce-log", title: "RCE indicator in log (wget|curl piped to sh)", category: "behavioral", weight: 80, severity: "critical", pattern: /\b(wget|curl)\b[^\n]{0,80}\|\s*(sh|bash)/i },
];

const CATEGORY_WEIGHTS: Record<keyof Breakdown, number> = {
  input_validation: 0.20,
  authentication: 0.15,
  injection: 0.25,
  dependency: 0.15,
  api_exposure: 0.10,
  behavioral: 0.15,
};

function snippet(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - 20);
  const end = Math.min(text.length, match.index + match[0].length + 30);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function predictThreat(input: string, type: InputType): PredictionResult {
  const normalized = input.trim();
  const hash = fnv1a(`${type}:${normalized}`);
  const input_hash = hashHex(`${type}:${normalized}`);

  const categoryScores: Breakdown = {
    input_validation: 0,
    authentication: 0,
    injection: 0,
    dependency: 0,
    api_exposure: 0,
    behavioral: 0,
  };
  const findings: VulnFinding[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    const m = rule.pattern.exec(normalized);
    if (!m) continue;
    if (!seen.has(rule.id)) {
      seen.add(rule.id);
      findings.push({
        id: rule.id,
        title: rule.title,
        severity: rule.severity,
        evidence: snippet(normalized, m),
      });
    }
    // accumulate but cap per category at 100
    categoryScores[rule.category] = Math.min(100, categoryScores[rule.category] + rule.weight);
  }

  // Add small deterministic baseline so empty/clean inputs aren't always 0,
  // and so different clean inputs aren't perfectly identical.
  for (const key of Object.keys(categoryScores) as (keyof Breakdown)[]) {
    if (categoryScores[key] === 0) {
      categoryScores[key] = Math.round(jitter(hash, key.length * 31) * 18); // 0..18 baseline
    }
  }

  // Type-based modulation
  if (type === "url") {
    if (/^https:\/\//i.test(normalized)) categoryScores.api_exposure = Math.max(0, categoryScores.api_exposure - 10);
    if (/[?&](id|user|file|page)=\d+/i.test(normalized)) categoryScores.input_validation += 15;
  }
  if (type === "log") {
    const lines = normalized.split("\n").length;
    if (lines > 50) categoryScores.behavioral += 10;
  }
  if (type === "code") {
    if (normalized.length > 800 && findings.length === 0) categoryScores.input_validation += 8;
  }

  // Final weighted score
  let score = 0;
  for (const key of Object.keys(categoryScores) as (keyof Breakdown)[]) {
    categoryScores[key] = Math.min(100, Math.max(0, Math.round(categoryScores[key])));
    score += categoryScores[key] * CATEGORY_WEIGHTS[key];
  }
  const risk_score = Math.round(score * 100) / 100;

  const risk_level: PredictionResult["risk_level"] =
    risk_score <= 30 ? "Safe" :
    risk_score <= 60 ? "Moderate" :
    risk_score <= 80 ? "High" : "Critical";

  // Sort findings: critical → low
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return { risk_score, risk_level, breakdown: categoryScores, vulnerabilities: findings, input_hash };
}
