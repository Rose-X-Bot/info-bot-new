const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

// Initialize Express app
const app = express();
app.use(express.json());

// Bot Configuration
const BOT_TOKEN = "8547661525:AAFdNeQsMJZrv3M2M-1RbqVpQtWI49Mlyxs";
const ADMIN_ID = 6971655319;

// Channel Configuration
const CHANNEL_USERNAME = "@Rose_X_Files";
const CHANNEL_JOIN_URL = "https://t.me/Rose_X_Files";

const WELCOME_IMAGE = "https://i.ibb.co/NnsHbxb8/Ag-ACAg-UAAxk-BAAM-a-O-ks-Wahgns5-Fdol-Wl-UL01pz-HMAAp-QMaxt-Dm3l-XDLx-Jye-W1hp8-BAAMCAAN5-AAM2-BA.jpg";
const WELCOME_TEXT = `╔═════════════════════════════════╗
║ 🔥 Welcome to Rose-X Bot🔥 
╠═════════════════════════════════╣
║ Select an option below to search 💥
╠═════════════════════════════════╣                            
║  🛠️ Developed By: @Ros3_Zii 💝  
╚═════════════════════════════════╝`;

// APIs
const MOBILE_API = "https://ox-tawny.vercel.app/search_mobile?api_key=taitanx&mobile=";
const AADHAR_API = "https://aadhar-3-family.vercel.app/fetch?key=Rose-X-Paid&aadhaar=";
const VEHICLE_API = "https://vehicle-info-api-five.vercel.app/vehicle=";
const PAK_API = "https://aadhar-3-family.vercel.app/fetch?key=Rose-X-Paid&aadhaar=";
const PAK_MOBILE_API = "https://scamer-ka-fuck.vercel.app/api/lookup/";

// Blocked numbers
const BLOCKED_NUMBERS = {
    "8859772859": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "9756887329": "Ooh Rose Ka Number Ka Info Chahiye 😁😆", 
    "9045772859": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "7500194354": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "8439474543": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "8791849129": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "8869014354": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "6387346308": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "8817332717": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
    "7818853969": "Ooh Rose Ka Number Ka Info Chahiye 😁😆",
};

const DEVELOPER_CONTACT_URL = "https://t.me/h4ck3rspybot";
const DEVELOPER_TAG = "🔧 Source: @Ros3_Zii";

// Credit System
const INITIAL_CREDITS = 5;
const REFERRAL_CREDITS = 2;
const DAILY_BONUS_CREDITS = 2;
const REDEEM_CREDITS = 5;

// Track pending input type per user
const USER_PENDING_TYPE = {};

// Database setup
const dbPath = path.join('/tmp', 'users.db'); // Use /tmp for Vercel

