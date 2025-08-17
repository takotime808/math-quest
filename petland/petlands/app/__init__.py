from flask import Flask
from flask_login import LoginManager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .models import Base, User
from .routes import bp
from .util import init_seed

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    engine = create_engine(app.config["SQLALCHEMY_DATABASE_URI"], future=True, echo=False)
    Base.metadata.create_all(engine)
    Session = scoped_session(sessionmaker(bind=engine, expire_on_commit=False, future=True))
    app.session_factory = Session

    login_manager = LoginManager()
    login_manager.login_view = "main.login"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(uid):
        with Session() as s:
            return s.get(User, int(uid))

    app.register_blueprint(bp)

    with Session() as s:
        init_seed(s); s.commit()

    @app.teardown_appcontext
    def remove_session(exception=None):
        Session.remove()

    return app
