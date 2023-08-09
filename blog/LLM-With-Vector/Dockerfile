FROM python:3.10-slim
ENV PYTHONUNBUFFERED True

WORKDIR /app
RUN pip install langchain google-cloud-aiplatform flask gunicorn

COPY ./main.py ./
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
