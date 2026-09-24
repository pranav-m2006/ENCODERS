from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import get_db, User
from app.schemas.schemas import UserLogin, UserRegister, Token, UserOut
from app.security import verify_password, get_password_hash, create_access_token
from app.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut(
            id=user.id,
            name=user.name,
            role=user.role,
            district=user.district,
            language=user.language
        )
    )

@router.post("/register", response_model=Token)
def register(reg_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == reg_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=reg_data.name,
        email=reg_data.email,
        password_hash=get_password_hash(reg_data.password),
        role="public", # Only public users can self-register
        district=reg_data.district,
        language=reg_data.language
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        subject=new_user.id,
        role="public",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut(
            id=new_user.id,
            name=new_user.name,
            role=new_user.role,
            district=new_user.district,
            language=new_user.language
        )
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        name=current_user.name,
        role=current_user.role,
        district=current_user.district,
        language=current_user.language
    )
