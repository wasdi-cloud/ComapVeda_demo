from pydantic import BaseModel


class NoteRequest(BaseModel):
    labelId: str
    note: str
# Add this near your NoteRequest model at the top
class ResolveNoteRequest(BaseModel):
    labelId: str
    noteId: str