function initDb() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }

            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                credits INTEGER DEFAULT 5,
                total_searches INTEGER DEFAULT 0,
                referrals INTEGER DEFAULT 0,
                last_daily_bonus TEXT,
                joined_date TEXT,
                is_banned INTEGER DEFAULT 0
            )`, (err) => {
                if (err) console.error('Error creating users table:', err);
            });

            // Search history table
            db.run(`CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                search_type TEXT,
                search_query TEXT,
                result_status TEXT,
                timestamp TEXT,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )`, (err) => {
                if (err) console.error('Error creating search_history table:', err);
            });

            // Referrals table
            db.run(`CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER,
                referred_id INTEGER,
                timestamp TEXT,
                FOREIGN KEY (referrer_id) REFERENCES users (user_id),
                FOREIGN KEY (referred_id) REFERENCES users (user_id)
            )`, (err) => {
                if (err) console.error('Error creating referrals table:', err);
            });

            // Redeem codes table
            db.run(`CREATE TABLE IF NOT EXISTS redeem_codes (
                code TEXT PRIMARY KEY,
                credits INTEGER DEFAULT 5,
                used_by INTEGER DEFAULT 0,
                max_uses INTEGER DEFAULT 1,
                used_count INTEGER DEFAULT 0,
                created_by INTEGER,
                created_date TEXT
            )`, (err) => {
                if (err) console.error('Error creating redeem_codes table:', err);
                db.close((closeErr) => {
                    if (closeErr) console.error('Error closing database:', closeErr);
                    resolve();
                });
            });
        });
    });
}

// Database helper functions
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(sql, params, function(err) {
            db.close();
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get(sql, params, (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all(sql, params, (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// User management functions
async function getUserData(userId) {
    const user = await dbGet('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (user) {
        return {
            user_id: user.user_id,
            username: user.username,
            first_name: user.first_name,
            credits: user.credits,
            total_searches: user.total_searches,
            referrals: user.referrals,
            last_daily_bonus: user.last_daily_bonus,
            joined_date: user.joined_date,
            is_banned: user.is_banned
        };
    }
    return null;
}

async function createUser(userId, username, firstName) {
    await dbRun(
        'INSERT OR REPLACE INTO users (user_id, username, first_name, credits, joined_date, is_banned) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, firstName, INITIAL_CREDITS, new Date().toISOString(), 0]
    );
}

async function updateUserCredits(userId, creditsChange) {
    await dbRun(
        'UPDATE users SET credits = credits + ?, total_searches = total_searches + 1 WHERE user_id = ?',
        [creditsChange, userId]
    );
}

async function setUserCredits(userId, credits) {
    await dbRun('UPDATE users SET credits = ? WHERE user_id = ?', [credits, userId]);
}

async function addSearchHistory(userId, searchType, searchQuery, resultStatus) {
    await dbRun(
        'INSERT INTO search_history (user_id, search_type, search_query, result_status, timestamp) VALUES (?, ?, ?, ?, ?)',
        [userId, searchType, searchQuery, resultStatus, new Date().toISOString()]
    );
}

async function getSearchHistory(userId, limit = 10) {
    return await dbAll(
        'SELECT search_type, search_query, result_status, timestamp FROM search_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limit]
    );
}

async function addReferral(referrerId, referredId) {
    const db = new sqlite3.Database(dbPath);
    
    await new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO referrals (referrer_id, referred_id, timestamp) VALUES (?, ?, ?)',
            [referrerId, referredId, new Date().toISOString()],
            function(err) {
                if (err) reject(err);
                else resolve(this);
            }
        );
    });

    await new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET referrals = referrals + 1, credits = credits + ? WHERE user_id = ?',
            [REFERRAL_CREDITS, referrerId],
            function(err) {
                if (err) reject(err);
                else resolve(this);
            }
        );
    });

    db.close();
}

async function updateDailyBonus(userId) {
    await dbRun(
        'UPDATE users SET credits = credits + ?, last_daily_bonus = ? WHERE user_id = ?',
        [DAILY_BONUS_CREDITS, new Date().toISOString(), userId]
    );
}

async function canClaimDailyBonus(userId) {
    const user = await getUserData(userId);
    if (!user || !user.last_daily_bonus) return true;
    
    const lastBonus = new Date(user.last_daily_bonus);
    const now = new Date();
    return (now - lastBonus) >= 24 * 3600 * 1000;
}

async function getAllUsers() {
    return await dbAll(
        'SELECT user_id, username, first_name, credits, total_searches, referrals, joined_date, is_banned FROM users ORDER BY joined_date DESC'
    );
}

async function banUser(userIdentifier) {
    if (typeof userIdentifier === 'number') {
        await dbRun('UPDATE users SET is_banned = 1 WHERE user_id = ?', [userIdentifier]);
    } else {
        await dbRun('UPDATE users SET is_banned = 1 WHERE username = ? OR first_name = ?', [userIdentifier, userIdentifier]);
    }
}

async function unbanUser(userIdentifier) {
    if (typeof userIdentifier === 'number') {
        await dbRun('UPDATE users SET is_banned = 0 WHERE user_id = ?', [userIdentifier]);
    } else {
        await dbRun('UPDATE users SET is_banned = 0 WHERE username = ? OR first_name = ?', [userIdentifier, userIdentifier]);
    }
}

async function addRedeemCode(code, adminId) {
    await dbRun(
        'INSERT OR REPLACE INTO redeem_codes (code, credits, created_by, created_date) VALUES (?, ?, ?, ?)',
        [code.toUpperCase(), REDEEM_CREDITS, adminId, new Date().toISOString()]
    );
}

async function useRedeemCode(code, userId) {
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
        db.get('SELECT credits, used_count, max_uses FROM redeem_codes WHERE code = ?', [code.toUpperCase()], async (err, codeData) => {
            if (err) {
                db.close();
                reject(err);
                return;
            }
            
            if (!codeData) {
                db.close();
                resolve([false, "Invalid redeem code!"]);
                return;
            }
            
            const { credits, used_count, max_uses } = codeData;
            
            if (used_count >= max_uses) {
                db.close();
                resolve([false, "Redeem code has been used already!"]);
                return;
            }
            
            // Update code usage
            db.run('UPDATE redeem_codes SET used_count = used_count + 1 WHERE code = ?', [code.toUpperCase()], async (err) => {
                if (err) {
                    db.close();
                    reject(err);
                    return;
                }
                
                // Add credits to user
                db.run('UPDATE users SET credits = credits + ? WHERE user_id = ?', [credits, userId], (err) => {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve([true, `Successfully redeemed ${credits} credits!`]);
                    }
                });
            });
        });
    });
}

async function getUserByUsername(username) {
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
        return {
            user_id: user.user_id,
            username: user.username,
            first_name: user.first_name,
            credits: user.credits,
            total_searches: user.total_searches,
            referrals: user.referrals,
            last_daily_bonus: user.last_daily_bonus,
            joined_date: user.joined_date,
            is_banned: user.is_banned
        };
    }
    return null;
}

// Initialize database
initDb().then(() => console.log('Database initialized')).catch(console.error);

// Helper functions
function mainReplyKeyboard() {
    return Markup.keyboard([
        ["👭👬 Aadhar to Family", "📞 Mobile Number"],
        ["🧍🏻 Aadhar Number", "🚗 Vehicle Number"],
        ["🇵🇰 Pakistan Mobile", "🎁 Daily Bonus"],
        ["💰 My Credits", "📊 My History"],
        ["📤 Referral Link"]
    ]).resize();
}

function joinChannelMarkup() {
    return Markup.inlineKeyboard([
        [Markup.button.url("✅ Join Our Channel", CHANNEL_JOIN_URL)]
    ]);
}

function cleanNumber(number) {
    return (number || "").replace(/[^\d+]/g, "");
}

function cleanVehicleNumber(vehicleNo) {
    return vehicleNo.replace(/\s+/g, '').toUpperCase();
}

function cleanPakMobileNumber(number) {
    number = number.replace(/[^\d]/g, '');
    
    if (number.startsWith('92') && number.length === 12) {
        return number;
    } else if (number.startsWith('0') && number.length === 11) {
        return '92' + number.substring(1);
    } else if (number.length === 10) {
        return '92' + number;
    } else {
        return number;
    }
}

function isBlockedNumber(number) {
    const numberClean = cleanNumber(number);
    for (const [blocked, response] of Object.entries(BLOCKED_NUMBERS)) {
        const blockedClean = cleanNumber(blocked);
        if (numberClean.includes(blockedClean) || numberClean.endsWith(blockedClean)) {
            return response;
        }
    }
    return false;
}

async function checkSubscription(userId, ctx) {
    if (!CHANNEL_USERNAME || CHANNEL_USERNAME.startsWith("YOUR_")) {
        return true;
    }
    try {
        const member = await ctx.telegram.getChatMember(CHANNEL_USERNAME, userId);
        return ['member', 'creator', 'administrator'].includes(member.status);
    } catch {
        return false;
    }
}

async function checkAndBlockIfNotJoined(update, ctx) {
    const user = update.message.from;
    if (!user) return false;
    
    const isJoined = await checkSubscription(user.id, ctx);
    if (!isJoined) {
        await ctx.reply(
            "⚠️ ACCESS DENIED ⚠️\n\nYou must join our channel to use this bot. Press /start after joining.",
            joinChannelMarkup()
        );
        return false;
    }
    return true;
}

// Formatting functions
function formatMobileInfo(data) {
    if (!data.data) {
        return formatErrorResponse(data, "mobile");
    }
    
    const results = data.data;
    let formattedText = "📱 <b>Mobile Number Information</b>\n\n";
    
    results.forEach((result, i) => {
        formattedText += `<b>Record ${i + 1}:</b>\n`;
        formattedText += `📞 <b>Mobile:</b> <code>${result.mobile || 'N/A'}</code>\n`;
        formattedText += `👤 <b>Name:</b> <code>${(result.name || 'N/A').trim()}</code>\n`;
        formattedText += `👨 <b>Father's Name:</b> <code>${result.fname || 'N/A'}</code>\n`;
        
        let address = result.address || '';
        if (address) {
            address = address.replace(/!!+/g, ', ').replace(/!/g, ' ');
            address = address.split(/\s+/).join(' ');
            formattedText += `🏠 <b>Address:</b> <code>${address}</code>\n`;
        } else {
            formattedText += `🏠 <b>Address:</b> <code>N/A</code>\n`;
        }
        
        formattedText += `📱 <b>Alt:</b> <code>${result.alt || 'N/A'}</code>\n`;
        formattedText += `📶 <b>Circle:</b> <code>${result.circle || 'N/A'}</code>\n`;
        formattedText += `🆔 <b>ID:</b> <code>${result.id || 'N/A'}</code>\n`;
        formattedText += `🔧 <b>Source:</b> <code>@Ros3_Zii</code>\n\n`;
    });
    
    return formattedText;
}

