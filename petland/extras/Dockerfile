FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends     build-essential libffi-dev libcairo2 libpango-1.0-0 libgdk-pixbuf2.0-0 shared-mime-info  && rm -rf /var/lib/apt/lists/*
COPY ../petlands/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY ../petlands/app ./app
COPY ../petlands/config.py ./config.py
COPY wsgi.py ./wsgi.py
COPY gunicorn.conf.py ./gunicorn.conf.py
RUN mkdir -p app/static/assets app/static/icons
EXPOSE 8000
CMD ["gunicorn", "-c", "gunicorn.conf.py", "wsgi:app"]
