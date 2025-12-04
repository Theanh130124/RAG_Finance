from app import app , login
from flask_login import current_user
from app.dao import dao_authen
from app import controllers
from app.extensions import db


# Hàm này luôn truyền các info vào -> .html nao cung co
@app.context_processor
def common_attr():
    if current_user.is_authenticated:
        user = dao_authen.get_info_by_id(current_user.user_id)
        return {
            'user': user,
        }
    return {}

#Chi Flask lay user
@login.user_loader
def user_load(user_id):
    return dao_authen.get_info_by_id(user_id)

app.add_url_rule("/", "index_controller", controllers.index_controller)
app.add_url_rule("/home",'home', controllers.home)
app.add_url_rule("/login",'login' ,controllers.login ,methods=['GET', 'POST'])
app.add_url_rule("/logout",'logout_my_user',controllers.logout_my_user , methods=['get'])
app.add_url_rule("/register", "register", controllers.register, methods=['GET', 'POST'])
app.add_url_rule("/oauth" , 'login_oauth', controllers.login_oauth)
app.add_url_rule("/callback" , 'oauth_callback', controllers.oauth_callback)
app.add_url_rule("/chatbot", "chatbot", controllers.chatbot)  # MỞ COMMENT NÀY
app.add_url_rule("/profile", "profile", controllers.profile, methods=['GET', 'POST'])
app.add_url_rule("/stocks", "stocks", controllers.stocks)
app.add_url_rule("/api/stocks/search", "search_stocks", controllers.search_stocks, methods=['GET'])
app.add_url_rule("/api/stocks/market-indices", "get_market_indices", controllers.get_market_indices, methods=['GET'])
app.add_url_rule("/api/stocks/top-gainers", "get_top_gainers", controllers.get_top_gainers, methods=['GET'])
app.add_url_rule("/api/stocks/top-losers", "get_top_losers", controllers.get_top_losers, methods=['GET'])


if __name__ == '__main__':
    app.run(host="localhost", port=5050, debug=True)