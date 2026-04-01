from app.api.admin_routes import router as admin_router
from app.api.ml_training_routes import router as ml_router
from app.app_factory import create_app

app = create_app(
    title_suffix="Admin Service",
    routers=[admin_router, ml_router],
    init_ml=True,
    init_media=True,
)
