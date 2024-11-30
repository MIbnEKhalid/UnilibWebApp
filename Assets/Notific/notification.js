function opengitrepo() {
    window.open("https://github.com/mibnekhalid/UnilibUnity", "_blank");
}

/**
 * Hide the notification and set a cookie to remember the state.
 */
function hideNotice() {
    document.getElementById("Notication").style.display = "none"; // Show notification
    const expireTime = Date.now() + 18 * 3600000; // 18 hours in milliseconds
    document.cookie = `hideNotice=true;expires=${new Date(expireTime).toUTCString()};path=/`;
    document.cookie = `hideNoticeExpires=${expireTime};expires=${new Date(expireTime).toUTCString()};path=/`;
    console.log("Notification hidden until:", new Date(expireTime));
}

/**
 * Fetch the value of a specific cookie.
 * @param {string} cookieName - The name of the cookie.
 * @returns {string|null} - The value of the cookie or null if not found.
 */
function getCookie(cookieName) {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === cookieName) return value;
    }
    return null;
}

/**
 * Show the notification content by fetching the HTML file.
 */
async function DisplayNotification() {
    try {
        const response = await fetch("https://unilib.mbktechstudio.com/Assets/Notific/notification.html");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        document.getElementById("notif").innerHTML = html;
        document.getElementById("Notication").style.display = "block"; // Show notification
        console.log("Notification displayed successfully.");
    } catch (err) {
        console.error("Error in DisplayNotification:", err);
    }
}

/**
 * Check the cookie and display the notification if needed.
 */
async function initNotification() {
    const hideNotice = getCookie("hideNotice");
    const hideNoticeExpires = parseInt(getCookie("hideNoticeExpires"), 10);

    if (hideNotice === "true" && hideNoticeExpires) {
        const timeLeft = hideNoticeExpires - Date.now();
        if (timeLeft > 0) {
            console.log(`Notification is hidden. Time left: ${Math.ceil(timeLeft / 3600000)} hours`);
            return; // Do not display notification
        } else {
            // Clear expired cookies
            document.cookie = "hideNotice=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
            document.cookie = "hideNoticeExpires=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
        }
    }

    // Display the notification if no valid hideNotice cookie is present
    await DisplayNotification();
}

// Initialize the notification check on page load
window.onload = initNotification;