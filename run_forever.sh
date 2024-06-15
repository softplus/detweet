#!/bin/sh

# Copyright 2024, John Mueller
# MIT License, see LICENSE file
# SPDX-FileCopyrightText: 2024 John Mueller
# SPDX-License-Identifier: MIT
# https://github.com/softplus/detweet

# Run the detweet.js script forever, logging output to data/detweet.log
# and sleeping for 120 seconds between runs.
#
# Useful when detweet.js crashes and you want to restart it automatically.
#
# You'll need to ctrl-c it to stop it.
#
# You may need to run `chmod +x run_forever.sh` to make this script executable.
#
# Usage:
# ./run_forever.sh
#

while true; do
  echo "# `date` - Starting detweet.js..." | tee -a data/detweet.log
  node detweet.js 2>&1 | tee -a data/detweet.log
  echo "# `date` - detweet.js crashed / finished. Restarting in 120 seconds..." | tee -a data/detweet.log
  sleep 120
done
