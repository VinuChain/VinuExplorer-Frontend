#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'psych'

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
PRIVILEGED_WORKFLOW_PATTERN =
  /^\s*packages:\s*write\s*(?:#.*)?$|docker\/(?:login|build-push)-action@/i
REPO_LOCAL_EXECUTION_PATTERN =
  %r!(?:\A|\n)\s*(?:\.[/\\]|scripts[/\\]|(?:bash|sh|node|ruby|python\d*|pwsh|powershell)\s+(?:\.[/\\]|scripts[/\\]))|[;&|)]\s+(?:\.[/\\]|scripts[/\\]|(?:bash|sh|node|ruby|python\d*|pwsh|powershell)\s+(?:\.[/\\]|scripts[/\\]))|(?:\$\(|`)\s*(?:\.[/\\]|scripts[/\\]|(?:bash|sh|node|ruby|python\d*|pwsh|powershell)\s+(?:\.[/\\]|scripts[/\\]))!i
PACKAGE_SCRIPT_PATTERN =
  /(?:\A|\n)\s*(?:npm(?:\s+run)?|npx|yarn|pnpm|bun|deno)\b|[;&|)]\s+(?:npm(?:\s+run)?|npx|yarn|pnpm|bun|deno)\b|(?:\$\(|`)\s*(?:npm(?:\s+run)?|npx|yarn|pnpm|bun|deno)\b/i
FORBIDDEN_DEPLOYMENT_PATTERNS = {
  /BACKEND_DEPLOY_TOKEN/i => 'BACKEND_DEPLOY_TOKEN',
  %r{vinuchain/vinuexplorer-backend}i => 'VinuChain/vinuexplorer-backend',
  /\bgh\s+workflow\s+run\s+(?:[^\s'"\\]+\/)?deploy\.ya?ml\b/i =>
    'backend workflow dispatch'
}.freeze

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

directory = File.expand_path(ARGV.fetch(0))
files = Dir.children(directory).select { |name| name.match?(/\.(?:yml|yaml)\z/) }.sort
violations = []

REQUIRED_WORKFLOWS.each do |file|
  violations << "required workflow #{file} is missing" unless files.include?(file)
end

files.each do |file|
  path = File.join(directory, file)
  source = File.binread(path).encode('UTF-8', invalid: :replace, undef: :replace)

  begin
    document = Psych.parse(source, filename: path)
    raise "#{file}: workflow is empty" unless document&.root

    reject_ambiguous_yaml!(document.root, file)
    parsed = Psych.safe_load(
      source,
      permitted_classes: [],
      permitted_symbols: [],
      aliases: false,
      filename: path
    )
    raise "#{file}: workflow root must be a mapping" unless parsed.is_a?(Hash)
  rescue Psych::Exception, ArgumentError, RuntimeError => error
    violations << error.message
    next
  end

  # This file and the Ruby policy are immutable under the pull-request gate.
  # The policy workflow necessarily contains the forbidden detector strings.
  next if file == TRUSTED_POLICY_WORKFLOW

  FORBIDDEN_DEPLOYMENT_PATTERNS.each do |pattern, label|
    if source.match?(pattern)
      violations << "#{file} contains forbidden deployment authority: #{label}"
    end
  end
  if source.match?(MUTABLE_LATEST_PATTERN)
    violations << "#{file} publishes the mutable VinuExplorer latest image"
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

  if source.match?(PRIVILEGED_WORKFLOW_PATTERN)
    jobs.each do |id, job|
      next unless job.is_a?(Hash)

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
