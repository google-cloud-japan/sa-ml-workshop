FROM nvidia/cuda:12.5.1-cudnn-devel-ubuntu22.04
RUN apt-get update && \
    apt-get install --no-install-recommends -y curl pip git && \
    python3 -m pip --no-cache-dir install --upgrade pip
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY ./gunicorn_conf.py /gunicorn_conf.py
COPY ./start.sh /start.sh
RUN chmod +x /start.sh
COPY ./app /app

WORKDIR /app/
ENV PYTHONPATH=/app
EXPOSE 80
CMD ["/start.sh"]
