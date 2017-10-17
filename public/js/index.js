function enableLogIn(e) {
    document.getElementById("logInForm").style.display = 'block';
    document.getElementById("passResetButton").style.display = 'block';
    document.getElementById("signUpForm").style.display = 'none';
}

function enableSignUp(e) {
    document.getElementById("logInForm").style.display = 'none';
    document.getElementById("passResetButton").style.display = 'none';
    document.getElementById("signUpForm").style.display = 'block';
}
