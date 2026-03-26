import logging
from fastapi import WebSocket

class WebSocketManager:

    def __init__(self):
        # map the project ID to a list of active WebSocket connections
        self.dActiveConnections: dict[str, list[WebSocket]] = {}


    async def connect(self, sProjectId: str, oWebsocket: WebSocket):
        await oWebsocket.accept()
        if sProjectId not in self.dActiveConnections:
            self.dActiveConnections[sProjectId] = []
        self.dActiveConnections[sProjectId].append(oWebsocket)
        logging.info(f"WebSocketManager.connect: Client connected to project {sProjectId}")


    def disconnect(self, sProjectId: str, oWebsocket: WebSocket):
        if sProjectId in self.dActiveConnections:
            self.dActiveConnections[sProjectId].remove(oWebsocket)
            # remove the key if there are no more connections for the project
            if not self.dActiveConnections[sProjectId]:
                del self.dActiveConnections[sProjectId]
        logging.info(f"WebSocketManager.disconnect: Client disconnected from project {sProjectId}")


    async def broadcastToProject(self, sProjectId: str, dMessage: dict):
        """Send a JSON message to all clients connected to the specified project."""
        if sProjectId in self.dActiveConnections:
            for oConnection in self.dActiveConnections[sProjectId]:
                try:
                    await oConnection.send_json(dMessage)
                except Exception as oE:
                    logging.error(f"WebSocketManager.broadcastToProject: Error sending WebSocket message: {oE}")


# global instance of the WebSocketManager
oWsManager = WebSocketManager()