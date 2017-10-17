function toggleUpdatesForProblem(problemID) {
    console.log(problemID);

    Array.from(document.getElementById('updates').children).forEach(function (update) {
        update.style.display = 'none';
    });

    Array.from(document.getElementsByClassName('updatesForProblem' + problemID)).forEach(function (update) {
        update.style.display = 'block';
    });

    document.getElementById('updates').scrollTop = document.getElementById('updates').scrollHeight;

    document.getElementById('inputChat' + problemID).style.display = 'block';
}
