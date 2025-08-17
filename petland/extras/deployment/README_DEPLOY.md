# Deploying with Docker
1) Ensure project layout:
```
petlands/        # game code
extras/          # this folder
```
2) Build and run:
```bash
docker compose -f extras/docker-compose.yml -p petlands up --build
# open http://localhost:8080
```
3) Generate icons/assets (optional):
```bash
python -m venv .artenv && source .artenv/bin/activate
pip install -r extras/tools/art/requirements-tools.txt
python extras/tools/art/generate_assets.py
```
