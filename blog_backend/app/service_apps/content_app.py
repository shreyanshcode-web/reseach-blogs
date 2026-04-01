from app.api.moderation_routes import router as moderation_router
from app.api.post_routes import router as post_router
from app.app_factory import create_app

app = create_app(
    title_suffix="Content Service",
    routers=[post_router, moderation_router],
    init_ml=True,
    init_media=True,
)
