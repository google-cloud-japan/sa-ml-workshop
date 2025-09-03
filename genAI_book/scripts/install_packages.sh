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

# Remove EXTERNALLY-MANAGED file to allow pip3 install
find /usr/lib/python3\.* -name "EXTERNALLY-MANAGED" | xargs sudo rm -f

# Final check
NUM_PACKAGES=$(apt list --installed \
  | grep -E "(^nodejs/|^git/|^jq/|^postgresql-client/|^python3-pip)" | wc -l)
if [[ $NUM_PACKAGES != 5 ]]; then
  echo "Error: Failed to install required packages."
  exit 1
fi
echo "Succeeded."

# Login message
cat <<'EOF' > ~/.login_message

***********************************************************************************
2024年8月2日記載

　　　　「Google Cloud で学ぶ生成 AI アプリケーション開発入門」読者の方へ

本書では Google Cloud で提供される大規模言語モデル PaLM 2 (text-bison) を使用していま
すが、今後 PaLM 2 が提供終了の予定となっており、後継の Gemini への移行が必要となり
ます。

そのため、サンプルコード用リポジトリ内のコードとノートブックは、Gemini (gemini-2.5
-flash-lite) を使用するようにコードの修正が行われています。\e[34;1m書籍に記載のコードを
そのまま入力するのではなく、ディレクトリ $HOME/genAI_book 以下のコードをコピーして
利用するようにしてください。\e[m

書籍に記載のコードとの差分については、以下のリンクを参照してください。
https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/genAI_book/README.md

出版社のサイトに記載の正誤表も事前に確認するようにお願いします。
https://gihyo.jp/book/2024/978-4-297-14171-4/support
***********************************************************************************
EOF

if ! grep "# Login message" ~/.bashrc; then
  cat <<'EOF' >> ~/.bashrc
# Login message
message=$(cat ~/.login_message)
echo -e "$message"
EOF
fi

message=$(cat ~/.login_message)
echo -e "$message"
