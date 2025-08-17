# Art Pipeline (tools)
Place source art under `tools/art/source/{pets,items,ui,branding}`.
Run:
```
python -m venv .artenv && source .artenv/bin/activate
pip install -r tools/art/requirements-tools.txt
python tools/art/generate_assets.py
```
