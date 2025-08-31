from pydantic import BaseModel
from typing import List

class ExplainTermRequest(BaseModel):
    term: str
from datetime import datetime

class TermBase(BaseModel):
    term: str
    analysis: str

class TermCreate(TermBase):
    pass

class Term(TermBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True