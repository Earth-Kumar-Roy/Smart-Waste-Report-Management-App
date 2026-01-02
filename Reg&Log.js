
// Temp storage for OTPs
var otpStore = {}

// ============ VALIDATIONS ============

// Email format check
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Check if email already exists
function checkEmail(email) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REG_SHEET);
  const data = sheet.getRange(2, 2, sheet.getLastRow(), 1).getValues().flat();
  return data.includes(email);
}

// Check username availability
function checkUsername(username) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(REG_SHEET);
  const data = sheet.getRange(2, 3, sheet.getLastRow(), 1).getValues().flat();
  return !data.includes(username);   // TRUE = available
}


function sendOtp(email) {
  if (!isValidEmail(email)) {
    return { success: false, msg: "Invalid email format" };
  }

  if (checkEmail(email)) {
    return { success: false, msg: "Email already registered" };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Cache OTP for 10 minutes
  const cache = CacheService.getUserCache();
  cache.put(email, otp, 600); // 10 minutes

  const subject = "OTP Verification – Smart Waste Report Management App";

  const body =
    "Hello,\n\n" +
    "You have initiated worker registration for the Smart Waste Report Management App.\n\n" +
    "Your One-Time Password (OTP) is:\n\n" +
    otp + "\n\n" +
    "This OTP is valid for 10 minutes. Please do not share it with anyone.\n\n" +
    "If you did not initiate this request, you can safely ignore this email.\n\n" +
    "Regards,\n" +
    "Smart Waste Report Management App\n" +
    "Worker Registration Department & Team";

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    name: "Smart Waste Report Management App"
  });

  return { success: true, msg: "OTP sent successfully" };
}



function verifyOtp(email, otp) {
  const cache = CacheService.getUserCache();
  const storedOtp = cache.get(email);

  if (storedOtp && storedOtp === otp) {
    // OTP matched → clear it so it can't be reused
    cache.remove(email);
    return { success: true, msg: "User Authenticated" };
  }
  return { success: false, msg: "Invalid or Expired OTP" };
}

function createAccount(name, email, phone, region, username, password) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const regSheet = ss.getSheetByName(REG_SHEET);

  if (!checkUsername(username)) {
    return { success: false, msg: "Username already exists" };
  }

  // Append worker registration data
  regSheet.appendRow([
    name,
    email,
    phone,
    region,
    username,
    password
  ]);

  return { success: true, msg: "Worker account created successfully" };
}




// Send OTP for Forgot Password
function forgotPassword(email) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REG_SHEET);

  // Columns: Name | Email | Phone | Region | Username | Password
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][1] === email) { // Email column
      const username = data[i][4]; // Username column
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP for 10 minutes
      const cache = CacheService.getUserCache();
      cache.put(email, otp, 600);

      const subject = "Password Reset OTP – Smart Waste Report Management App";

      const body =
        "Hello " + username + ",\n\n" +
        "A password reset request was initiated for your worker account on the Smart Waste Report Management App.\n\n" +
        "Your One-Time Password (OTP) is:\n\n" +
        otp + "\n\n" +
        "This OTP is valid for 10 minutes. Please do not share it with anyone.\n\n" +
        "If you did not request a password reset, you can safely ignore this email.\n\n" +
        "Regards,\n" +
        "Smart Waste Report Management App\n" +
        "Worker Registration Department & Team";

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        name: "Smart Waste Report Management App"
      });

      return { success: true, msg: "OTP sent to registered email address" };
    }
  }

  return { success: false, msg: "No account found with this email" };
}


// Verify OTP for Forgot Password
function ForgotPassVerOTP(email, otpInput) {
  const cache = CacheService.getUserCache();
  const storedOtp = cache.get(email);

  if (storedOtp && storedOtp === otpInput) {
    cache.remove(email); // OTP matched → remove it
    return { success: true, msg: "OTP verified" };
  }
  return { success: false, msg: "Invalid or Expired OTP" };
}

// Change Password
function changePassword(email, newPass) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REG_SHEET);
  if (!sheet) return { success: false, msg: "Sheet not found" };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, msg: "No data found" };

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowEmail = String(data[i][1] || "").trim();

    if (rowEmail.toLowerCase() === email.toLowerCase()) {
      // Password column = 6
      sheet.getRange(i + 2, 6).setValue(newPass);
      return { success: true, msg: "Password changed successfully" };
    }
  }

  return { success: false, msg: "Account not found" };
}


/**
 * Verifies user login with username or email.
 * Returns { valid: true, username: "verifiedUsername" } on success.
 */
// Registration columns:
// A Name | B Email | C Phone | D Region | E Username | F Password

function loginUser(usernameOrEmail, password) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REG_SHEET);
  if (!sheet) return { valid: false };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const email = String(row[1] || "").trim();
    const region = String(row[3] || "").trim();   // COL D
    const username = String(row[4] || "").trim(); // COL E
    const pass = String(row[5] || "").trim();     // COL F

    if (
      usernameOrEmail.toLowerCase() === email.toLowerCase() ||
      usernameOrEmail.toLowerCase() === username.toLowerCase()
    ) {
      if (password === pass) {
        return {
          valid: true,
          username: username,
          region: region
        };
      }
      return { valid: false };
    }
  }

  return { valid: false };
}


