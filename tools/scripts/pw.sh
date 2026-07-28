#!/bin/bash

config_file="./configs/envs/.env.pw"

rm -rf ./playwright/.cache

dotenv \
  -e $config_file \
  -- bash -c './deploy/scripts/make_envs_script.sh ./playwright/envs.js'

# Important to set this variable here, so the sprite will be built correctly
export NEXT_PUBLIC_APP_ENV=pw
yarn svg:build-sprite

# Check if the "--affected" argument is present in the script args
check_affected_flag() {
    local affected_flag=false
    local is_affected_value=false

    for arg in "$@"; do
        if [[ "$arg" == "--affected" ]]; then
            is_affected_value=true
        elif [[ "$arg" == "--affected="* ]]; then
            is_affected_value=${arg#*=}
        else
            continue
        fi

        if [[ "$is_affected_value" != "true" && "$is_affected_value" != "false" ]]; then
            echo "Invalid --affected value: $is_affected_value" >&2
            return 2
        fi

        affected_flag=$is_affected_value
        break
    done

    echo "$affected_flag"
}

# Remove the "--affected" argument from the script args
filter_arguments() {
    filtered_args=()

    for arg in "$@"; do
        if [[ "$arg" != "--affected"* ]]; then
            filtered_args+=("$arg")
        fi
    done
}

get_files_to_run() {
  local is_affected=$1
  files_to_run=()

  if [ "$is_affected" = true ]; then
      affected_tests_file="./playwright/affected-tests.txt"

      if [ -f "$affected_tests_file" ]; then
            while IFS= read -r file || [ -n "$file" ]; do
                if [ -n "$file" ]; then
                    files_to_run+=("$file")
                fi
            done < "$affected_tests_file"

            if [ ${#files_to_run[@]} -eq 0 ]; then
                return 1
            fi
      fi
  fi

  return 0
}

filter_arguments "$@"
affected_flag=$(check_affected_flag "$@")
affected_status=$?
if [ $affected_status -ne 0 ]; then
    exit $affected_status
fi
if ! get_files_to_run "$affected_flag"; then
    echo "No affected tests found in the file. Exiting..."
    exit 0
fi

printf "Running Playwright tests with the following arguments:"
printf " %q" "${filtered_args[@]}"
printf "\n"
echo "Affected flag: $affected_flag"
printf "Files to run:"
printf " %q" "${files_to_run[@]}"
printf "\n"

dotenv \
  -v NODE_OPTIONS=\"--max-old-space-size=4096\" \
  -e $config_file \
  -- playwright test -c playwright-ct.config.ts "${files_to_run[@]}" "${filtered_args[@]}"
