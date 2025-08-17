from .models import Item
from datetime import date
def clamp(x, lo=0, hi=100): return max(lo, min(hi, x))
def today_str(): return date.today().isoformat()
def init_seed(s):
    if not s.query(Item).first():
        s.add_all([
            Item(name="Berry Biscuit", kind="food", price=5, hunger_delta=+20, description="Crunchy treat."),
            Item(name="Sparkle Soda", kind="food", price=8, hunger_delta=+10, happiness_delta=+10, description="Fizz, yay!"),
            Item(name="Bouncy Ball", kind="toy", price=12, happiness_delta=+20, description="Playtime booster."),
            Item(name="Health Tonic", kind="potion", price=25, health_delta=+25, description="Restores vitality."),
        ])
