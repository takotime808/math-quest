from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_user, logout_user, current_user, login_required
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import User, Pet, Item, Inventory, Transaction
from .util import clamp, today_str

bp = Blueprint("main", __name__)

def get_session() -> Session:
    return current_app.session_factory()

@bp.route("/")
def index(): return render_template("index.html")

@bp.route("/register", methods=["GET","POST"])
def register():
    if request.method == "POST":
        u, e, p = request.form["username"].strip(), request.form["email"].strip(), request.form["password"]
        with get_session() as s:
            if s.execute(select(User).where((User.username==u)|(User.email==e))).scalar_one_or_none():
                flash("Username or email already taken.", "error")
            else:
                user = User(username=u, email=e, balance=100); user.set_password(p)
                s.add(user); s.commit(); login_user(user); return redirect(url_for("main.dashboard"))
    return render_template("register.html")

@bp.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        u = request.form["username"].strip(); p = request.form["password"]
        with get_session() as s:
            user = s.execute(select(User).where(User.username==u)).scalar_one_or_none()
            if user and user.check_password(p):
                login_user(user); return redirect(url_for("main.dashboard"))
            flash("Invalid credentials.", "error")
    return render_template("login.html")

@bp.route("/logout")
def logout(): logout_user(); return redirect(url_for("main.index"))

@bp.route("/dashboard")
@login_required
def dashboard():
    with get_session() as s:
        user = s.get(User, current_user.id); pets = user.pets
        return render_template("dashboard.html", user=user, pets=pets)

@bp.route("/adopt", methods=["GET","POST"])
@login_required
def adopt():
    with get_session() as s:
        user = s.get(User, current_user.id)
        if len(user.pets) >= current_app.config["MAX_PETS_PER_USER"]:
            flash("You've reached the max number of pets.", "error"); return redirect(url_for("main.dashboard"))
        if request.method == "POST":
            name = request.form["name"].strip()
            p = Pet(owner_id=user.id, name=name, species=request.form["species"].strip(), color=request.form.get("color","mint"))
            s.add(p); s.commit(); flash(f"You adopted {name}!", "ok"); return redirect(url_for("main.dashboard"))
        return render_template("adopt.html")

@bp.route("/pet/<int:pid>", methods=["GET","POST"])
@login_required
def pet_detail(pid):
    with get_session() as s:
        pet = s.get(Pet, pid); user = s.get(User, current_user.id)
        if not pet or pet.owner_id != user.id: flash("Pet not found.","error"); return redirect(url_for("main.dashboard"))
        action = request.form.get("action")
        if action == "feed":
            inv_id = int(request.form["inv_id"]); inv = s.get(Inventory, inv_id)
            if inv and inv.owner_id == user.id and inv.quantity>0:
                item = inv.item
                pet.hunger = clamp(pet.hunger + item.hunger_delta)
                pet.happiness = clamp(pet.happiness + item.happiness_delta)
                pet.health = clamp(pet.health + item.health_delta)
                inv.quantity -= 1; s.commit(); flash(f"You used {item.name}!", "ok")
        elif action == "play":
            pet.happiness = clamp(pet.happiness + 10); pet.hunger = clamp(pet.hunger - 5); s.commit(); flash("Playtime!", "ok")
        return render_template("pet_detail.html", pet=pet, user=user)

@bp.route("/shop", methods=["GET","POST"])
@login_required
def shop():
    with get_session() as s:
        user = s.get(User, current_user.id); items = s.query(Item).all()
        if request.method == "POST":
            item = s.get(Item, int(request.form["item_id"])); qty = int(request.form.get("qty",1)); total = item.price*qty
            if user.balance >= total:
                user.balance -= total
                inv = s.query(Inventory).filter_by(owner_id=user.id, item_id=item.id).first() or Inventory(owner_id=user.id, item_id=item.id, quantity=0)
                if inv.id is None: s.add(inv)
                inv.quantity += qty; s.add(Transaction(user_id=user.id, amount=-total, kind="spend", note=f"Bought {qty}x {item.name}"))
                s.commit(); flash(f"Purchased {qty}x {item.name}.", "ok")
            else: flash("Not enough Petcoins.", "error")
        return render_template("shop.html", items=items, user=user)

@bp.route("/inventory")
@login_required
def inventory():
    with get_session() as s:
        user = s.get(User, current_user.id); inv = s.query(Inventory).filter_by(owner_id=user.id).all()
        return render_template("inventory.html", inv=inv, user=user)

@bp.route("/dailies/spin", methods=["POST"])
@login_required
def daily_spin():
    import random
    with get_session() as s:
        user = s.get(User, current_user.id)
        today = today_str()
        if user.last_daily == today: flash("Already claimed today.", "error"); return redirect(url_for("main.dashboard"))
        reward = random.randint(current_app.config["DAILY_REWARD_MIN"], current_app.config["DAILY_REWARD_MAX"])
        user.balance += reward; user.last_daily = today
        s.add(Transaction(user_id=user.id, amount=reward, kind="reward", note="Daily Spin")); s.commit()
        flash(f"Daily reward: +{reward} Petcoins!", "ok"); return redirect(url_for("main.dashboard"))

@bp.route("/minigame/addition", methods=["GET","POST"])
@login_required
def minigame_addition():
    import random
    with get_session() as s:
        user = s.get(User, current_user.id)
        if request.method == "POST":
            a = int(request.form["a"]); b = int(request.form["b"]); ans = request.form.get("answer","").strip()
            try:
                if int(ans) == a+b:
                    if user.minigame_count < current_app.config["MINIGAME_DAILY_LIMIT"]:
                        user.balance += current_app.config["MINIGAME_REWARD"]; user.minigame_count += 1
                        s.add(Transaction(user_id=user.id, amount=current_app.config["MINIGAME_REWARD"], kind="earn", note="Minigame")); s.commit()
                        flash(f"Correct! +{current_app.config['MINIGAME_REWARD']} Petcoins.", "ok")
                    else: flash("Reached today's minigame limit.", "error")
                else: flash("Oops! Try another.", "error")
            except ValueError: flash("Please enter a number.", "error")
        a, b = random.randint(0,12), random.randint(0,12)
        return render_template("minigame_addition.html", a=a, b=b, user=user)
