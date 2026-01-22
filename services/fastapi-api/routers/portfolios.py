"""
Portfolio CRUD API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.portfolio import SavedPortfolio
from auth.dependencies import get_current_user
from schemas.portfolio import (
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioResponse,
    PortfolioListResponse,
)

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


@router.post("", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    portfolio: PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new saved portfolio."""
    # Validate weights
    if len(portfolio.tickers) != len(portfolio.weights):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number of tickers must match number of weights",
        )

    weight_sum = sum(portfolio.weights)
    if not (0.99 <= weight_sum <= 1.01):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Weights must sum to 1.0, currently sum to {weight_sum}",
        )

    db_portfolio = SavedPortfolio(
        user_id=current_user.id,
        name=portfolio.name,
        description=portfolio.description,
        tickers=portfolio.tickers,
        weights=portfolio.weights,
        is_favorite=portfolio.is_favorite,
    )
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio


@router.get("", response_model=PortfolioListResponse)
async def list_portfolios(
    skip: int = 0,
    limit: int = 50,
    favorites_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's saved portfolios."""
    query = db.query(SavedPortfolio).filter(SavedPortfolio.user_id == current_user.id)

    if favorites_only:
        query = query.filter(SavedPortfolio.is_favorite == True)

    total = query.count()
    portfolios = (
        query.order_by(SavedPortfolio.is_favorite.desc(), SavedPortfolio.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return PortfolioListResponse(portfolios=portfolios, total=total)


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single saved portfolio by ID."""
    portfolio = (
        db.query(SavedPortfolio)
        .filter(
            SavedPortfolio.id == portfolio_id,
            SavedPortfolio.user_id == current_user.id,
        )
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found",
        )

    return portfolio


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_update: PortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a saved portfolio."""
    portfolio = (
        db.query(SavedPortfolio)
        .filter(
            SavedPortfolio.id == portfolio_id,
            SavedPortfolio.user_id == current_user.id,
        )
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found",
        )

    update_data = portfolio_update.model_dump(exclude_unset=True)

    # Validate weights if both tickers and weights are being updated
    if "tickers" in update_data and "weights" in update_data:
        if len(update_data["tickers"]) != len(update_data["weights"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of tickers must match number of weights",
            )
        weight_sum = sum(update_data["weights"])
        if not (0.99 <= weight_sum <= 1.01):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Weights must sum to 1.0, currently sum to {weight_sum}",
            )
    elif "tickers" in update_data or "weights" in update_data:
        # If only one is provided, validate against the other existing value
        tickers = update_data.get("tickers", portfolio.tickers)
        weights = update_data.get("weights", portfolio.weights)
        if len(tickers) != len(weights):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of tickers must match number of weights",
            )
        if "weights" in update_data:
            weight_sum = sum(weights)
            if not (0.99 <= weight_sum <= 1.01):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Weights must sum to 1.0, currently sum to {weight_sum}",
                )

    for key, value in update_data.items():
        setattr(portfolio, key, value)

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved portfolio."""
    portfolio = (
        db.query(SavedPortfolio)
        .filter(
            SavedPortfolio.id == portfolio_id,
            SavedPortfolio.user_id == current_user.id,
        )
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found",
        )

    db.delete(portfolio)
    db.commit()
    return None


@router.post("/{portfolio_id}/favorite", response_model=PortfolioResponse)
async def toggle_favorite(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle the favorite status of a portfolio."""
    portfolio = (
        db.query(SavedPortfolio)
        .filter(
            SavedPortfolio.id == portfolio_id,
            SavedPortfolio.user_id == current_user.id,
        )
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found",
        )

    portfolio.is_favorite = not portfolio.is_favorite
    db.commit()
    db.refresh(portfolio)
    return portfolio
