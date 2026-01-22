"""
SavedPortfolio model for database.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from database import Base


class SavedPortfolio(Base):
    """Model for storing user's saved portfolio configurations."""

    __tablename__ = "saved_portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tickers = Column(JSON, nullable=False)  # ["AAPL", "GOOGL", ...]
    weights = Column(JSON, nullable=False)  # [0.4, 0.3, ...]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_favorite = Column(Boolean, default=False)

    # Relationship to User
    user = relationship("User", backref="saved_portfolios")

    def __repr__(self):
        return f"<SavedPortfolio(id={self.id}, name={self.name}, user_id={self.user_id})>"
