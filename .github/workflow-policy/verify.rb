#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'psych'
require 'set'

REQUIRED_OWNER_GUARDS = {
  'cleanup.yml' => %w[cleanup_release cleanup_l2_release cleanup_docker_image],
  'deploy-main.yml' => %w[publish_image],
  'deploy-review.yml' => %w[make_slug publish_image deploy_review],
  'deploy-review-l2.yml' => %w[make_slug publish_image deploy_review_l2],
  'e2e-tests.yml' => %w[publish_image deploy_e2e test],
  'publish-image.yml' => %w[run]
}.freeze
REQUIRED_WORKFLOWS = (
  REQUIRED_OWNER_GUARDS.keys +
  %w[checks.yml docker-publish.yml workflow-boundary.yml]
).freeze

TRUSTED_POLICY_WORKFLOW = 'workflow-boundary.yml'
UPSTREAM_PROVIDER_PATTERN =
  %r{blockscout/actions|vault\.k8s\.blockscout\.com|ghcr\.io/blockscout}i
MUTABLE_LATEST_PATTERN =
  %r!ghcr\.io/vinuchain/vinuexplorer-frontend:latest!i
VINUEXPLORER_IMAGE_BASE_PATTERN =
  %r!ghcr\.io/vinuchain/vinuexplorer-frontend!i
RAW_LATEST_METADATA_PATTERN =
  /\btype\s*=\s*raw\s*,\s*value\s*=\s*latest\b/i
GITHUB_WORKFLOW_DISPATCH_PATTERN = /\bgh\s+workflow\s+run\b/i
GITHUB_API_ACCESS_PATTERN =
  /\bgh\s+api\b|api\.github\.com|createWorkflowDispatch|workflow_dispatches/i
PRIVILEGED_PR_TRIGGERS = %w[pull_request_target workflow_run].freeze
IMMUTABLE_VINUEXPLORER_IMAGE_PATTERN =
  %r!ghcr\.io/vinuchain/vinuexplorer-frontend:\$\{\{\s*env\.SHORT_SHA\s*\}\}!i
SHORT_SHA_ASSIGNMENT_PATTERN = /\bSHORT_SHA\s*=/i
TRUSTED_SHORT_SHA_RUN =
  'echo "SHORT_SHA=$(echo $GITHUB_SHA | cut -c1-8)" >> $GITHUB_ENV'
DOCKER_PUBLISH_ACTION_PATTERN =
  %r!docker/(?:login|build-push)-action@!i
LOCAL_REUSABLE_WORKFLOW_PATTERN =
  %r!\A\./\.github/workflows/([^/]+\.(?:yml|yaml))\z!i
LOCAL_PATH_SOURCE = '(?:\.[/\\\\]|scripts[/\\\\])'
INTERPRETER_SOURCE = '(?:bash|sh|node|ruby|python\d*|pwsh|powershell)'
LOCAL_COMMAND_SOURCE =
  "(?:#{LOCAL_PATH_SOURCE}|#{INTERPRETER_SOURCE}\\b[^\\n;&|]*?['\"]?#{LOCAL_PATH_SOURCE})"
