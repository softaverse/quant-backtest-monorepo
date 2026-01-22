"""
Pydantic schemas for portfolio endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PortfolioCreate(BaseModel):
    """Schema for creating a new saved portfolio."""
    name: str = Field(..., min_length=1, max_length=255, description="Portfolio name")
    description: Optional[str] = Field(None, description="Portfolio description")
    tickers: list[str] = Field(..., min_length=1, max_length=50, description="List of ticker symbols")
    weights: list[float] = Field(..., description="List of weights (should sum to 1.0)")
    is_favorite: bool = Field(default=False, description="Mark as favorite")


class PortfolioUpdate(BaseModel):
    """Schema for updating a saved portfolio."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Portfolio name")
    description: Optional[str] = Field(None, description="Portfolio description")
    tickers: Optional[list[str]] = Field(None, min_length=1, max_length=50, description="List of ticker symbols")
    weights: Optional[list[float]] = Field(None, description="List of weights")
    is_favorite: Optional[bool] = Field(None, description="Mark as favorite")


class PortfolioResponse(BaseModel):
    """Schema for portfolio response."""
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    tickers: list[str]
    weights: list[float]
    created_at: datetime
    updated_at: datetime
    is_favorite: bool

    class Config:
        from_attributes = True


class PortfolioListResponse(BaseModel):
    """Schema for listing portfolios."""
    portfolios: list[PortfolioResponse]
    total: int
