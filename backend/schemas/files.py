"""/api/upload + /api/files — drives /dashboard/files."""

from pydantic import BaseModel


class UploadResponse(BaseModel):
    file: str       # filename
    chunks: int
    status: str     # "Completed" | "Failed"


class FileOut(BaseModel):
    """Matches the frontend IngestedFile shape."""

    id: int
    name: str
    size: str       # human-formatted, e.g. "2.4 MB"
    type: str       # "pdf" | "docx" | "txt"
    chunks: int
    date: str       # ISO date string
    status: str     # "Completed" | "Processing" | "Failed"
