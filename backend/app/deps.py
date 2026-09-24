"""
Authentication, Authorization, and Scope verification dependencies.
Supports roles: ADMIN, STAFF, PUBLIC.
Enforces camp-scoped and team-scoped write access for STAFF.
"""
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.models.models import get_db, User
from app.security import decode_token

security_scheme = HTTPBearer(auto_error=False)

def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not auth:
        return None
    token = auth.credentials
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = db.query(User).filter(User.email == user_id).first()
    return user

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    user = get_current_user_optional(auth, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_role(allowed_roles: List[str]):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.upper()
        # ADMIN can access everything
        if user_role == "ADMIN":
            return current_user
        if user_role not in [r.upper() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}"
            )
        return current_user
    return checker

def check_camp_access(camp_id: str, user: User):
    """
    Checks if user is allowed to mutate camp data.
    ADMIN has global access. STAFF is limited to their camp_ids.
    """
    if user.role.upper() == "ADMIN":
        return True
    scoped_camps = user.camp_ids or []
    if camp_id not in scoped_camps:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"STAFF authorization denied: user not scoped to camp '{camp_id}'"
        )
    return True

def require_authority(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.upper() not in ["ADMIN", "STAFF", "AUTHORITY"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: requires 'authority' role"
        )
    return current_user

