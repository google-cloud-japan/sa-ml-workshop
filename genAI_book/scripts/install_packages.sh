#!/bin/bash

# Link the code directory under $HOME
LINK_PATH=$HOME/genAI_book
if [[ -L $LINK_PATH ]]; then
  rm $LINK_PATH
fi
if [[ -e $LINK_PATH ]]; then
  echo "Error: $LINK_PATH already exists."
  exit 1
fi
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
PARENT_DIR=$(dirname $SCRIPT_DIR)
if [[ ! $(basename $PARENT_DIR) == "genAI_book" ]]; then
  echo "Error: Incorrect script path."
  exit 1
fi
ln -s $PARENT_DIR $LINK_PATH
if [[ $? != 0 ]]; then
  echo "Error: Failed to create a symlink."
  exit 1
fi

# Adding PROJECT_ID setting to .bashrc
PROJECT_CMD='export GOOGLE_CLOUD_PROJECT=$(gcloud config list --format="value(core.project)")'
eval $PROJECT_CMD
if ! grep "$PROJECT_CMD" ~/.bashrc; then
  echo $PROJECT_CMD >> ~/.bashrc
fi

# Install necessary packages
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | sudo gpg --yes --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" \
  | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install --upgrade -y nodejs git jq postgresql-client python3-pip

# Final check
NUM_PACKAGES=$(apt list --installed \
  | grep -E "(^nodejs/|^git/|^jq/|^postgresql-client/|^python3-pip)" | wc -l)
if [[ $NUM_PACKAGES != 5 ]]; then
  echo "Error: Failed to install required packages."
  exit 1
fi
echo "Succeeded."
