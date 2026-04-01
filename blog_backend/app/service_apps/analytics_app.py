from app.api.analytics_routes import router as analytics_router
from app.app_factory import create_app

app = create_app(
    title_suffix="Analytics Service",
    routers=[analytics_router],
)
