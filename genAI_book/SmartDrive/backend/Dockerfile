# Use the official lightweight Python image
# https://hub.docker.com/_/python
FROM python:3.8-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Copy local code to the container image
WORKDIR /app
COPY . ./

# Install production dependencies
RUN pip install -r requirements.txt 

# Set the number of workers to be equal to the cores available
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
