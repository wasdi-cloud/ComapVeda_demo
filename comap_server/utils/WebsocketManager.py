import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)
class WebSocketManager:

    def __init__(self):
        # map the project ID to a list of active WebSocket connections
        self.dActiveConnections: dict[str, list[WebSocket]] = {}


    async def connect(self, sProjectId: str, oWebsocket: WebSocket):
        await oWebsocket.accept()
        if sProjectId not in self.dActiveConnections:
            self.dActiveConnections[sProjectId] = []
        self.dActiveConnections[sProjectId].append(oWebsocket)
        logging.info(f"connect: Client connected to project {sProjectId}")


    def disconnect(self, sProjectId: str, oWebsocket: WebSocket):
        if sProjectId in self.dActiveConnections:
            try:
                self.dActiveConnections[sProjectId].remove(oWebsocket)
            except ValueError:
                pass

            if not self.dActiveConnections[sProjectId]:
                del self.dActiveConnections[sProjectId]

        logging.info(f"disconnect: Client disconnected from project {sProjectId}")


    async def _sendJson(self, oConnection: WebSocket, dMessage: dict):
        try:
            await oConnection.send_json(dMessage)
            return True
        except Exception as oE:
            logging.error(f"_sendJson: Error sending WebSocket message: {oE}")
            return False


    async def broadcastToProject(self, sProjectId: str, dMessage: dict):
        """Send a JSON message to all clients connected to the specified project."""
        if sProjectId not in self.dActiveConnections:
            return

        oAliveConnections = []
        for oConnection in list(self.dActiveConnections[sProjectId]):
            ok = await self._sendJson(oConnection, dMessage)
            if ok:
                oAliveConnections.append(oConnection)

        if oAliveConnections:
            self.dActiveConnections[sProjectId] = oAliveConnections
        else:
            del self.dActiveConnections[sProjectId]


# global instance of the WebSocketManager
oWsManager = WebSocketManager()