import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_OWNER_GUARDS = {
  'cleanup.yml': [
    'cleanup_release',
    'cleanup_l2_release',
    'cleanup_docker_image',
  ],
  'deploy-main.yml': [ 'publish_image' ],
  'deploy-review.yml': [ 'make_slug', 'publish_image', 'deploy_review' ],
  'deploy-review-l2.yml': [
    'make_slug',
    'publish_image',
    'deploy_review_l2',
  ],
  'e2e-tests.yml': [ 'publish_image', 'deploy_e2e', 'test' ],
  'publish-image.yml': [ 'run' ],
};

const UPSTREAM_PROVIDER_PATTERN =
  /blockscout\/actions|vault\.k8s\.blockscout\.com|ghcr\.io\/blockscout/i;
const MUTABLE_LATEST_PATTERN =
  /ghcr\.io\/vinuchain\/vinuexplorer-frontend:latest/i;
const YAML_MERGE_KEY_PATTERN = /^\s*<<\s*:/m;
const PRIVILEGED_WORKFLOW_PATTERN =
  /^\s*packages:\s*write\s*(?:#.*)?$|docker\/(?:login|build-push)-action@/im;
const REPO_LOCAL_ACTION_PATTERN =
  /^\s*(?:-\s*)?uses:\s*['"]?\.\/(?!\.github\/workflows\/)/im;
const LOCAL_COMMAND_TARGET = String.raw`(?:\.[/\\]|scripts[/\\]|(?:bash|sh|node|ruby|python\d*|pwsh|powershell)\s+(?:\.[/\\]|scripts[/\\]))`;
const PACKAGE_COMMAND_TARGET =
  String.raw`(?:npm(?:\s+run)?|npx|yarn|pnpm|bun|deno)\b`;
const commandBoundaryPattern = (target) => new RegExp(
  [
    String.raw`(?:^|\n)\s*(?:(?:-\s*)?run:\s*['"]?)?${ target }`,
    String.raw`[;&|)]\s+${ target }`,
    String.raw`(?:\$\(|\x60)\s*${ target }`,
  ].join('|'),
  'im',
);
const REPO_LOCAL_EXECUTION_PATTERN =
  commandBoundaryPattern(LOCAL_COMMAND_TARGET);
const PACKAGE_SCRIPT_PATTERN = commandBoundaryPattern(PACKAGE_COMMAND_TARGET);
const FORBIDDEN_DEPLOYMENT_PATTERNS = [
  [ /BACKEND_DEPLOY_TOKEN/i, 'BACKEND_DEPLOY_TOKEN' ],
  [
    /vinuchain\/vinuexplorer-backend/i,
    'VinuChain/vinuexplorer-backend',
  ],
  [
    /\bgh\s+workflow\s+run\s+(?:[^\s'"\\]+\/)?deploy\.ya?ml\b/i,
    'backend workflow dispatch',
  ],
];
const TRUSTED_POLICY_WORKFLOW = 'workflow-boundary.yml';
const REQUIRED_WORKFLOWS = [
  ...Object.keys(REQUIRED_OWNER_GUARDS),
  'checks.yml',
  'docker-publish.yml',
  TRUSTED_POLICY_WORKFLOW,
];

export const isWorkflowFile = (name) =>
  name.endsWith('.yml') || name.endsWith('.yaml');

const indentation = (line) => line.match(/^[ \t]*/)?.[0].length ?? 0;

export function parseWorkflowJobs(source) {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const jobsLine = lines.findIndex((line) => /^jobs:\s*(?:#.*)?$/.test(line));
  if (jobsLine < 0) return new Map();

  const jobs = new Map();
  let jobIndent = null;
  let current = null;

  for (let index = jobsLine + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) {
      if (current) current.lines.push(line);
      continue;
    }

    const indent = indentation(line);
    if (indent === 0) break;
    if (jobIndent === null) jobIndent = indent;

    const jobMatch =
      indent === jobIndent &&
      line.match(/^\s*([\w-]+):\s*(?:#.*)?$/);
    if (jobMatch) {
      current = {
        id: jobMatch[1],
        guard: null,
        propertyIndent: null,
        lines: [ line ],
      };
      jobs.set(current.id, current);
      continue;
    }

    if (!current) continue;
    current.lines.push(line);
    if (indent <= jobIndent) {
      current = null;
      continue;
    }
    current.propertyIndent ??= indent;
    if (indent === current.propertyIndent) {
      const property = line.trim();
      if (property.startsWith('if:')) {
        const value = property.slice(3).trim();
        const comment = value.indexOf(' #');
        current.guard = comment < 0 ? value : value.slice(0, comment).trim();
      }
    }
  }

  for (const job of jobs.values()) job.source = job.lines.join('\n');
  return jobs;
}

export function hasUpstreamOwnerGuard(value) {
  let normalized = String(value || '').trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith('\'') && normalized.endsWith('\''))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  const expression = normalized.match(/^\$\{\{([\s\S]*)\}\}$/);
  if (expression) normalized = expression[1].trim();
  return /^github\.repository_owner\s*==\s*(['"])blockscout\1$/.test(
    normalized,
  );
}

export function loadWorkflowSources(root = process.cwd()) {
  const directory = path.join(root, '.github', 'workflows');
  return new Map(
    fs
      .readdirSync(directory)
      .filter(isWorkflowFile)
      .map((name) => [
        name,
        fs
          .readFileSync(path.join(directory, name), 'utf8')
          .replaceAll('\r\n', '\n'),
      ]),
  );
}

export function findWorkflowBoundaryViolations(sources) {
  const violations = [];

  for (const file of REQUIRED_WORKFLOWS) {
    if (!sources.has(file)) violations.push(`required workflow ${ file } is missing`);
  }

  for (const [ file, source ] of sources) {
    if (YAML_MERGE_KEY_PATTERN.test(source)) {
      violations.push(`${ file } contains a forbidden YAML merge key`);
    }
    if (file !== TRUSTED_POLICY_WORKFLOW) {
      for (const [ pattern, label ] of FORBIDDEN_DEPLOYMENT_PATTERNS) {
        if (pattern.test(source)) {
          violations.push(
            `${ file } contains forbidden deployment authority: ${ label }`,
          );
        }
      }
      if (MUTABLE_LATEST_PATTERN.test(source)) {
        violations.push(
          `${ file } publishes the mutable VinuExplorer latest image`,
        );
      }
      if (PRIVILEGED_WORKFLOW_PATTERN.test(source)) {
        if (REPO_LOCAL_ACTION_PATTERN.test(source)) {
          violations.push(`${ file } uses a repo-local action from a privileged workflow`);
        }
        if (REPO_LOCAL_EXECUTION_PATTERN.test(source)) {
          violations.push(`${ file } uses repo-local executable indirection from a privileged workflow`);
        }
        if (PACKAGE_SCRIPT_PATTERN.test(source)) {
          violations.push(`${ file } uses package-script indirection from a privileged workflow`);
        }
      }
    }

    const jobs = parseWorkflowJobs(source);
    const requiredJobs = REQUIRED_OWNER_GUARDS[file] || [];
    for (const id of requiredJobs) {
      const job = jobs.get(id);
      if (!job || !hasUpstreamOwnerGuard(job.guard)) {
        violations.push(
          `${ file } job ${ id } is not restricted to the upstream Blockscout owner`,
        );
      }
    }

    for (const job of jobs.values()) {
      if (
        UPSTREAM_PROVIDER_PATTERN.test(job.source) &&
        !hasUpstreamOwnerGuard(job.guard)
      ) {
        violations.push(
          `${ file } job ${ job.id } references an upstream Blockscout provider without the owner guard`,
        );
      }
    }
  }

  return violations;
}

function main() {
  const violations = findWorkflowBoundaryViolations(loadWorkflowSources());
  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`Workflow boundary violation: ${ violation }\n`);
    }
    process.exitCode = 1;
  } else {
    process.stdout.write(
      'Workflow provider and deployment boundaries are controller-safe.\n',
    );
  }
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main();
}
