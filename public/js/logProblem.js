const key = "AIzaSyBcziQIFpiDToT1qEg9jEBzpGyzRgmb_94";

function getAddress(position) {
    var address;

    var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + position.coords.latitude + "," + position.coords.longitude + "&key=" + key;

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var response = JSON.parse(xhttp.responseText);
            console.log(response);

            console.log(response.results[0].address_components[0].long_name);
            console.log(response.results[0].address_components[1].long_name);
            console.log(response.results[0].address_components[2].long_name);
            console.log(response.results[0].address_components[3].long_name);
            console.log(response.results[0].address_components[4].long_name);
            console.log(response.results[0].address_components[5].long_name);
            console.log(response.results[0].address_components[6].long_name);
            console.log(response.results[0].address_components[7].long_name);

            console.log(response.results[0].formatted_address);

            document.getElementById("inputAddress").value = response.results[0].formatted_address;
            /*
                        document.getElementById("inputStreet").value = response.results[0].address_components[1].long_name;
                        document.getElementById("inputUnit").value = response.results[0].address_components[0].long_name;
                        document.getElementById("inputCity").value = response.results[0].address_components[2].long_name;
                        document.getElementById("inputState").value = response.results[0].address_components[response.results[0].address_components.length - 3].long_name;
                        document.getElementById("inputZip").value = response.results[0].address_components[response.results[0].address_components.length - 1].long_name;
                        document.getElementById("inputCountry").value = response.results[0].address_components[response.results[0].address_components.length - 2].long_name;*/
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(getAddress);
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}

getLocation();
