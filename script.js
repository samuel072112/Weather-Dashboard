class WeatherDashboard {
    constructor() {
        // API configuration - You'll need to get a free API key from OpenWeatherMap
        this.API_KEY = '84ba262d833dd21c8031f255c6f2747b'; 
        this.BASE_URL = 'https://api.openweathermap.org/data/2.5';
        
        // DOM elements
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.currentWeather = document.getElementById('currentWeather');
        this.forecast = document.getElementById('forecast');
        this.savedLocationsContainer = document.getElementById('savedLocationsContainer');
        
        // Initialize the dashboard
        this.init();
    }

    init() {
        // Set up event listeners
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.locationBtn.addEventListener('click', () => this.getCurrentLocation());
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        
        // Load saved locations from localStorage
        this.loadSavedLocations();
        
        // Load last searched city if available
        const lastCity = localStorage.getItem('lastSearchedCity');
        if (lastCity) {
            this.searchWeather(lastCity);
        }
    }

    // Handle search button click
    async handleSearch() {
        const city = this.cityInput.value.trim();
        
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }
        
        await this.searchWeather(city);
        this.cityInput.value = ''; // Clear input after search
    }

    // Get user's current location using geolocation API
    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        this.showLoading();
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await this.searchWeatherByCoords(latitude, longitude);
            },
            (error) => {
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
            
            if (!currentResponse.ok) {
                throw new Error(`City not found: ${city}`);
            }
            
            const currentData = await currentResponse.json();
            
            // Fetch 5-day forecast
            const forecastUrl = `${this.BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();
            
            // Display the weather data
            this.displayCurrentWeather(currentData);
            this.displayForecast(forecastData);
            
            // Save to localStorage
            this.saveLocation(city);
            localStorage.setItem('lastSearchedCity', city);
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            this.showError(error.message || 'Failed to fetch weather data. Please try again.');
        } finally {
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
        document.getElementById('currentTemp').textContent = `${Math.round(temp)}°C`;
        document.getElementById('weatherDescription').textContent = description;
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

    // Process forecast data to get daily forecasts
    processForecastData(forecastList) {
        const dailyForecasts = [];
        const processedDates = new Set();
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateString = date.toDateString();
            
            // Get one forecast per day (preferably around noon)
            if (!processedDates.has(dateString) && dailyForecasts.length < 5) {
                processedDates.add(dateString);
                dailyForecasts.push({
                    date: date,
                    temp_max: Math.round(item.main.temp_max),
                    temp_min: Math.round(item.main.temp_min),
                    description: item.weather[0].description,
                    icon: item.weather[0].icon
                });
            }
        });
        
        return dailyForecasts;
    }

    // Create forecast card element
    createForecastCard(forecast) {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        
        const dayName = forecast.date.toLocaleDateString('en-US', { weekday: 'short' });
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
        
        return card;
    }

    // Save location to localStorage
    saveLocation(cityName) {
        let savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];
        
        // Avoid duplicates
        if (!savedLocations.includes(cityName)) {
            savedLocations.unshift(cityName); // Add to beginning
            
            // Limit to 5 saved locations
            if (savedLocations.length > 5) {
                savedLocations = savedLocations.slice(0, 5);
            }
            
            localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
            this.displaySavedLocations();
        }
    }

    // Load and display saved locations
    loadSavedLocations() {
        this.displaySavedLocations();
    }

    // Display saved locations
    displaySavedLocations() {
        const savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];
        
        if (savedLocations.length === 0) {
            this.savedLocationsContainer.innerHTML = '<p class="no-locations">No saved locations yet. Search for a city to get started!</p>';
            return;
        }
        
        this.savedLocationsContainer.innerHTML = '';
        
        savedLocations.forEach(location => {
            const locationTag = document.createElement('div');
            locationTag.className = 'location-tag';
            locationTag.innerHTML = `
                <span>${location}</span>
                <button class="remove-btn" onclick="weatherDashboard.removeLocation('${location}')">&times;</button>
            `;
            
            // Add click event to search for this location
            locationTag.querySelector('span').addEventListener('click', () => {
                this.searchWeather(location);
            });
            
            this.savedLocationsContainer.appendChild(locationTag);
        });
    }

    // Remove location from saved locations
    removeLocation(cityName) {
        let savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];
        savedLocations = savedLocations.filter(location => location !== cityName);
        localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
        this.displaySavedLocations();
    }

    // Utility methods for UI feedback
    showLoading() {
        this.loadingSpinner.style.display = 'block';
        this.currentWeather.style.display = 'none';
        this.forecast.style.display = 'none';
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Initialize the weather dashboard when the page loads
let weatherDashboard;
document.addEventListener('DOMContentLoaded', () => {
    weatherDashboard = new WeatherDashboard();
});