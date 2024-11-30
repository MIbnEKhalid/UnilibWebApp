function opengitrepo() {
    window.open("https://github.com/mibnekhalid/UnilibUnity", "_blank");
}

function hideNotice() {
    document.getElementById("Notication").style.display = "none";
}
function setHideNoticeTimestamp() {
    const now = new Date().getTime();
    localStorage.setItem('hideNoticeTimestamp', now);
}

function shouldShowNotice() {
    const hideNoticeTimestamp = localStorage.getItem('hideNoticeTimestamp');
    if (!hideNoticeTimestamp) {
        return true;
    }
    const now = new Date().getTime();
    const eighteenHoursInMillis = 18 * 60 * 60 * 1000;
    return now - hideNoticeTimestamp > eighteenHoursInMillis;
}

document.addEventListener('DOMContentLoaded', (event) => {
    if (shouldShowNotice()) {
        document.getElementById("Notication").style.display = "block";
    }
}); 
