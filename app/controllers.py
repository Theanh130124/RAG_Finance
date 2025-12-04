import uuid
import datetime
import base64
from flask import render_template, redirect, request, url_for, session, flash, jsonify
from flask_login import current_user, logout_user, login_required, login_user

from app.models import RoleEnum, User, ChatConversation, ChatMessage
from app import app, flow
from app.form import LoginForm, RegisterForm, ProfileForm, ChangePasswordForm
from app.dao import dao_authen, dao_user
from app.extensions import db
# from app.rag_chatbot import rag_chatbot


import google.oauth2.id_token
import google.auth.transport.requests
import requests,os
import cloudinary.uploader
from dotenv import load_dotenv



def index():
    return render_template('index.html')

def index_controller():
    if current_user.is_authenticated:
        if current_user.role == RoleEnum.ADMIN:
            return redirect("/admin")
        return redirect("/home")
    return redirect('/login')


@app.route('/home')
@login_required
def home():
    return render_template('index.html')



# ============ AUTHENTICATION ============

def login():
    mse = ""
    form = LoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        user = dao_authen.get_user_by_username(username=username)
        if not user:
            mse = "Tài khoản không tồn tại trong hệ thống"
        else:
            if dao_authen.check_password_md5(user, password):
                login_user(user)
                return redirect(url_for('index_controller'))
            else:
                mse = "Mật khẩu không đúng"

    return render_template('login.html', form=form, mse=mse)


def logout_my_user():
    logout_user()
    return redirect('/login')


def login_oauth():
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    session["state"] = state
    return redirect(authorization_url)


def oauth_callback():
    if request.args.get("state") != session.get("state"):
        return "State mismatch!", 400

    try:
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        request_session = requests.session()
        token_request = google.auth.transport.requests.Request(session=request_session)

        id_info = google.oauth2.id_token.verify_oauth2_token(
            id_token=credentials._id_token,
            request=token_request,
            audience=flow.client_config["client_id"],
            clock_skew_in_seconds=10
        )

        email = id_info.get("email")
        name = id_info.get("name")

        user = dao_authen.get_user_by_username(email)
        if not user:
            user = User(
                username=email,
                email=email,
                password="",
                role=RoleEnum.USER,
                first_name=name.split(" ")[0] if name else "Google",
                last_name=" ".join(name.split(" ")[1:]) if name and len(name.split()) > 1 else "User",
                phone_number=f"GG-{uuid.uuid4().hex[:8]}",
                address="Unknown"
            )
            db.session.add(user)
            db.session.flush()
            db.session.commit()
        login_user(user)

        return redirect(url_for("index_controller"))

    except Exception as e:
        app.logger.error(f"OAuth Callback Error: {e}")
        return f"Login failed: {e}", 400


def register():
    form = RegisterForm()
    mse = None

    if form.validate_on_submit():
        username = form.username.data
        email = form.email.data
        password = form.password.data
        first_name = form.first_name.data
        last_name = form.last_name.data
        phone_number = form.phone_number.data
        occupation = form.occupation.data
        monthly_income = form.monthly_income.data
        address = form.address.data
        date_of_birth = form.date_of_birth.data
        gender = form.gender.data

        validation_errors = []

        if dao_authen.check_username_exists(username):
            validation_errors.append("Tên đăng nhập đã tồn tại!")

        if dao_authen.check_email_exists(email):
            validation_errors.append("Email đã tồn tại!")

        if dao_authen.check_phone_exists(phone_number):
            validation_errors.append("Số điện thoại đã tồn tại!")

        if validation_errors:
            mse = " | ".join(validation_errors)
        else:
            new_user = dao_user.create_user_with_role(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                monthly_income=monthly_income,
                occupation=occupation,
                address=address,
                date_of_birth=date_of_birth,
                gender=gender
            )

            if new_user:
                flash("Đăng ký thành công! Hãy đăng nhập.", "success")
                return redirect(url_for("login"))
            else:
                mse = "Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại!"

    return render_template("register.html", form=form, mse=mse)


