
function showMessage(message, heading) {
    document.querySelector(".messageWindow h1").innerText = heading;
    document.querySelector(".messageWindow p").innerHTML = message;
    document.querySelector(".blurWindow").classList.add("active");
    document.body.classList.add("blur-active");
}

function hideMessage() {
    const blurWindow = document.querySelector(".blurWindow");
    blurWindow.classList.add("fade-out");
    setTimeout(() => {
        blurWindow.classList.remove("active", "fade-out");
        document.body.classList.remove("blur-active");
    }, 500);
}