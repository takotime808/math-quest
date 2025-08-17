# Petlands — Full Project Package

This bundle contains everything you need to run, extend, and deploy the **Petlands** virtual pet game.
It includes:

- **Game code** (`petlands/`) — Flask + SQLite app with pets, shop, dailies, and a minigame
- **Deployment tools** (`extras/`) — Docker, Gunicorn, Nginx configs, and art pipeline
- **Sample art** (`art/`) — Example images (Sprig evolution, pets preview)

---

## 📂 Directory Structure

```

your-project/
├── petlands/                # Game code
│   ├── app/                 # Flask app package
│   │   ├── **init**.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── util.py
│   │   ├── templates/       # Jinja2 HTML templates
│   │   └── static/          # Static files (CSS, JS, images)
│   ├── config.py            # Config (DB, constants, limits)
│   ├── requirements.txt     # Python dependencies
│   ├── run.py               # Dev entrypoint
│   └── README.md
│
├── extras/                  # Deployment + Art pipeline
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── gunicorn.conf.py
│   ├── nginx.conf
│   ├── wsgi.py
│   ├── .env.example
│   ├── deployment/
│   │   └── README\_DEPLOY.md
│   └── tools/
│       └── art/
│           ├── README.md
│           ├── requirements-tools.txt
│           ├── palette.json
│           ├── generate\_assets.py
│           └── source/        # (put your SVG/PNG art here)
│               ├── pets/
│               ├── items/
│               ├── ui/
│               └── branding/
│
├── art/                     # Example art
│   ├── sprig\_evolution.png
│   └── pets\_preview\.png
│
└── README\_full.md

```

---

## 🚀 Running the Game (Dev)

```bash
cd petlands
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
````

Open: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

---

## 🐳 Running with Docker (Prod-like)

From project root:

```bash
docker compose -f extras/docker-compose.yml -p petlands up --build
```

Open: [http://localhost:8080/](http://localhost:8080/)

---

## 🎨 Art Pipeline

Put source art in:

```
extras/tools/art/source/
  pets/
  items/
  ui/
  branding/logo.svg
```

Then run:

```bash
python -m venv .artenv && source .artenv/bin/activate
pip install -r extras/tools/art/requirements-tools.txt
python extras/tools/art/generate_assets.py
```

Outputs will appear in:

```
petlands/app/static/assets/
petlands/app/static/icons/
```

---

## 📝 Notes

* The game starts with 4 sample items and basic pets (`Fuzzle`, `Whim`, `Glim`, `Sprig`).
* Each pet has **health, hunger, happiness** stats.
* Features included: register/login, adopt pets, shop, inventory, daily reward, addition minigame.
* Deployment is configured for **Gunicorn + Nginx** (via Docker).
* The project uses SQLite by default; switch `DATABASE_URL` in `.env` to Postgres for production.

---

## 📌 Next Steps

* Add more minigames (memory, matching, etc.)
* Expand items and pet evolution art
* Enable trading or quests
* Connect to Postgres + persistent volumes for scale