# ============ PROFILE ============

@app.route('/profile')
@login_required
def profile():
    """Display and update user profile"""
    profile_form = ProfileForm()
    password_form = ChangePasswordForm()

    if profile_form.validate_on_submit() and request.method == 'POST' and 'profile_submit' in request.form:
        avatar_url = current_user.avatar

        if profile_form.avatar.data:
            avatar_url = current_user.avatar

        success, message = dao_user.update_user_profile(
            user_id=current_user.user_id,
            first_name=profile_form.first_name.data,
            last_name=profile_form.last_name.data,
            email=profile_form.email.data,
            phone_number=profile_form.phone_number.data,
            address=profile_form.address.data,
            date_of_birth=profile_form.date_of_birth.data,
            gender=profile_form.gender.data if profile_form.gender.data else None,
            avatar_url=avatar_url
        )

        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')

    elif password_form.validate_on_submit() and request.method == 'POST' and 'password_submit' in request.form:
        success, message = dao_user.change_password(
            user_id=current_user.user_id,
            old_password=password_form.current_password.data,
            new_password=password_form.new_password.data
        )

        if success:
            flash(message, 'success')
        else:
            flash(message, 'danger')

    if request.method == 'GET':
        profile_form.first_name.data = current_user.first_name
        profile_form.last_name.data = current_user.last_name
        profile_form.email.data = current_user.email
        profile_form.phone_number.data = current_user.phone_number
        profile_form.address.data = current_user.address
        profile_form.date_of_birth.data = current_user.date_of_birth
        profile_form.gender.data = current_user.gender.value if current_user.gender else 'OTHER'

    return render_template('profile.html', profile_form=profile_form, password_form=password_form)


# ============ STOCK MARKET ============

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta


@app.route('/stocks')
@login_required
def stocks():
    """Trang chính hiển thị thông tin chứng khoán"""
    return render_template('stocks.html')


