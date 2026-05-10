import asyncio
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import aiohttp
from datetime import datetime

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN')
ADMIN_ID = int(os.environ.get('ADMIN_TELEGRAM_ID', '123456789'))
API_URL = os.environ.get('WEBSITE_URL', 'https://your-app.herokuapp.com')

async def is_admin(user_id):
    return user_id == ADMIN_ID

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Unauthorized access")
        return
    
    keyboard = [
        [InlineKeyboardButton("📊 Dashboard", callback_data="dashboard")],
        [InlineKeyboardButton("💰 Deposits", callback_data="deposits"), InlineKeyboardButton("💸 Withdrawals", callback_data="withdrawals")],
        [InlineKeyboardButton("⚙️ Plan Settings", callback_data="plan_settings"), InlineKeyboardButton("💳 Deposit Accounts", callback_data="deposit_accounts")],
        [InlineKeyboardButton("🔗 Referral Settings", callback_data="referral_settings"), InlineKeyboardButton("📈 Profit Settings", callback_data="profit_settings")],
        [InlineKeyboardButton("💬 Withdrawal Limits", callback_data="withdraw_limits"), InlineKeyboardButton("❓ FAQ Management", callback_data="faq_management")],
        [InlineKeyboardButton("📢 Broadcast", callback_data="broadcast"), InlineKeyboardButton("👑 Admin Settings", callback_data="admin_settings")],
        [InlineKeyboardButton("📜 Transaction Logs", callback_data="transaction_logs")]
    ]
    await update.message.reply_text("🔐 *Profit24 Admin Panel*\nSelect an option:", reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f'{API_URL}/api/admin/stats') as resp:
            stats = await resp.json()
    
    message = f"""
📊 *DASHBOARD STATISTICS*
━━━━━━━━━━━━━━━━━━━━━

👥 *Users*
• Total: {stats.get('totalUsers', 0)}
• Active: {stats.get('activeUsers', 0)}
• New Today: {stats.get('newToday', 0)}

💰 *Financials*
• Deposits: {stats.get('totalDeposits', 0):,} PKR
• Withdrawals: {stats.get('totalWithdrawals', 0):,} PKR
• Profit Paid: {stats.get('totalProfit', 0):,} PKR

⏳ *Pending*
• Deposits: {stats.get('pendingDeposits', 0)}
• Withdrawals: {stats.get('pendingWithdrawals', 0)}

🔗 *Referrals*
• Total: {stats.get('totalReferrals', 0)}
• Bonus Paid: {stats.get('totalBonus', 0):,} PKR
    """
    await query.edit_message_text(message, parse_mode='Markdown')

async def deposits(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f'{API_URL}/api/admin/pending-deposits') as resp:
            deposits = await resp.json()
    
    if not deposits:
        await query.edit_message_text("✅ No pending deposits")
        return
    
    for deposit in deposits[:5]:
        keyboard = [
            [InlineKeyboardButton("✅ Approve", callback_data=f"approve_deposit_{deposit['_id']}"),
             InlineKeyboardButton("❌ Reject", callback_data=f"reject_deposit_{deposit['_id']}")]
        ]
        message = f"""
💰 *PENDING DEPOSIT*
━━━━━━━━━━━━━━━━━━━━━
👤 User: {deposit['userId']['username']}
💵 Amount: {deposit['amount']:,} PKR
🆔 TXID: {deposit['transactionId']}
📅 Date: {datetime.fromisoformat(deposit['createdAt']).strftime('%Y-%m-%d %H:%M')}
        """
        await query.message.reply_text(message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def withdrawals(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f'{API_URL}/api/admin/pending-withdrawals') as resp:
            withdrawals = await resp.json()
    
    if not withdrawals:
        await query.edit_message_text("✅ No pending withdrawals")
        return
    
    for withdraw in withdrawals[:5]:
        keyboard = [
            [InlineKeyboardButton("✅ Approve", callback_data=f"approve_withdraw_{withdraw['_id']}"),
             InlineKeyboardButton("❌ Reject", callback_data=f"reject_withdraw_{withdraw['_id']}")]
        ]
        message = f"""
💸 *PENDING WITHDRAWAL*
━━━━━━━━━━━━━━━━━━━━━
👤 User: {withdraw['userId']['username']}
💵 Amount: {withdraw['amount']:,} PKR
🏦 Account: {withdraw['accountType'].upper()}
📅 Date: {datetime.fromisoformat(withdraw['createdAt']).strftime('%Y-%m-%d %H:%M')}
        """
        await query.message.reply_text(message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def approve_deposit(update: Update, context: ContextTypes.DEFAULT_TYPE, deposit_id: str):
    query = update.callback_query
    await query.answer()
    
    async with aiohttp.ClientSession() as session:
        await session.post(f'{API_URL}/api/admin/approve-deposit', json={'depositId': deposit_id})
    
    await query.edit_message_text("✅ Deposit approved successfully!")

async def reject_deposit(update: Update, context: ContextTypes.DEFAULT_TYPE, deposit_id: str):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("❌ Deposit rejected. Send reason:")
    context.user_data['reject_deposit_id'] = deposit_id

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    
    if data == "dashboard":
        await dashboard(update, context)
    elif data == "deposits":
        await deposits(update, context)
    elif data == "withdrawals":
        await withdrawals(update, context)
    elif data.startswith("approve_deposit_"):
        await approve_deposit(update, context, data.replace("approve_deposit_", ""))
    elif data.startswith("reject_deposit_"):
        await reject_deposit(update, context, data.replace("reject_deposit_", ""))

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_admin(update.effective_user.id):
        return
    
    if 'reject_deposit_id' in context.user_data:
        deposit_id = context.user_data.pop('reject_deposit_id')
        reason = update.message.text
        async with aiohttp.ClientSession() as session:
            await session.post(f'{API_URL}/api/admin/reject-deposit', json={'depositId': deposit_id, 'reason': reason})
        await update.message.reply_text("✅ Deposit rejected")

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("admin", start))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("🤖 Telegram Bot started...")
    app.run_polling()

if __name__ == "__main__":
    main()
