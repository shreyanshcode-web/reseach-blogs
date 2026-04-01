from app.api.follow_routes import router as follow_router
from app.api.profile_routes import router as profile_router
from app.api.user_routes import router as user_router
from app.app_factory import create_app

app = create_app(
    title_suffix="Auth Service",
    routers=[user_router, profile_router, follow_router],
)