@app.route('/api/stocks/search', methods=['GET'])
@login_required
def search_stocks():
    """API tìm kiếm cổ phiếu"""
    query = request.args.get('q', '').upper()

    if not query:
        return jsonify({'success': False, 'message': 'Vui lòng nhập mã cổ phiếu'})

    try:
        # Lấy thông tin cơ bản
        stock = yf.Ticker(query)
        info = stock.info

        # Lấy dữ liệu giá trong 30 ngày qua
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        hist = stock.history(start=start_date, end=end_date)

        if hist.empty:
            return jsonify({'success': False, 'message': 'Không tìm thấy dữ liệu cho mã cổ phiếu này'})

        # Chuẩn bị dữ liệu trả về
        stock_data = {
            'success': True,
            'symbol': query,
            'name': info.get('longName', query),
            'current_price': info.get('currentPrice', hist['Close'].iloc[-1] if not hist.empty else 0),
            'previous_close': info.get('previousClose', 0),
            'change': info.get('currentPrice', 0) - info.get('previousClose', 0) if info.get(
                'currentPrice') and info.get('previousClose') else 0,
            'change_percent': info.get('currentPrice', 0) / info.get('previousClose', 1) * 100 - 100 if info.get(
                'currentPrice') and info.get('previousClose') else 0,
            'volume': info.get('volume', 0),
            'market_cap': info.get('marketCap', 0),
            'pe_ratio': info.get('trailingPE', 0),
            'dividend_yield': info.get('dividendYield', 0),
            'currency': info.get('currency', 'USD'),
            'sector': info.get('sector', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'country': info.get('country', 'N/A')
        }

        # Chuẩn bị dữ liệu biểu đồ
        chart_data = []
        for index, row in hist.iterrows():
            chart_data.append({
                'date': index.strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume'])
            })

        return jsonify({
            'success': True,
            'stock': stock_data,
            'chart_data': chart_data
        })

    except Exception as e:
        app.logger.error(f"Lỗi khi tìm kiếm cổ phiếu {query}: {str(e)}")
        return jsonify({'success': False, 'message': f'Lỗi khi tải dữ liệu: {str(e)}'})


@app.route('/api/stocks/market-indices', methods=['GET'])
@login_required
def get_market_indices():
    """API lấy thông tin các chỉ số thị trường"""
    try:
        # Các chỉ số thị trường phổ biến
        indices_symbols = {
            '^VNINDEX': 'VN-INDEX',
            '^HNX': 'HNX-INDEX',
            '^UPCOM': 'UPCOM-INDEX',
            '^GSPC': 'S&P 500',
            '^DJI': 'Dow Jones',
            '^IXIC': 'NASDAQ',
            '^FTSE': 'FTSE 100',
            '^N225': 'Nikkei 225'
        }

        market_data = []

        for symbol, name in indices_symbols.items():
            try:
                index = yf.Ticker(symbol)
                info = index.info
                hist = index.history(period='1d')

                if not hist.empty:
                    current = float(hist['Close'].iloc[-1])
                    previous = float(info.get('previousClose', current * 0.99))
                    change = float(current - previous)
                    change_percent = float((change / previous * 100) if previous else 0)

                    market_data.append({
                        'symbol': symbol,
                        'name': name,
                        'current': round(current, 2),
                        'change': round(change, 2),
                        'change_percent': round(change_percent, 2),
                        'is_positive': bool(change >= 0)  # Chuyển thành boolean
                    })
            except Exception as e:
                app.logger.error(f"Lỗi khi lấy chỉ số {symbol}: {str(e)}")
                continue

        return jsonify({'success': True, 'indices': market_data})

    except Exception as e:
        app.logger.error(f"Lỗi khi lấy chỉ số thị trường: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})


@app.route('/api/stocks/top-gainers', methods=['GET'])
@login_required
def get_top_gainers():
    """API lấy top cổ phiếu tăng giá (ví dụ với VN-INDEX)"""
    # Đây là dữ liệu mẫu - trong thực tế cần API thực
    # Có thể sử dụng API từ công ty chứng khoán hoặc các nguồn khác
    sample_gainers = [
        {'symbol': 'VIC', 'name': 'Vingroup', 'price': 45000, 'change': 1500, 'change_percent': 3.45},
        {'symbol': 'VHM', 'name': 'Vinhomes', 'price': 52000, 'change': 1200, 'change_percent': 2.36},
        {'symbol': 'VCB', 'name': 'Vietcombank', 'price': 98000, 'change': 2000, 'change_percent': 2.08},
        {'symbol': 'BID', 'name': 'BIDV', 'price': 48000, 'change': 900, 'change_percent': 1.91},
        {'symbol': 'CTG', 'name': 'Vietinbank', 'price': 32000, 'change': 550, 'change_percent': 1.75}
    ]

    return jsonify({'success': True, 'gainers': sample_gainers})


@app.route('/api/stocks/top-losers', methods=['GET'])
@login_required
def get_top_losers():
    """API lấy top cổ phiếu giảm giá (dữ liệu mẫu)"""
    sample_losers = [
        {'symbol': 'FPT', 'name': 'FPT Corporation', 'price': 85000, 'change': -2500, 'change_percent': -2.86},
        {'symbol': 'MWG', 'name': 'Thế giới di động', 'price': 105000, 'change': -3000, 'change_percent': -2.78},
        {'symbol': 'MSN', 'name': 'Masan Group', 'price': 68000, 'change': -1800, 'change_percent': -2.58},
        {'symbol': 'HVN', 'name': 'Vietnam Airlines', 'price': 12500, 'change': -300, 'change_percent': -2.34},
        {'symbol': 'PNJ', 'name': 'Phú Nhuận Jewelry', 'price': 92000, 'change': -2000, 'change_percent': -2.13}
    ]

    return jsonify({'success': True, 'losers': sample_losers})

