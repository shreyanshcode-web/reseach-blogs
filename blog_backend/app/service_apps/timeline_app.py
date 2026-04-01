from app.api.timeline_routes import router as timeline_router
from app.api.websocket_routes import router as websocket_router
from app.app_factory import create_app

app = create_app(
    title_suffix="Timeline Service",
    routers=[timeline_router, websocket_router],
    init_timeline=True,
)