function formatPakMobileInfo(data) {
    if (data.error) {
        return formatErrorResponse(data, "pakistan mobile");
    }
    
    let formattedText = "🇵🇰 <b>Pakistan Mobile Information</b>\n\n";
    
    const fieldEmojis = {
        'number': '📞',
        'name': '👤',
        'father_name': '👨',
        'address': '🏠',
        'city': '🏙️',
        'province': '📍',
        'operator': '📶',
        'cnic': '🆔',
        'status': '📊'
    };
    
    Object.entries(data).forEach(([key, value]) => {
        if (value && value !== "N/A") {
            const keyFormatted = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const emoji = fieldEmojis[key] || '📋';
            formattedText += `${emoji} <b>${keyFormatted}:</b> <code>${value}</code>\n`;
        }
    });
    
    return formattedText;
}

function formatAadharFamilyInfo(data) {
    if (!data.memberDetailsList) {
        return formatErrorResponse(data, "aadhar family");
    }
    
    let formattedText = "👨‍👩‍👧‍👦 <b>Family Information for Aadhaar</b>\n\n";
    
    formattedText += `📍 <b>District:</b> <code>${data.homeDistName || 'N/A'}</code>\n`;
    formattedText += `🏛️ <b>State:</b> <code>${data.homeStateName || 'N/A'}</code>\n`;
    formattedText += `🏠 <b>Address:</b> <code>${data.address || 'N/A'}</code>\n`;
    formattedText += `📑 <b>Scheme:</b> <code>${data.schemeName || 'N/A'}</code>\n`;
    formattedText += `📋 <b>RC ID:</b> <code>${data.rcId || 'N/A'}</code>\n\n`;
    
    const memberCount = data.memberDetailsList.length;
    formattedText += `👥 <b>Family Members (${memberCount}):</b>\n`;
    formattedText += "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n";
    
    data.memberDetailsList.forEach((member, i) => {
        formattedText += `<b>${i + 1}. ${member.memberName || 'N/A'}</b>\n`;
        formattedText += `   👤 <b>Relationship:</b> <code>${member.releationship_name || 'N/A'}</code>\n`;
        formattedText += `   🆔 <b>Member ID:</b> <code>${member.memberId || 'N/A'}</code>\n`;
        formattedText += `   📱 <b>UID Status:</b> <code>${member.uid ? 'Yes' : 'No'}</code>\n\n`;
    });
    
    return formattedText;
}

