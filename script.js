class WeatherDashboard {
    constructor() {
        this.API_KEY = '84ba262d833dd21c8031f255c6f2747b'; 
        this.BASE_URL = 'https://api.openweathermap.org/data/2.5';
        
        // DOM elements
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.currentWeather = document.getElementById('currentWeather');
        this.forecast = document.getElementById('forecast'); //next 5-day forecast
        this.savedLocationsContainer = document.getElementById('savedLocationsContainer');
        
        // Initialize the dashboard
        this.init(); //to start setting up event listeners and loading saved data
    }s

    init() {
        // Set up event listeners
        this.searchBtn.addEventListener('click', () => this.handleSearch()); //when click on search it runs the handle search
        this.locationBtn.addEventListener('click', () => this.getCurrentLocation()); //when clicks use my location, This would typically use the browser's geolocation API
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { //when we press enter, (e) is the event object containing information about the key press
                this.handleSearch();
            }
        });
        
        // Load saved locations from localStorage
        this.loadSavedLocations(); //it retrieves previously searched cities from browser storage
        
        // Load last searched city if available
        const lastCity = localStorage.getItem('lastSearchedCity'); //Checks browser storage for the last city that was searched
        if (lastCity) { //if found the saved location
            this.searchWeather(lastCity); //Automatically searches for that city's weather
        }
    }

    // Handle search button click
    async handleSearch() { //it perform asynchronous operations to call API, The weather search involves API calls that take time.
        const city = this.cityInput.value.trim(); //whatever we typed it, removes any extra spaces from the beginning and end.
        
        if (!city) { //Checks if city is entered or not 
            this.showError('Please enter a city name'); //If the input is empty, it shows an error message and stops execution
            return;
        }
        
        await this.searchWeather(city); //Pauses execution until searchWeather() completes, waits for the weather data to be fetched and displayed
        this.cityInput.value = ''; // Clear input after search
    }

    // Get user's current location using geolocation API
    getCurrentLocation() {
        if (!navigator.geolocation) { //A browser API that provides location services
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords; //Contains the location data, Extracts latitude and longitude values
                await this.searchWeatherByCoords(latitude, longitude); //Calls a method to get weather using coordinates instead of city name
            },
            (error) => { //error types explination
                this.hideLoading();
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        this.showError('Location access denied by user');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        this.showError('Location information is unavailable');
                        break;
                    case error.TIMEOUT:
                        this.showError('Location request timed out');
                        break;
                    default:
                        this.showError('An unknown error occurred while retrieving location');
                        break;
                }
            }
        );
    }
    // Search weather by city name
    async searchWeather(city) {
        try {
            this.showLoading();
            this.hideError();
            
            // Fetch current weather
            const currentWeatherUrl = `${this.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
            const currentResponse = await fetch(currentWeatherUrl);
            
            if (!currentResponse.ok) { //if the location correctly fetched it throws successful output
                throw new Error(`City not found: ${city}`); //if not it throws error
            }
            
            const currentData = await currentResponse.json(); //Converts the API response from JSON text into a JavaScript object, await waits for the parsing to complete
            
            // Fetch 5-day forecast
            const forecastUrl = `${this.BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json(); //Parse the JSON response converts into JavaScript
            
            // Display the weather data(Result)
            this.displayCurrentWeather(currentData);
            this.displayForecast(forecastData);
            
            // Save to localStorage
            this.saveLocation(city);
            localStorage.setItem('lastSearchedCity', city); //Remembers this as the most recent search
            
        } catch (error) { //Handles any errors that occurs
            console.error('Error fetching weather data:', error);
            this.showError(error.message || 'Failed to fetch weather data. Please try again.');
        } finally { //Always runs whether the search succeeds or fails
            this.hideLoading();
        }
    }
// Search weather by coordinates (for geolocation)
    async searchWeatherByCoords(lat, lon) {
        try {
            this.showLoading();
            this.hideError();
            
            // Fetch current weather by coordinates
            const currentWeatherUrl = `${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
            const currentResponse = await fetch(currentWeatherUrl);
            const currentData = await currentResponse.json();
            
            // Fetch 5-day forecast by coordinates
            const forecastUrl = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();
            
            // Display the weather data
            this.displayCurrentWeather(currentData);
            this.displayForecast(forecastData);
            
            // Save location
            this.saveLocation(currentData.name);
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            this.showError('Failed to fetch weather data for your location');
        } finally {
            this.hideLoading();
        }
    }

    // Display current weather information
    displayCurrentWeather(data) {
        // Extract data from API response
        const {
            name: cityName,
            main: { temp, feels_like, humidity, pressure },
            weather: [{ description, icon }],
            wind: { speed }
        } = data;

        // Update DOM elements with weather data
        document.getElementById('cityName').textContent = cityName;
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('currentTemp').textContent = `${Math.round(temp)}°C`; //math.round removes the decimals to give readable output
        document.getElementById('weatherDescription').textContent = description; //text description
        document.getElementById('feelsLike').textContent = `${Math.round(feels_like)}°C`;
        document.getElementById('humidity').textContent = `${humidity}%`; 
        document.getElementById('windSpeed').textContent = `${Math.round(speed * 3.6)} km/h`;
        document.getElementById('pressure').textContent = `${pressure} hPa`;
        
        // Set weather icon
        const weatherIcon = document.getElementById('weatherIcon');
        weatherIcon.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        weatherIcon.alt = description;
        
        // Show the current weather section
        this.currentWeather.style.display = 'block';
    }

    // Display 5-day forecast
    displayForecast(data) {
        const forecastContainer = document.getElementById('forecastContainer');
        forecastContainer.innerHTML = ''; // Clear previous forecast
        
        // Process forecast data - get one forecast per day (around noon)
        const dailyForecasts = this.processForecastData(data.list);
        
        dailyForecasts.forEach(forecast => {
            const forecastCard = this.createForecastCard(forecast);
            forecastContainer.appendChild(forecastCard);
        });
        
        // Show the forecast section
        this.forecast.style.display = 'block';
    }

    // Process forecast data to get daily forecasts, Keeps track of which dates we've already processed, contain 5 items per day
    //Sets automatically prevent duplicates and have faster lookups
    processForecastData(forecastList) {
        const dailyForecasts = []; //Stores the final daily forecast objects
        const processedDates = new Set();
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000); //item.dt: Unix timestamp in seconds(it converts to milliseconds)
            const dateString = date.toDateString(); //Converts to readable format of date
            
            // Get one forecast per day (preferably around noon)
            if (!processedDates.has(dateString) && dailyForecasts.length < 5) {
                processedDates.add(dateString);
                dailyForecasts.push({
                    date: date, //Full Date object for later formatting(dd-mm-yyyy)
                    temp_max: Math.round(item.main.temp_max),
                    temp_min: Math.round(item.main.temp_min),
                    description: item.weather[0].description, //Get weather description from first weather
                    icon: item.weather[0].icon //Get icon code for weather display
                });
            }
        });
        
        return dailyForecasts;
    }

    // Create forecast card element- A complete HTML card element ready to be displayed on the webpage.
    createForecastCard(forecast) {
        const card = document.createElement('div'); //Creates a new HTML <div> element in memory
        card.className = 'forecast-card'; //Adds CSS class for styling
        
        const dayName = forecast.date.toLocaleDateString('en-US', { weekday: 'short' }); //its visible like long-monday, short-mon, narrow- m
        const monthDay = forecast.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
        
        card.innerHTML = `
            <h4>${dayName}</h4>
            <p>${monthDay}</p>
            <img src="https://openweathermap.org/img/wn/${forecast.icon}.png" alt="${forecast.description}">
            <p>${forecast.description}</p>
            <div class="forecast-temps">
                <span class="temp-high">${forecast.temp_max}°</span>
                <span class="temp-low">${forecast.temp_min}°</span>
            </div>
        `;
        
        return card; //A complete DOM element ready to be added to the webpage.
    }

    // Save location to localStorage
    saveLocation(cityName) {
        let savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || []; //String from localStorage or null if not found
        //Converts JSON string back to JavaScript array
        //Creates empty array instead of null(|| [] fallback)

        // Avoid duplicates
        if (!savedLocations.includes(cityName)) { 
            savedLocations.unshift(cityName); // Add to beginning of an array
            
            // Limit to 5 saved locations
            if (savedLocations.length > 5) {
                savedLocations = savedLocations.slice(0, 5); //it follows FIFO principle: New locations push old ones out
            }
            
            localStorage.setItem('savedLocations', JSON.stringify(savedLocations)); //localstorage requirement: can only store strings
            this.displaySavedLocations(); //User sees the new location added instantly
        }
    }

    // Load and display saved locations
    loadSavedLocations() { //load the saved location
        this.displaySavedLocations(); //display the saved loaction
    }

    // Display saved locations
    displaySavedLocations() {
        const savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];
        
        //Tells users what to do next
        if (savedLocations.length === 0) {
            this.savedLocationsContainer.innerHTML = '<p class="no-locations">No saved locations yet. Search for a city to get started!</p>';
            return;
        }
        
        this.savedLocationsContainer.innerHTML = ''; //removes old location and adds new location
        
        savedLocations.forEach(location => {
            const locationTag = document.createElement('div'); // to create each container for each location
            locationTag.className = 'location-tag';
            locationTag.innerHTML = `
                <span>${location}</span>
                <button class="remove-btn" onclick="weatherDashboard.removeLocation('${location}')">&times;</button>
            `;
            
            // Add click event to search for this location
            locationTag.querySelector('span').addEventListener('click', () => { //Captures the current location value, click- it tiggers the specified location "span"
                this.searchWeather(location);
            });
            
            this.savedLocationsContainer.appendChild(locationTag); //Adds the complete location tag to the container
        });
    }

    // Remove location from saved locations
    removeLocation(cityName) { //Location is removed from the saved list
        let savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || []; //Retrieve the current list from localStorage, Fallback: Use empty array if no data exists
        savedLocations = savedLocations.filter(location => location !== cityName); //Creates a new array with elements that saved again
        localStorage.setItem('savedLocations', JSON.stringify(savedLocations)); //setItem(): Save the updated list
        this.displaySavedLocations(); //User sees the change instantly
    }

    // Utility methods for UI feedback
    showLoading() {
        this.loadingSpinner.style.display = 'block'; //Makes the loading animation visible
        this.currentWeather.style.display = 'none'; //Prevents old data from showing during new requests
        this.forecast.style.display = 'none'; //Clears the 5-day forecast display
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none'; //Makes the loading animation disappear
    }

    showError(message) {
        this.errorMessage.textContent = message; //Shows the specific error message passed in
        this.errorMessage.style.display = 'block'; //Makes it visible to the user
        
        // Auto-hide error after 5 seconds
        setTimeout(() => { 
            this.hideError(); //Error disappears without user action
        }, 5000);
    }

    hideError() {
        this.errorMessage.style.display = 'none'; //Makes error element invisible automatically
    }
}

// Initialize the weather dashboard when the page loads
let weatherDashboard; //Global variable- Accessible from anywhere in the application
document.addEventListener('DOMContentLoaded', () => { //All HTML elements exist and can be accessed
    weatherDashboard = new WeatherDashboard(); //shows the new content which is changed
});