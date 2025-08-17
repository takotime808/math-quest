from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, ForeignKey, Text
from flask_login import UserMixin
from passlib.hash import pbkdf2_sha256

class Base(DeclarativeBase):
    pass

class User(Base, UserMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    balance: Mapped[int] = mapped_column(Integer, default=100)
    last_daily: Mapped[str | None] = mapped_column(String(10), nullable=True)
    minigame_count: Mapped[int] = mapped_column(Integer, default=0)
    pets: Mapped[list["Pet"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    inventory_items: Mapped[list["Inventory"]] = relationship(back_populates="owner", cascade="all, delete-orphan")

    def set_password(self, pw): self.password_hash = pbkdf2_sha256.hash(pw)
    def check_password(self, pw): return pbkdf2_sha256.verify(pw, self.password_hash)

class Pet(Base):
    __tablename__ = "pets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(32))
    species: Mapped[str] = mapped_column(String(32))
    color: Mapped[str] = mapped_column(String(32), default="mint")
    hunger: Mapped[int] = mapped_column(Integer, default=50)
    happiness: Mapped[int] = mapped_column(Integer, default=50)
    health: Mapped[int] = mapped_column(Integer, default=100)
    owner: Mapped["User"] = relationship(back_populates="pets")

class Item(Base):
    __tablename__ = "items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[int] = mapped_column(Integer, default=10)
    kind: Mapped[str] = mapped_column(String(16))
    hunger_delta: Mapped[int] = mapped_column(Integer, default=0)
    happiness_delta: Mapped[int] = mapped_column(Integer, default=0)
    health_delta: Mapped[int] = mapped_column(Integer, default=0)

class Inventory(Base):
    __tablename__ = "inventory"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    owner: Mapped["User"] = relationship(back_populates="inventory_items")
    item: Mapped["Item"] = relationship()

class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(16))
    note: Mapped[str] = mapped_column(String(200), default="")