function formatVehicleInfo(data) {
    if (!data) {
        return "❌ <b>Vehicle Information Error</b>\n\nNo data received from API. Please try again later.";
    }
    
    if (data.error) {
        return formatErrorResponse(data, "vehicle");
    }
    
    let vehicleData = data.data || data;
    let formattedText = "🚗 <b>Vehicle Information</b>\n\n";
    
    const essentialFields = {
        'registration_no': '🚘 Registration No',
        'owner_name': '👤 Owner Name', 
        'maker_model': '🏭 Maker Model',
        'vehicle_class': '🚙 Vehicle Class',
        'fuel_type': '⛽ Fuel Type',
        'registration_date': '📅 Registration Date',
        'chassis_no': '🔧 Chassis No',
        'engine_no': '⚙️ Engine No',
        'rc_status': '📊 RC Status'
    };
    
    Object.entries(essentialFields).forEach(([field, displayName]) => {
        const value = vehicleData[field];
        if (value && value !== 'N/A') {
            formattedText += `${displayName}: <code>${value}</code>\n`;
        }
    });
    
    return formattedText;
}

function formatErrorResponse(data, infoType) {
    const errorMsg = data.error || "Unknown error occurred";
    let formattedText = `❌ <b>Error for ${infoType.charAt(0).toUpperCase() + infoType.slice(1)}:</b>\n<code>${errorMsg}</code>\n\n`;
    
    const tips = {
        "mobile": [
            "Make sure mobile number is 10 digits",
            "Check if the number is registered in India",
            "Try with different mobile carrier"
        ],
        "vehicle": [
            "Make sure vehicle number is in correct format (e.g., UP26R4060)",
            "Check if the vehicle number exists in RTO database",
            "Try without spaces"
        ]
    };
    
    if (tips[infoType]) {
        formattedText += "<b>💡 Tips:</b>\n" + tips[infoType].map(tip => `• ${tip}`).join('\n');
    }
    
    return formattedText;
}

