// Sticky Navigation Menu JS Code
let nav = document.querySelector("nav");
let scrollBtn = document.querySelector(".scroll-button a");
console.log(scrollBtn);
let val;
window.onscroll = function() {
  if(document.documentElement.scrollTop > 20){
    nav.classList.add("sticky");
    scrollBtn.style.display = "block";
  }else{
    nav.classList.remove("sticky");
    scrollBtn.style.display = "none";
  }

}

// Side NavIgation Menu JS Code
let body = document.querySelector("body");
let navBar = document.querySelector(".navbar");
let menuBtn = document.querySelector(".menu-btn");
let cancelBtn = document.querySelector(".cancel-btn");
menuBtn.onclick = function(){
  navBar.classList.add("active");
  menuBtn.style.opacity = "0";
  menuBtn.style.pointerEvents = "none";
  body.style.overflow = "hidden";
  scrollBtn.style.pointerEvents = "none";
}
cancelBtn.onclick = function(){
  navBar.classList.remove("active");
  menuBtn.style.opacity = "1";
  menuBtn.style.pointerEvents = "auto";
  body.style.overflow = "auto";
  scrollBtn.style.pointerEvents = "auto";
}

// Side Navigation Bar Close While We Click On Navigation Links
let navLinks = document.querySelectorAll(".menu li a");
for (var i = 0; i < navLinks.length; i++) {
  navLinks[i].addEventListener("click" , function() {
    navBar.classList.remove("active");
    menuBtn.style.opacity = "1";
    menuBtn.style.pointerEvents = "auto";
  });
}


function resetMessageBoxColor() {
  var messageBox = document.getElementById("message");
  messageBox.style.backgroundColor = "beige";
  messageBox.style.color = "green";
}

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();
  resetMessageBoxColor();
  var messageBox = document.getElementById("message");
  messageBox.textContent = "Submitting..";
  messageBox.style.display = "block";
  document.getElementById("submit-button").disabled = true;

  var currentDate = new Date();
  var day = String(currentDate.getDate()).padStart(2, "0");
  var month = String(currentDate.getMonth() + 1).padStart(2, "0");
  var year = currentDate.getFullYear();
  var hours = String(currentDate.getHours()).padStart(2, "0");
  var minutes = String(currentDate.getMinutes()).padStart(2, "0");
  var seconds = String(currentDate.getSeconds()).padStart(2, "0");
  var timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  document.querySelector('input[name="Timestamp"]').value = timestamp;

  var formData = new FormData(this);

  fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
  }).then(function(response) {
      if (response.ok) {
          return response.json();
      } else {
          throw new Error("Failed to submit the form.");
      }
  }).then(function(data) {
      messageBox.textContent = "Message Submitted Successfully!";
      messageBox.style.backgroundColor = "green";
      messageBox.style.color = "beige";
      document.getElementById("submit-button").disabled = false;
      document.getElementById("form").reset();

      setTimeout(function() {
          messageBox.textContent = "";
          messageBox.style.display = "none";
          // Hide additional fields if necessary
          var numberField = document.querySelector(".phoneField");
          if (numberField) numberField.style.display = "none";
          var supportField = document.querySelector(".supportfield");
          if (supportField) supportField.style.display = "none";
      }, 2000);
  }).catch(function(error) {
      console.error(error);
      messageBox.textContent = "An error occurred while submitting the form.";
  });
});

function handleCVFile() {
  // Define the file URL
  var fileUrl = 'Assets/MBK_CV.pdf'; // Replace this with the actual file URL

  // Check if the user is on a mobile device
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
      // If user is on a mobile device, initiate download
      var a = document.createElement('a');
      a.href = fileUrl;
      a.download = 'MBK_CV.pdf'; // Set the desired filename here
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  } else {
      // If user is on a desktop, open in a new tab/window
      window.open(fileUrl, '_blank');
  }
}



function HireMeLink() {
    window.open('https://www.linkedin.com/in/muhammad-bin-khalid-89711b25b', '_blank'); // Replace with your target URL
  }



function openProjectPage(id) {
    window.open('https://mbktechstudio.com/Project/#' + id, '_blank'); // Replace with your target URL
  }
 


  async function getTermsVersionFromPrivacyPolicy() {
    try {
        const response = await fetch('https://privacy.mbktechstudio.com/');
        const html = await response.text();
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, 'text/html');
        let termsVersionElement = doc.getElementById('termVersionPrivacy');
        if (termsVersionElement) {
            return termsVersionElement.innerText.split(': ')[1];
        } else {
            throw new Error('Element with id "termVersionPrivacy" not found.');
        }
    } catch (err) {
        console.error('Failed to fetch or parse the privacy policy page:', err);
        return null;
    }
}

async function AskForCookieConsent() {
    try {
        const response = await fetch('https://mbktechstudio.com/Assets/cookie.html');
        const html = await response.text();
        document.getElementById('cookie').innerHTML = html;
        // Await the result of getTermsVersionFromPrivacyPolicy
        const termsVersion = await getTermsVersionFromPrivacyPolicy();
        // Check the cookie with the retrieved terms version
        checkCookie(termsVersion);
    } catch (err) {
        console.error('Error in AskForCookieConsent:', err);
    }
}

async function SaveCookie(){
    try{
        const termsVersion = await getTermsVersionFromPrivacyPolicy();
        setCookie('agreed', termsVersion, 365);
        hideOverlay();
    }
    catch(err){
        console.error('Error in SaveCookie:', err);
    }
}

function checkCookie(currentVersion) {
    const agreedVersion = getCookie('agreed');
    if (agreedVersion === currentVersion) {
        hideOverlay();
    }
    else{
        document.getElementById('cookieNotice').style.display = 'block';
    }
}

function hideOverlay() {
    document.getElementById('cookieNotice').style.display = 'none';
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    var domain = "; domain=.mbktechstudio.com";
    document.cookie = name + "=" + (value || "") + expires + "; path=/" + domain;
}

function getCookie(name) {
    var nameEQ = name + "=";
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

function hideCookieNotice() {
    document.getElementById('cookieNotice').style.display = 'none';
}