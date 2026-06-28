from pydantic import BaseModel, Field
from typing import List, Optional

class SearchResult(BaseModel):
    title: str = Field(default="")
    url: str = Field(default="")
    content: str = Field(default="")
    score: Optional[float] = Field(default=None)
    highlight: Optional[str] = Field(default=None)
    published_date: Optional[str] = Field(default=None)

class UnifiedSearchResponse(BaseModel):
    query: str
    provider: str
    results: List[SearchResult] = Field(default_factory=list)
    total_results: int = Field(default=0)
    execution_time_ms: float = Field(default=0.0)
    answer: Optional[str] = Field(default=None)
    follow_up_questions: Optional[List[str]] = Field(default=None)