// API functions
async function fetchVehicleInfo(vehicleNo) {
    try {
        const vehicleClean = cleanVehicleNumber(vehicleNo);
        const apiUrl = VEHICLE_API + encodeURIComponent(vehicleClean);
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        };
        
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await axios.get(apiUrl, { headers, timeout: 15000 });
                
                if (response.status === 200) {
                    const data = response.data;
                    if (data && (data.status || data.data || data.registration_no || data.owner_name)) {
                        return data;
                    } else {
                        return { error: "No vehicle information found for this number" };
                    }
                }
            } catch (error) {
                if (attempt === 2) {
                    if (error.code === 'ECONNABORTED') {
                        return { error: "Request timeout - API is taking too long to respond" };
                    }
                    return { error: `Request failed: ${error.message}` };
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return { error: "All attempts failed to fetch vehicle information" };
    } catch (error) {
        return { error: `Unexpected error: ${error.message}` };
    }
}

async function fetchGenericInfo(apiUrl, timeout = 8000) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        };
        
        const response = await axios.get(apiUrl, { headers, timeout });
        
        if (response.status === 200) {
            return response.data;
        } else {
            return { error: `API returned status code: ${response.status}` };
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return { error: "Request timeout - API is taking too long to respond" };
        }
        return { error: `Request failed: ${error.message}` };
    }
}

// Initialize Telegram bot
const bot = new Telegraf(BOT_TOKEN);

// Start command
bot.start(async (ctx) => {
    const user = ctx.from;
    console.log(`Start command from user: ${user.id}`);
    
    // Check if user is banned
    const userData = await getUserData(user.id);
    if (userData && userData.is_banned) {
        await ctx.reply("❌ <b>You are banned from using this bot!</b>\n\nContact admin for more information.", { parse_mode: 'HTML' });
        return;
    }
    
    // Handle referral
    if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
        try {
            const referrerId = parseInt(ctx.startPayload.replace('ref_', ''));
            const referredId = user.id;
            
            const existingUser = await getUserData(referredId);
            if (!existingUser) {
                await addReferral(referrerId, referredId);
                
                try {
                    await ctx.telegram.sendMessage(
                        referrerId,
                        `🎉 Congratulations! Your friend joined using your referral link!\n+${REFERRAL_CREDITS} credits added to your account!`,
                        { parse_mode: 'HTML' }
                    );
                } catch (error) {
                    console.log('Could not notify referrer');
                }
            }
        } catch (error) {
            console.log('Referral error:', error);
        }
    }
    
    // Check channel subscription
    const isJoined = await checkSubscription(user.id, ctx);
    if (!isJoined) {
        await ctx.reply(
            "⚠️ ACCESS DENIED ⚠️\n\nYou must join our channel to use this bot. Press /start after joining.",
            joinChannelMarkup()
        );
        return;
    }
    
    // Create user if not exists
    if (!userData) {
        await createUser(user.id, user.username, user.first_name);
    }
    
    const currentUserData = await getUserData(user.id);
    const welcomeWithCredits = `${WELCOME_TEXT}\n\n💰 <b>Your Credits:</b> <code>${currentUserData.credits}</code>`;
    
    try {
        await ctx.replyWithPhoto(WELCOME_IMAGE, {
            caption: welcomeWithCredits,
            parse_mode: 'HTML',
            ...joinChannelMarkup()
        });
        
        await ctx.reply(
            "💎 <b>Quick Actions Menu</b>\n\nUse the buttons below for quick access:",
            { parse_mode: 'HTML', ...mainReplyKeyboard() }
        );
    } catch (error) {
        await ctx.reply(welcomeWithCredits, { parse_mode: 'HTML', ...mainReplyKeyboard() });
    }
});

