#!/bin/bash

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

# Copy the code directory under $HOME
rm -rf $HOME/genAI_book
cp -a $HOME/sa-ml-workshop/genAI_book $HOME/

NUM_PACKAGES=$(apt list --installed \
  | grep -E "(^nodejs/|^git/|^jq/|^postgresql-client/|^python3-pip)" | wc -l)
if [[ $NUM_PACKAGES == 5 ]]; then
  echo "Succeeded."
fi
