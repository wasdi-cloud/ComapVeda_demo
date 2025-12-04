from fastapi import FastAPI

oApp = FastAPI()

@oApp.get("/")
async def root():
    return {"message": "Hello, World!"}

@oApp.get("/get_three_points")
async def get_three_points():
    return {
        "points": [
            {"lat": 1, "lng": 2},
            {"lat": 3, "lng": 4},
            {"lat": 5, "lng": 6}
        ]
    }


if __name__ == "__main__":
    """
    To run the application from terminal, use the following command:
    uvicorn main:oApp --reload
    """

    import uvicorn
    uvicorn.run("main:oApp", host="127.0.0.1", port=8000, reload=True)