// Message router
bot.on('text', async (ctx) => {
    const user = ctx.from;
    const text = ctx.message.text.trim();
    
    // Check if user is banned
    const userData = await getUserData(user.id);
    if (userData && userData.is_banned) {
        await ctx.reply("❌ <b>You are banned from using this bot!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    // Check channel subscription
    const isJoined = await checkSubscription(user.id, ctx);
    if (!isJoined) {
        await ctx.reply(
            "⚠️ ACCESS DENIED ⚠️\n\nYou must join our channel to use this bot.",
            joinChannelMarkup()
        );
        return;
    }
    
    // Handle menu buttons
    if (text === "🎁 Daily Bonus") {
        if (await canClaimDailyBonus(user.id)) {
            await updateDailyBonus(user.id);
            const updatedUser = await getUserData(user.id);
            await ctx.reply(
                `🎁 <b>Daily Bonus Claimed!</b>\n\n+${DAILY_BONUS_CREDITS} credits added to your account!\n\n💰 <b>Total Credits:</b> <code>${updatedUser.credits}</code>`,
                { parse_mode: 'HTML', ...mainReplyKeyboard() }
            );
        } else {
            await ctx.reply(
                "⏳ <b>Daily Bonus Already Claimed!</b>\n\nYou can claim your next daily bonus after 24 hours.",
                { parse_mode: 'HTML', ...mainReplyKeyboard() }
            );
        }
        return;
    }
    
    if (text === "💰 My Credits") {
        const userData = await getUserData(user.id);
        await ctx.reply(
            `💰 <b>Your Credit Information</b>\n\n` +
            `🪙 <b>Available Credits:</b> <code>${userData.credits}</code>\n` +
            `🔍 <b>Total Searches:</b> <code>${userData.total_searches}</code>\n` +
            `📤 <b>Referrals:</b> <code>${userData.referrals}</code>\n` +
            `📅 <b>Joined:</b> <code>${userData.joined_date ? userData.joined_date.substring(0, 10) : 'N/A'}</code>`,
            { parse_mode: 'HTML', ...mainReplyKeyboard() }
        );
        return;
    }
    
    if (text === "📊 My History") {
        const history = await getSearchHistory(user.id, 10);
        if (!history || history.length === 0) {
            await ctx.reply(
                "📊 <b>No Search History Found</b>\n\nYou haven't performed any searches yet.",
                { parse_mode: 'HTML', ...mainReplyKeyboard() }
            );
        } else {
            let historyText = "📊 <b>Your Recent Search History</b>\n\n";
            history.forEach((record, i) => {
                const emoji = record.result_status === "success" ? "✅" : "❌";
                const timeStr = record.timestamp.substring(0, 16).replace('T', ' ');
                historyText += `${i + 1}. ${emoji} <b>${record.search_type.toUpperCase()}</b>\n`;
                historyText += `   📝 <code>${record.search_query}</code>\n`;
                historyText += `   🕒 ${timeStr}\n\n`;
            });
            
            await ctx.reply(historyText, { parse_mode: 'HTML', ...mainReplyKeyboard() });
        }
        return;
    }
    
    if (text === "📤 Referral Link") {
        const userData = await getUserData(user.id);
        const botInfo = await ctx.telegram.getMe();
        const referralLink = `https://t.me/${botInfo.username}?start=ref_${user.id}`;
        
        await ctx.reply(
            `📤 <b>Your Referral Link</b>\n\n` +
            `Share this link with your friends:\n` +
            `<code>${referralLink}</code>\n\n` +
            `🎁 <b>Rewards:</b>\n` +
            `• You get +${REFERRAL_CREDITS} credits when someone joins using your link\n` +
            `• Your friend gets ${INITIAL_CREDITS} free credits\n\n` +
            `👥 <b>Your Referrals:</b> <code>${userData.referrals}</code>`,
            { parse_mode: 'HTML', ...mainReplyKeyboard() }
        );
        return;
    }
    
    // Handle search options
    const searchMap = {
        "👭👬 Aadhar to Family": "aadhar",
        "📞 Mobile Number": "mobile", 
        "🧍🏻 Aadhar Number": "pak",
        "🚗 Vehicle Number": "vehicle",
        "🇵🇰 Pakistan Mobile": "pak_mobile"
    };
    
    if (searchMap[text]) {
        const userData = await getUserData(user.id);
        if (userData.credits <= 0) {
            await ctx.reply(
                "❌ <b>Insufficient Credits!</b>\n\nYou don't have enough credits to perform this search.",
                { parse_mode: 'HTML', ...mainReplyKeyboard() }
            );
            return;
        }
        
        const searchType = searchMap[text];
        USER_PENDING_TYPE[user.id] = searchType;
        
        const prompts = {
            "aadhar": "Please enter your 12-digit Aadhar number:",
            "mobile": "Please enter your 10-digit mobile number:",
            "pak": "Please enter your 12-digit Aadhar number:",
            "vehicle": "Please enter the Vehicle Number (e.g., UP26R4060):",
            "pak_mobile": "Please enter Pakistan mobile number (10 digits without country code, e.g., 3123456789):"
        };
        
        await ctx.reply(prompts[searchType], mainReplyKeyboard());
        return;
    }
    
    // Handle pending search input
    if (USER_PENDING_TYPE[user.id]) {
        const searchType = USER_PENDING_TYPE[user.id];
        delete USER_PENDING_TYPE[user.id];
        
        // Process the search
        await processSearch(ctx, user.id, searchType, text);
        return;
    }
    
    await ctx.reply("Please select an option from the menu below.", mainReplyKeyboard());
});

// Process search function
async function processSearch(ctx, userId, searchType, query) {
    const chatId = ctx.chat.id;
    
    // Check credits
    const userData = await getUserData(userId);
    if (!userData || userData.credits <= 0) {
        await ctx.reply(
            "❌ <b>Insufficient Credits!</b>\n\nYou don't have enough credits to perform this search.",
            { parse_mode: 'HTML', ...mainReplyKeyboard() }
        );
        return;
    }
    
    // Check blocked numbers
    const blockedResponse = isBlockedNumber(query);
    if (blockedResponse) {
        await ctx.reply(blockedResponse, mainReplyKeyboard());
        return;
    }
    
    // Validation
    if (searchType === "mobile" && cleanNumber(query).length !== 10) {
        await ctx.reply("❌ Invalid mobile number. Must be 10 digits.", mainReplyKeyboard());
        return;
    }
    
    if ((searchType === "aadhar" || searchType === "pak") && cleanNumber(query).length !== 12) {
        await ctx.reply("❌ Invalid Aadhar number. Must be 12 digits.", mainReplyKeyboard());
        return;
    }
    
    // Send loading message
    let loadingText = `⏳ Processing ${searchType} information...`;
    if (searchType === "vehicle") {
        const vehicleClean = cleanVehicleNumber(query);
        loadingText = `⏳ Processing vehicle information for \`${vehicleClean}\`...`;
    }
    
    const loadingMsg = await ctx.reply(loadingText, 
        searchType === "vehicle" ? { parse_mode: 'Markdown' } : {}
    );
    
    // Fetch data
    let data;
    try {
        if (searchType === "vehicle") {
            data = await fetchVehicleInfo(query);
        } else if (searchType === "mobile") {
            const apiUrl = MOBILE_API + encodeURIComponent(cleanNumber(query));
            data = await fetchGenericInfo(apiUrl);
        } else if (searchType === "aadhar") {
            const apiUrl = AADHAR_API + encodeURIComponent(cleanNumber(query));
            data = await fetchGenericInfo(apiUrl);
        } else {
            const apiUrl = PAK_API + encodeURIComponent(cleanNumber(query));
            data = await fetchGenericInfo(apiUrl);
        }
    } catch (error) {
        data = { error: `Failed to fetch data: ${error.message}` };
    }
    
    // Format response
    let finalText;
    switch (searchType) {
        case "vehicle":
            finalText = formatVehicleInfo(data);
            break;
        case "mobile":
            finalText = formatMobileInfo(data);
            break;
        case "aadhar":
            finalText = formatAadharFamilyInfo(data);
            break;
        case "pak_mobile":
            finalText = formatPakMobileInfo(data);
            break;
        default:
            finalText = formatErrorResponse(data, searchType);
    }
    
    // Check if we got valid data
    let hasValidData = false;
    if (searchType === "vehicle") {
        hasValidData = data && !data.error && (data.status || data.data || data.registration_no);
    } else if (searchType === "mobile") {
        hasValidData = data && data.data;
    } else if (searchType === "aadhar") {
        hasValidData = data && data.memberDetailsList;
    } else {
        hasValidData = data && !data.error;
    }
    
    // Update credits and history
    if (hasValidData) {
        await updateUserCredits(userId, -1);
        const updatedUser = await getUserData(userId);
        finalText += `\n\n💰 <b>Credits Left:</b> <code>${updatedUser.credits}</code>`;
        await addSearchHistory(userId, searchType, query, "success");
    } else {
        const updatedUser = await getUserData(userId);
        finalText += `\n\n💰 <b>Credits Left:</b> <code>${updatedUser.credits}</code> (No credit deducted for failed search)`;
        await addSearchHistory(userId, searchType, query, "failed");
    }
    
    finalText += `\n${DEVELOPER_TAG}`;
    
    // Send result
    try {
        await ctx.telegram.editMessageText(
            chatId,
            loadingMsg.message_id,
            null,
            finalText,
            { parse_mode: 'HTML', ...mainReplyKeyboard() }
        );
    } catch (error) {
        await ctx.reply(finalText, { parse_mode: 'HTML', ...mainReplyKeyboard() });
    }
}

// Redeem command
bot.command('redeem', async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
        await ctx.reply("❌ Usage: /redeem <code>");
        return;
    }
    
    const code = args[0];
    const [success, message] = await useRedeemCode(code, userId);
    
    if (success) {
        const userData = await getUserData(userId);
        await ctx.reply(
            `🎉 ${message}\n\n💰 <b>Your Credits Now:</b> <code>${userData.credits}</code>`,
            { parse_mode: 'HTML' }
        );
    } else {
        await ctx.reply(`❌ ${message}`);
    }
});

