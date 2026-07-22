# frozen_string_literal: true

require 'fileutils'
require 'minitest/autorun'
require 'open3'
require 'tmpdir'

class WorkflowPolicyTest < Minitest::Test
  workflows_argument = ARGV.shift
  WORKFLOWS = workflows_argument ?
    File.expand_path(workflows_argument) :
    File.expand_path('../workflows', __dir__)
  POLICY = File.join(__dir__, 'verify.rb')

  def with_workflows
    Dir.mktmpdir('workflow-policy-test') do |directory|
      Dir.glob(File.join(WORKFLOWS, '*.{yml,yaml}')).each do |source|
        FileUtils.cp(source, directory)
      end
      yield directory
    end
  end

  def assert_rejected(expected, files = {})
    with_workflows do |directory|
      files.each do |name, source|
        File.write(File.join(directory, name), source)
      end
      stdout, stderr, status = Open3.capture3('ruby', POLICY, directory)
      refute status.success?, "policy unexpectedly approved exploit:\n#{stdout}#{stderr}"
      assert_match expected, "#{stdout}#{stderr}"
    end
  end

  def docker_publish
    File.read(File.join(WORKFLOWS, 'docker-publish.yml'))
  end

  def test_rejects_octokit_rest_workflow_dispatch
    assert_rejected(/GitHub API access/, 'rest-dispatch.yml' => <<~YAML)
      name: REST dispatch bypass
      jobs:
        deploy:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/github-script@v7
              with:
                script: |
                  await github.request(
                    'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
                    { owner: 'VinuChain', repo: 'vinuexplorer-backend', workflow_id: 'deploy.yml' },
                  )
    YAML
  end

  def test_requires_release_build_to_depend_on_checks
    source = docker_publish
      .sub(/\n  checks:\n.*?(?=\n  build-and-push:)/m, "\n")
      .sub("    needs: [checks]\n", '')
    refute_equal docker_publish, source
    assert_rejected(/requires the checks job and dependency/, 'docker-publish.yml' => source)
  end

  def test_rejects_remote_release_build_context
    source = docker_publish.sub('          context: .', '          context: https://github.com/attacker/release.git')
    refute_equal docker_publish, source
    assert_rejected(/reviewed repository context/, 'docker-publish.yml' => source)
  end

  def test_rejects_indirect_short_sha_environment_rewrites
    insertion = <<~YAML
      - name: Rewrite release tag indirectly
        run: printf 'SHORT_%s=latest\\n' SHA >> "$GITHUB_ENV"

      - name: Set up Docker Buildx
    YAML
    source = docker_publish.sub(
      "      - name: Set up Docker Buildx\n",
      insertion.lines.map { |line| "      #{line}" }.join
    )
    refute_equal docker_publish, source
    assert_rejected(/writes to GITHUB_ENV outside the trusted SHORT_SHA step/, 'docker-publish.yml' => source)
  end

  def test_rejects_pull_request_trigger_on_package_publisher
    source = docker_publish.sub("on:\n  push:\n    branches: [main]", 'on: [push, pull_request]')
    refute_equal docker_publish, source
    assert_rejected(/privileged PR trigger pull_request/, 'docker-publish.yml' => source)
  end

  def test_matches_forbidden_commands_after_yaml_decoding
    assert_rejected(/GitHub workflow dispatch/, 'encoded-dispatch.yml' => <<~'YAML')
      name: Encoded dispatch bypass
      jobs:
        deploy:
          runs-on: ubuntu-latest
          steps:
            - run: "gh \x77orkflow run deploy.yml --repo VinuChain/vinuexplorer-\x62ackend"
    YAML
  end

  def test_treats_shell_keywords_and_source_as_command_boundaries
    assert_rejected(/repo-local executable indirection/, 'keyword-bypass.yml' => <<~'YAML')
      name: Shell keyword bypass
      permissions:
        packages: write
      jobs:
        publish:
          runs-on: ubuntu-latest
          steps:
            - run: if ./scripts/publish.sh; then echo done; fi
            - run: source scripts/publish.sh
    YAML
  end
end
