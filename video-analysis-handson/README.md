# Gemini API とオープンソースによる動画処理・動画分析の手法

- [デモ動画](https://youtu.be/ydlpi-bQuY0)：このハンズオンで解説する技術を用いたアプリケーションのデモ動画です。

## ハンズオン手順

Cloud Shell から次を実行します。

```
gcloud services enable \
  aiplatform.googleapis.com \
  notebooks.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudresourcemanager.googleapis.com
```

```
PROJECT_ID=$(gcloud config list --format 'value(core.project)')
gcloud workbench instances create handson-instance \
  --project=$PROJECT_ID \
  --location=us-central1-a \
  --machine-type=e2-standard-8
```

Vertex AI Workbench のインスタンス `handson-instance` が起動したら、次のノートブックに従ってハンズオンを進めます。

### パート1
- [video_analysis_handson.ipynb](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/video-analysis-handson/notebooks/video_analysis_handson.ipynb)

### パート2
- [cloud_run_job_handson.ipynb](https://github.com/google-cloud-japan/sa-ml-workshop/blob/main/video-analysis-handson/notebooks/cloud_run_job_handson.ipynb)
