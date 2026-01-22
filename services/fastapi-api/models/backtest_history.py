"""
BacktestHistory model for database.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from database import Base


class BacktestHistory(Base):
    """Model for storing user's backtest history."""

    __tablename__ = "backtest_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    portfolio_id = Column(Integer, ForeignKey("saved_portfolios.id"), nullable=True)

    # Input parameters
    portfolio_name = Column(String(255), nullable=True)
    tickers = Column(JSON, nullable=False)  # ["AAPL", "GOOGL", ...]
    weights = Column(JSON, nullable=False)  # [0.4, 0.3, ...]
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    initial_capital = Column(Float, nullable=False)
    rebalance_frequency = Column(String(50), default="yearly")

    # Summary stats (for quick display)
    final_value = Column(Float, nullable=True)
    total_return = Column(Float, nullable=True)
    cagr = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    sharpe_ratio = Column(Float, nullable=True)

    # Full results (JSON)
    full_results = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="backtest_history")
    portfolio = relationship("SavedPortfolio", backref="backtest_runs")

    def __repr__(self):
        return f"<BacktestHistory(id={self.id}, user_id={self.user_id}, portfolio_name={self.portfolio_name})>"