// Admin commands
bot.command('stats', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.reply("❌ This command is for admin only!");
        return;
    }
    
    const allUsers = await getAllUsers();
    const totalUsers = allUsers.length;
    const bannedUsers = allUsers.filter(user => user.is_banned).length;
    const activeUsers = totalUsers - bannedUsers;
    
    const totalSearches = allUsers.reduce((sum, user) => sum + user.total_searches, 0);
    const totalCredits = allUsers.reduce((sum, user) => sum + user.credits, 0);
    const totalReferrals = allUsers.reduce((sum, user) => sum + user.referrals, 0);
    
    const statsText = 
        `📊 <b>Bot Statistics</b>\n\n` +
        `👥 <b>Users:</b> ${totalUsers}\n` +
        `✅ <b>Active:</b> ${activeUsers}\n` +
        `❌ <b>Banned:</b> ${bannedUsers}\n\n` +
        `🔍 <b>Total Searches:</b> ${totalSearches}\n` +
        `🪙 <b>Total Credits:</b> ${totalCredits}\n` +
        `📤 <b>Total Referrals:</b> ${totalReferrals}\n\n` +
        `🕒 <b>Last Updated:</b> ${new Date().toLocaleString()}`;
    
    await ctx.reply(statsText, { parse_mode: 'HTML' });
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// Express routes for Vercel
app.get('/', (req, res) => {
    res.json({ 
        status: 'Bot is running!',
        bot: 'Rose-X Information Bot',
        developer: '@Ros3_Zii'
    });
});

// Webhook endpoint
app.post('/api/bot', async (req, res) => {
    try {
        await bot.handleUpdate(req.body, res);
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).send('OK');
    }
});

// Health check
app.get('/api/bot', (req, res) => {
    res.json({ 
        status: 'Bot endpoint is working!',
        message: 'Information Bot is running successfully'
    });
});

// Initialize webhook in production
if (process.env.VERCEL_URL) {
    const VERCEL_URL = `https://${process.env.VERCEL_URL}`;
    
    bot.telegram.setWebhook(`${VERCEL_URL}/api/bot`)
        .then(() => console.log('Webhook set successfully'))
        .catch(err => console.error('Error setting webhook:', err));
} else {
    // Development - use polling
    bot.launch().then(() => {
        console.log('🤖 Rose-X Information Bot is running...');
        console.log('📊 Database: Initialized');
        console.log('🔍 Search APIs: Ready');
        console.log('🚀 Bot is ready!');
    });
}

// Export for Vercel
module.exports = app;
