"""
Options Backtest API Endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

from core.options_engine import OptionsBacktestEngine, OptionsBacktestConfig
from data.options_fetcher import (
    fetch_option_chain,
    get_available_expirations,
    fetch_historical_data_for_options,
    get_risk_free_rate,
    validate_ticker_for_options,
)
from strategies import get_strategy, list_strategies, STRATEGY_REGISTRY

router = APIRouter()


# === Enums ===


class StrategyType(str, Enum):
    LONG_CALL = "long_call"
    LONG_PUT = "long_put"
    SHORT_CALL = "short_call"
    SHORT_PUT = "short_put"
    BULL_CALL_SPREAD = "bull_call_spread"
    BEAR_PUT_SPREAD = "bear_put_spread"
    STRADDLE = "straddle"
    STRANGLE = "strangle"
    IRON_CONDOR = "iron_condor"
    IRON_BUTTERFLY = "iron_butterfly"
    BUTTERFLY_SPREAD = "butterfly_spread"
    COVERED_CALL = "covered_call"
    PROTECTIVE_PUT = "protective_put"
    COLLAR = "collar"


class VolatilityModel(str, Enum):
    HISTORICAL = "historical"
    FIXED = "fixed"


# === Request Models ===


class LegConfig(BaseModel):
    """Configuration for a single option leg"""

    strike_selection: str = Field(
        default="ATM",
        description="Strike selection: ATM, OTM_5%, ITM_5%, or absolute value",
    )


class OptionsBacktestRequest(BaseModel):
    """Options backtest request parameters"""

    ticker: str = Field(..., description="Underlying stock ticker", examples=["AAPL"])
    strategy_type: StrategyType = Field(..., description="Options strategy type")
    start_date: str = Field(
        ..., description="Backtest start date (YYYY-MM-DD)", examples=["2024-01-01"]
    )
    end_date: str = Field(
        ..., description="Backtest end date (YYYY-MM-DD)", examples=["2024-06-01"]
    )
    initial_capital: float = Field(default=10000.0, gt=0, description="Initial capital")
    days_to_expiration: int = Field(
        default=30, ge=1, le=365, description="Days to expiration at entry"
    )
    position_size: int = Field(
        default=1, ge=1, le=100, description="Number of contracts"
    )
    leg_configs: Optional[dict[str, LegConfig]] = Field(
        default=None, description="Per-leg strike configuration"
    )
    volatility_model: VolatilityModel = Field(
        default=VolatilityModel.HISTORICAL, description="Volatility model to use"
    )
    fixed_volatility: Optional[float] = Field(
        default=None,
        ge=0.01,
        le=5.0,
        description="Fixed volatility (if volatility_model is 'fixed')",
    )


# === Response Models ===


class DailyPnLPoint(BaseModel):
    """Daily P&L data point"""

    date: str
    spot_price: float
    position_value: float
    daily_pnl: float
    dte: int


class GreeksPoint(BaseModel):
    """Greeks at a point in time"""

    date: str
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float


class PayoffPoint(BaseModel):
    """Payoff diagram point"""

    price: float
    payoff: float


class TradeRecord(BaseModel):
    """Trade record"""

    date: str
    action: str
    strategy: str
    strikes: list[float]
    spot_price: float
    net_premium: Optional[float] = None
    final_pnl: Optional[float] = None
    premiums: Optional[list[float]] = None
    final_premiums: Optional[list[float]] = None


class OptionsStats(BaseModel):
    """Options backtest statistics"""

    initial_capital: float
    final_value: float
    total_pnl: float
    total_return: float
    max_profit: float
    max_loss: float
    max_drawdown: float
    win_rate: float
    strategy: str
    days_held: int
    entry_date: str
    exit_date: str
    breakeven_points: list[float]


class OptionsBacktestResponse(BaseModel):
    """Options backtest response"""

    stats: OptionsStats
    daily_pnl: list[DailyPnLPoint]
    greeks_series: list[GreeksPoint]
    payoff_diagram: list[PayoffPoint]
    trades: list[TradeRecord]


class OptionChainResponse(BaseModel):
    """Option chain response"""

    ticker: str
    expiration: str
    underlying_price: float
    calls: list[dict]
    puts: list[dict]


class ExpirationsResponse(BaseModel):
    """Available expirations response"""

    ticker: str
    expirations: list[str]


class StrategyInfo(BaseModel):
    """Strategy information"""

    name: str
    type: str
    legs: int
    description: str
    max_profit: Optional[str]
    max_loss: Optional[str]
    has_stock_leg: bool


class TickerValidationResponse(BaseModel):
    """Ticker validation response"""

    valid: bool
    ticker: str
    has_options: bool
    expirations_count: Optional[int] = None
    underlying_price: Optional[float] = None
    name: Optional[str] = None
    error: Optional[str] = None


# === Endpoints ===


@router.post("/options/backtest", response_model=OptionsBacktestResponse)
async def run_options_backtest(request: OptionsBacktestRequest):
    """
    Execute options strategy backtest

    Simulates historical option prices using Black-Scholes model
    with historical volatility from underlying stock.
    """
    # Validate volatility settings
    if (
        request.volatility_model == VolatilityModel.FIXED
        and request.fixed_volatility is None
    ):
        raise HTTPException(
            status_code=400,
            detail="fixed_volatility required when volatility_model is 'fixed'",
        )

    try:
        # Fetch historical data
        price_data, volatility_data = fetch_historical_data_for_options(
            ticker=request.ticker,
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch data for {request.ticker}: {str(e)}",
        )

    if len(price_data) < request.days_to_expiration:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data: need at least {request.days_to_expiration} days, got {len(price_data)}",
        )

    # Prepare leg configurations
    strike_selection = {}
    if request.leg_configs:
        for leg_key, leg_config in request.leg_configs.items():
            strike_selection[leg_key] = leg_config.strike_selection

    # Create config
    config = OptionsBacktestConfig(
        ticker=request.ticker,
        strategy_type=request.strategy_type.value,
        start_date=request.start_date,
        end_date=request.end_date,
        initial_capital=request.initial_capital,
        days_to_expiration=request.days_to_expiration,
        strike_selection=strike_selection,
        position_size=request.position_size,
        volatility_model=request.volatility_model.value,
        fixed_volatility=request.fixed_volatility,
        risk_free_rate=get_risk_free_rate(),
    )

    # Run backtest
    try:
        engine = OptionsBacktestEngine(config)
        result = engine.run(price_data, volatility_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Backtest execution failed: {str(e)}",
        )

    return {
        "stats": result.stats,
        "daily_pnl": result.daily_pnl,
        "greeks_series": result.greeks_series,
        "payoff_diagram": result.payoff_diagram,
        "trades": result.trades,
    }


@router.get("/options/chain/{ticker}", response_model=OptionChainResponse)
async def get_option_chain(ticker: str, expiration: Optional[str] = None):
    """
    Get current option chain for a ticker

    Useful for viewing current market data and implied volatilities.
    """
    try:
        chain = fetch_option_chain(ticker, expiration)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch option chain: {str(e)}",
        )

    return {
        "ticker": chain.ticker,
        "expiration": chain.expiration,
        "underlying_price": chain.underlying_price,
        "calls": chain.calls.to_dict("records"),
        "puts": chain.puts.to_dict("records"),
    }


@router.get("/options/expirations/{ticker}", response_model=ExpirationsResponse)
async def get_expirations(ticker: str):
    """Get available expiration dates for a ticker"""
    try:
        expirations = get_available_expirations(ticker)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch expirations: {str(e)}",
        )

    if not expirations:
        raise HTTPException(
            status_code=404,
            detail=f"No options available for {ticker}",
        )

    return {"ticker": ticker, "expirations": expirations}


@router.get("/options/strategies", response_model=list[StrategyInfo])
async def get_all_strategies():
    """List all available options strategies"""
    result = []

    for type_name in list_strategies():
        strategy = get_strategy(type_name)
        definition = strategy.get_definition()
        result.append(
            {
                "name": definition.name,
                "type": type_name,
                "legs": len(definition.legs),
                "description": definition.description,
                "max_profit": definition.max_profit,
                "max_loss": definition.max_loss,
                "has_stock_leg": definition.stock_leg is not None,
            }
        )

    return result


@router.post("/options/validate-ticker", response_model=TickerValidationResponse)
async def validate_options_ticker(ticker: str):
    """Validate if a ticker has options available"""
    result = validate_ticker_for_options(ticker)
    return result


@router.get("/options/risk-free-rate")
async def get_current_risk_free_rate():
    """Get current risk-free rate"""
    rate = get_risk_free_rate()
    return {"risk_free_rate": rate, "percentage": round(rate * 100, 2)}
