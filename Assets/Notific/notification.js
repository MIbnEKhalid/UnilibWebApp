function opengitrepo() {
    window.open("https://github.com/mibnekhalid/UnilibUnity", "_blank");
}

function hideNotice() {
    document.getElementById("Notication").style.display = "none";
    var now = new Date();
    var time = now.getTime();
    var expireTime = time + 18 * 3600000; // 18 hours in milliseconds
    now.setTime(expireTime);
    document.cookie = "hideNotice=true;expires=" + now.toUTCString() + ";path=/";
}

window.onload = function() {
    var cookies = document.cookie.split("; ");
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].split("=");
        if (cookie[0] === "hideNotice" && cookie[1] === "true") {
            document.getElementById("Notication").style.display = "none";
        }
    }
};
