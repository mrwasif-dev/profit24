const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const API_URL = process.env.WEBSITE_URL;

// Send message to admin
async function notifyAdmin(message, keyboard = null) {
  try {
    let url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    let data = {
      chat_id: ADMIN_ID,
      text: message,
      parse_mode: 'Markdown'
    };
    if (keyboard) {
      data.reply_markup = JSON.stringify(keyboard);
    }
    await axios.post(url, data);
  } catch (error) {
    console.error('Telegram notification failed:', error.message);
  }
}

// Notify user
async function notifyUser(chatId, message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('User notification failed:', error.message);
  }
}

// Send deposit notification to admin
async function notifyNewDeposit(deposit, user) {
  const message = `
💰 *NEW DEPOSIT REQUEST*
━━━━━━━━━━━━━━━━━━━━━
👤 *User:* ${user.username}
📞 *WhatsApp:* ${user.whatsapp}
💵 *Amount:* ${deposit.amount.toLocaleString()} PKR
🆔 *Transaction ID:* ${deposit.transactionId}
📅 *Time:* ${new Date(deposit.createdAt).toLocaleString()}
📸 *Screenshot:* ${API_URL}/uploads/${deposit.screenshot}
━━━━━━━━━━━━━━━━━━━━━
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve_deposit_${deposit._id}` },
        { text: "❌ Reject", callback_data: `reject_deposit_${deposit._id}` }
      ]
    ]
  };
  
  await notifyAdmin(message, keyboard);
}

// Send withdrawal notification to admin
async function notifyNewWithdraw(withdraw, user) {
  const message = `
💸 *NEW WITHDRAWAL REQUEST*
━━━━━━━━━━━━━━━━━━━━━
👤 *User:* ${user.username}
📞 *WhatsApp:* ${user.whatsapp}
💵 *Amount:* ${withdraw.amount.toLocaleString()} PKR
🏦 *Account:* ${withdraw.accountType.toUpperCase()}
🔢 *Number:* ${withdraw.accountNumber}
📛 *Title:* ${withdraw.accountTitle}
📅 *Time:* ${new Date(withdraw.createdAt).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━
  `;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve_withdraw_${withdraw._id}` },
        { text: "❌ Reject", callback_data: `reject_withdraw_${withdraw._id}` }
      ]
    ]
  };
  
  await notifyAdmin(message, keyboard);
}

module.exports = { notifyAdmin, notifyUser, notifyNewDeposit, notifyNewWithdraw };
