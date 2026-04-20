from app.api.admin_routes import router as admin_router
from app.api.analytics_routes import router as analytics_router
from app.api.follow_routes import router as follow_router
from app.api.ml_training_routes import router as ml_router
from app.api.moderation_routes import router as moderation_router
from app.api.post_routes import router as post_router
from app.api.profile_routes import router as profile_router
from app.api.timeline_routes import router as timeline_router
from app.api.user_routes import router as user_router
from app.api.websocket_routes import router as ws_router
from app.app_factory import create_app

app = create_app(
    title_suffix="Unified API",
    routers=[
        user_router,
        profile_router,
        follow_router,
        post_router,
        moderation_router,
        analytics_router,
        timeline_router,
        ws_router,
        admin_router,
        ml_router,
    ],
    init_ml=True,
    init_timeline=True,
    init_media=True,
)