PACKAGE_COMMAND_SOURCE = '(?:npm(?:\s+run)?|npx|yarn|pnpm|bun|deno)\b'
REPO_LOCAL_EXECUTION_PATTERN = Regexp.new(
  "(?:\\A|\\n)\\s*#{LOCAL_COMMAND_SOURCE}|[;&|)]\\s+#{LOCAL_COMMAND_SOURCE}|" \
  "(?:\\$\\(|`)\\s*#{LOCAL_COMMAND_SOURCE}",
  Regexp::IGNORECASE
)
PACKAGE_SCRIPT_PATTERN = Regexp.new(
  "(?:\\A|\\n)\\s*#{PACKAGE_COMMAND_SOURCE}|[;&|)]\\s+#{PACKAGE_COMMAND_SOURCE}|" \
  "(?:\\$\\(|`)\\s*#{PACKAGE_COMMAND_SOURCE}",
  Regexp::IGNORECASE
)
FORBIDDEN_DEPLOYMENT_PATTERNS = {
  GITHUB_WORKFLOW_DISPATCH_PATTERN => 'GitHub workflow dispatch',
  GITHUB_API_ACCESS_PATTERN => 'GitHub API access',
  /BACKEND_DEPLOY_TOKEN/i => 'BACKEND_DEPLOY_TOKEN',
  %r{vinuchain/vinuexplorer-backend}i => 'VinuChain/vinuexplorer-backend',
  /\bgh\s+workflow\s+run\s+(?:[^\s'"\\]+\/)?deploy\.ya?ml\b/i =>
    'backend workflow dispatch'
}.freeze

def workflow_trigger_names(root)
  return [] unless root.is_a?(Psych::Nodes::Mapping)

  root.children.each_slice(2).flat_map do |key, value|
    next [] unless key.is_a?(Psych::Nodes::Scalar) && key.value == 'on'

    case value
    when Psych::Nodes::Mapping
      value.children.each_slice(2).filter_map do |trigger, _configuration|
        trigger.value if trigger.is_a?(Psych::Nodes::Scalar)
      end
    when Psych::Nodes::Sequence
      value.children.filter_map do |trigger|
        trigger.value if trigger.is_a?(Psych::Nodes::Scalar)
      end
    when Psych::Nodes::Scalar
      [value.value]
    else
      []
    end
  end
end

def short_sha_env_binding?(value)
  case value
  when Hash
    value.any? do |key, nested|
      (key.to_s == 'env' && nested.is_a?(Hash) &&
        nested.keys.any? { |env_key| env_key.to_s == 'SHORT_SHA' }) ||
        short_sha_env_binding?(nested)
    end
  when Array
    value.any? { |nested| short_sha_env_binding?(nested) }
  else
    false
  end
end

def valid_short_sha_binding?(workflow)
  jobs = workflow['jobs']
  return false unless jobs.is_a?(Hash)

  runs = jobs.values.filter_map do |job|
    next unless job.is_a?(Hash)

    Array(job['steps']).filter_map do |step|
      step['run'].to_s.strip if step.is_a?(Hash) && step.key?('run')
    end
  end.flatten
  runs.count(TRUSTED_SHORT_SHA_RUN) == 1 &&
    runs.count { |run| run.match?(SHORT_SHA_ASSIGNMENT_PATTERN) } == 1 &&
    !short_sha_env_binding?(workflow)
end

def reject_ambiguous_yaml!(node, location)
  case node
  when Psych::Nodes::Alias
    raise "#{location}: YAML aliases and merge keys are not allowed"
  when Psych::Nodes::Mapping
    seen = {}
    node.children.each_slice(2) do |key, value|
      unless key.is_a?(Psych::Nodes::Scalar)
        raise "#{location}: mapping keys must be scalar values"
      end
      raise "#{location}: YAML merge keys are not allowed" if key.value == '<<'

      identity = [key.tag, key.value]
      raise "#{location}: duplicate YAML key #{key.value.inspect}" if seen[identity]

      seen[identity] = true
      reject_ambiguous_yaml!(value, "#{location}.#{key.value}")
    end
  else
    Array(node.children).each do |child|
      reject_ambiguous_yaml!(child, location)
    end
  end
end

def upstream_owner_guard?(value)
  normalized = value.to_s.strip
  if (normalized.start_with?('"') && normalized.end_with?('"')) ||
     (normalized.start_with?("'") && normalized.end_with?("'"))
    normalized = normalized[1...-1].strip
  end
  expression = normalized.match(/\A\$\{\{([\s\S]*)\}\}\z/)
  normalized = expression[1].strip if expression
  normalized.match?(/\Agithub\.repository_owner\s*==\s*(['"])blockscout\1\z/)
end

def package_privileged_permissions?(permissions)
  permissions.to_s == 'write-all' ||
    (permissions.is_a?(Hash) && permissions['packages'].to_s == 'write')
end

def directly_privileged_job?(job)
  package_privileged_permissions?(job['permissions']) ||
    JSON.generate(job).match?(DOCKER_PUBLISH_ACTION_PATTERN)
end

directory = File.expand_path(ARGV.fetch(0))
files = Dir.children(directory).select { |name| name.match?(/\.(?:yml|yaml)\z/) }.sort
violations = []
workflow_sources = {}
workflows = {}
workflow_triggers = {}

REQUIRED_WORKFLOWS.each do |file|
  violations << "required workflow #{file} is missing" unless files.include?(file)
end

files.each do |file|
  path = File.join(directory, file)
  source = File.binread(path).encode('UTF-8', invalid: :replace, undef: :replace)
  workflow_sources[file] = source

  begin
    document = Psych.parse(source, filename: path)
    raise "#{file}: workflow is empty" unless document&.root

    reject_ambiguous_yaml!(document.root, file)
    workflow_triggers[file] = workflow_trigger_names(document.root)
    parsed = Psych.safe_load(
      source,
      permitted_classes: [],
      permitted_symbols: [],
      aliases: false,
      filename: path
    )
    raise "#{file}: workflow root must be a mapping" unless parsed.is_a?(Hash)
    workflows[file] = parsed
  rescue Psych::Exception, ArgumentError, RuntimeError => error
    violations << error.message
  end
end

privileged_files = Set.new
workflows.each do |file, parsed|
  privileged_files << file if package_privileged_permissions?(parsed['permissions'])
end
missing_local_workflows = Set.new
privilege_changed = true
while privilege_changed
  privilege_changed = false
  workflows.each do |file, parsed|
    jobs = parsed['jobs']
    next unless jobs.is_a?(Hash)

    jobs.each_value do |job|
      next unless job.is_a?(Hash)
      next unless privileged_files.include?(file) || directly_privileged_job?(job)

      local = job['uses'].to_s.strip.match(LOCAL_REUSABLE_WORKFLOW_PATTERN)
      next unless local

      target = local[1]
      unless workflows.key?(target)
        missing_local_workflows <<
          "#{file} references missing local reusable workflow #{target}"
        next
      end
      unless privileged_files.include?(target)
        privileged_files << target
        privilege_changed = true
      end
    end
  end
end
violations.concat(missing_local_workflows.to_a)

workflows.each do |file, parsed|
  source = workflow_sources.fetch(file)

  # This file and the Ruby policy are immutable under the pull-request gate.
  # The policy workflow necessarily contains the forbidden detector strings.
  next if file == TRUSTED_POLICY_WORKFLOW

  (workflow_triggers.fetch(file, []) & PRIVILEGED_PR_TRIGGERS).each do |trigger|
    violations << "#{file} is not allowed to use privileged PR trigger #{trigger}"
  end

  FORBIDDEN_DEPLOYMENT_PATTERNS.each do |pattern, label|
    if source.match?(pattern)
      violations << "#{file} contains forbidden deployment authority: #{label}"
    end
  end
  if source.match?(MUTABLE_LATEST_PATTERN) ||
     (source.match?(VINUEXPLORER_IMAGE_BASE_PATTERN) &&
      source.match?(RAW_LATEST_METADATA_PATTERN))
    violations << "#{file} publishes the mutable VinuExplorer latest image"
  end
  if source.gsub(IMMUTABLE_VINUEXPLORER_IMAGE_PATTERN, '')
           .match?(VINUEXPLORER_IMAGE_BASE_PATTERN)
    violations << "#{file} publishes a non-immutable VinuExplorer image tag"
  end
  if source.match?(IMMUTABLE_VINUEXPLORER_IMAGE_PATTERN)
    unless valid_short_sha_binding?(parsed)
      violations <<
        "#{file} does not bind SHORT_SHA to GITHUB_SHA in one executable step"
    end
  end

  jobs = parsed['jobs']
  unless jobs.is_a?(Hash)
    violations << "#{file} must define a jobs mapping"
    next
  end

  REQUIRED_OWNER_GUARDS.fetch(file, []).each do |id|
    job = jobs[id]
    unless job.is_a?(Hash) && upstream_owner_guard?(job['if'])
      violations << "#{file} job #{id} is not restricted to the upstream Blockscout owner"
    end
  end

  jobs.each do |id, job|
    unless job.is_a?(Hash)
      violations << "#{file} job #{id} must be a mapping"
      next
    end
    if JSON.generate(job).match?(UPSTREAM_PROVIDER_PATTERN) &&
       !upstream_owner_guard?(job['if'])
      violations <<
        "#{file} job #{id} references an upstream Blockscout provider without the owner guard"
    end
  end

  jobs.each do |id, job|
    next unless job.is_a?(Hash)
    next unless privileged_files.include?(file) || directly_privileged_job?(job)

    Array(job['steps']).each_with_index do |step, index|
      next unless step.is_a?(Hash)

      uses = step['uses'].to_s.strip
      if uses.start_with?('./')
        violations << "#{file} job #{id} step #{index + 1} uses a repo-local action from a privileged workflow"
      end
      run = step['run'].to_s.strip
      if run.match?(REPO_LOCAL_EXECUTION_PATTERN)
        violations << "#{file} job #{id} step #{index + 1} uses repo-local executable indirection from a privileged workflow"
      end
      if run.match?(PACKAGE_SCRIPT_PATTERN)
        violations << "#{file} job #{id} step #{index + 1} uses package-script indirection from a privileged workflow"
      end
    end
  end

  non_job_content = parsed.reject { |key, _value| key == 'jobs' }
  if JSON.generate(non_job_content).match?(UPSTREAM_PROVIDER_PATTERN)
    violations << "#{file} references an upstream Blockscout provider outside a guarded job"
  end
end

if violations.empty?
  puts "Trusted policy parsed and approved #{files.length} workflow files."
else
  warn "Workflow boundary violations:\n- #{violations.join("\n- ")}"
  exit 1
end
