from datetime import datetime
from app.extensions import db
from flask_login import UserMixin
import enum


class BaseModel(db.Model):
    __abstract__ = True

    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now
    )


class GenderEnum(enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class RoleEnum(enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class RiskProfileEnum(enum.Enum):
    CONSERVATIVE = "CONSERVATIVE"
    MODERATE = "MODERATE"
    AGGRESSIVE = "AGGRESSIVE"


class TransactionTypeEnum(enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"

class User(BaseModel, UserMixin):
    __tablename__ = 'user'

    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    address = db.Column(db.Text, nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.Enum(GenderEnum))
    role = db.Column(db.Enum(RoleEnum), nullable=False)

    avatar = db.Column(
        db.String(255),
        default="https://res.cloudinary.com/dxiawzgnz/image/upload/v1732632586/pfvvxablnkaeqmmbqeit.png"
    )

    # Financial fields
    monthly_income = db.Column(db.Float, default=0)
    monthly_expense = db.Column(db.Float, default=0)
    risk_profile = db.Column(db.Enum(RiskProfileEnum), default=RiskProfileEnum.MODERATE)

    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    financial_goals = db.relationship('FinancialGoal', backref='user', cascade='all, delete')
    transactions = db.relationship('FinanceTransaction', backref='user', cascade='all, delete')
    conversations = db.relationship('ChatConversation', backref='user', cascade='all, delete')

    def get_id(self):
        return str(self.user_id)

class FinancialGoal(BaseModel): #Muc tieu tài chính
    __tablename__ = 'financial_goal'

    goal_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.user_id', ondelete='CASCADE'),
        nullable=False
    )

    title = db.Column(db.String(255), nullable=False)
    target_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0)
    deadline = db.Column(db.Date, nullable=True)
    description = db.Column(db.Text, nullable=True)


#Giao dich tai chinh
class FinanceTransaction(BaseModel):
    __tablename__ = 'finance_transaction'

    transaction_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.user_id', ondelete='CASCADE'),
        nullable=False
    )

    type = db.Column(db.Enum(TransactionTypeEnum), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.Text)
    date = db.Column(db.Date, default=datetime.now)

class ChatConversation(BaseModel):
    __tablename__ = 'chatconversation'

    conversation_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.user_id', ondelete='CASCADE'),
        nullable=False
    )

    title = db.Column(db.String(255), nullable=False, default="Cuộc trò chuyện tài chính")

    messages = db.relationship('ChatMessage', backref='conversation', cascade='all, delete')


class ChatMessage(BaseModel):
    __tablename__ = 'chatmessage'

    message_id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer,
        db.ForeignKey('chatconversation.conversation_id', ondelete='CASCADE'),
        nullable=False
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.user_id', ondelete='CASCADE'),
        nullable=False
    )

    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), nullable=False)  # 'user' or 'bot'
    timestamp = db.Column(db.DateTime, default=datetime.now)

    # Optional
    has_image = db.Column(db.Boolean, default=False)
    image_url = db.Column(db.String(500))
    is_html = db.Column(db.Boolean, default=False)

