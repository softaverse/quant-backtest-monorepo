"""
Authentication router for Google OAuth.
"""
from datetime import datetime
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.config import Config

from config import get_settings
from database import get_db
from models.user import User
from auth.jwt_handler import create_access_token
from auth.dependencies import get_current_user_optional
from auth.schemas import UserResponse, AuthStatusResponse

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()

# Configure OAuth with authlib
config = Config(environ={
    "GOOGLE_CLIENT_ID": settings.google_client_id,
    "GOOGLE_CLIENT_SECRET": settings.google_client_secret,
})

oauth = OAuth(config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth consent screen."""
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback and create/update user."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return RedirectResponse(
            url=f"{settings.frontend_url}?error=auth_failed",
            status_code=302,
        )

    user_info = token.get("userinfo")
    if not user_info:
        return RedirectResponse(
            url=f"{settings.frontend_url}?error=no_user_info",
            status_code=302,
        )

    google_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    if not google_id or not email:
        return RedirectResponse(
            url=f"{settings.frontend_url}?error=missing_info",
            status_code=302,
        )

    # Find or create user
    user = db.query(User).filter(User.google_id == google_id).first()
    if user:
        # Update existing user
        user.email = email
        user.name = name
        user.picture = picture
        user.last_login_at = datetime.utcnow()
    else:
        # Create new user
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    # Redirect to frontend with token in httpOnly cookie
    response = RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback",
        status_code=302,
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )

    return response


@router.get("/me", response_model=AuthStatusResponse)
async def get_current_user_info(
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get current authenticated user information."""
    if user:
        return AuthStatusResponse(
            authenticated=True,
            user=UserResponse.model_validate(user),
        )
    return AuthStatusResponse(authenticated=False, user=None)


@router.post("/logout")
async def logout(response: Response):
    """Logout user by clearing the access token cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
    )
    return {"message": "Logged out successfully"}
