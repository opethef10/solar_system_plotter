const gifCheckbox = document.getElementById('gif');
const durationInput = document.getElementById('duration');
const intervalInput = document.getElementById('interval');
const geocentricCheckbox = document.getElementById('geocentric');
const dateInput = document.getElementById('date');

const defaultDate = new Date().toISOString().split('T')[0];
const gif_refresh_milliseconds = 50; // Timeout in milliseconds
const api_root = ''

dateInput.value = defaultDate;

function getLocalStorageSize() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage.getItem(key).length * 2; // Each character is 2 bytes
        }
    }
    return totalSize;
}

function ensureEnoughSpace(requiredSize) {
    const maxSize = 5 * 1024 * 1024; // 5MB (adjust as needed)
    let currentSize = getLocalStorageSize();

    // If the required size exceeds the maximum allowed size, throw an error
    if (requiredSize > maxSize) {
        throw new Error('Data is too large to store in localStorage');
    }

    // If there's not enough space, clear older entries
    if (currentSize + requiredSize > maxSize) {
        const entries = [];
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                const timestamp = JSON.parse(value).timestamp; // Assume each value has a timestamp
                entries.push({ key, size: value.length * 2, timestamp });
            }
        }

        // Sort entries by timestamp (oldest first)
        entries.sort((a, b) => a.timestamp - b.timestamp);

        // Remove the oldest entries until there's enough space
        while (currentSize + requiredSize > maxSize && entries.length > 0) {
            const oldestEntry = entries.shift(); // Get the oldest entry
            localStorage.removeItem(oldestEntry.key); // Remove it from localStorage
            currentSize -= oldestEntry.size; // Update the current size
        }
    }
}

function addToCache(queryKey, data) {
    const value = JSON.stringify({
        data, // The actual data
        timestamp: Date.now(), // Current timestamp
    });

    const requiredSize = value.length * 2; // Calculate the size of the new data

    // Ensure there's enough space in localStorage
    ensureEnoughSpace(requiredSize);

    // Store the data in localStorage
    localStorage.setItem(queryKey, value);
}

function manageCacheSize() {
    const maxSize = 5 * 1024 * 1024; // 5MB
    let currentSize = 0;

    // Calculate current cache size
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            currentSize += localStorage.getItem(key).length * 1; // Each character is 2 bytes
        }
    }

    debugger;
    // If cache size exceeds the limit, remove the oldest entries
    if (currentSize > maxSize) {
        const keys = Object.keys(localStorage);
        while (currentSize > maxSize && keys.length > 0) {
            const oldestKey = localStorage.key(0)
            const itemSize = localStorage.getItem(oldestKey).length * 1;
            localStorage.removeItem(oldestKey);
            currentSize -= itemSize;
        }
    }
}


function toggleGifInputs() {
    const isGifChecked = gifCheckbox.checked;
    durationInput.disabled = !isGifChecked;
    intervalInput.disabled = !isGifChecked;
}

gifCheckbox.addEventListener('change', toggleGifInputs);
toggleGifInputs();

const plotContainer = document.getElementById('plot');
const errorText = document.getElementById('error-text');


let isPlotting = false; // Flag to track if plotting is in progress
let stopPlotting = false; // Flag to track if plotting is in progress
const PlotManager = {
    isPlotting: false,
    intervalId: null, // Store the interval ID for dynamic plotting
};
const queryCache = {}; // Cache the query results to avoid duplicate requests
function renderPlot(data, geocentric) {
    if (data.length === 1) {
        renderPlotlyChart(data[0], geocentric);
    } else if (data.length > 1) {
        let index = 0;
        isPlotting = true;
        stopPlotting = false;
        PlotManager.intervalId = setInterval(() => {
            if (index >= data.length) {
                clearInterval(PlotManager.intervalId);
                PlotManager.isPlotting = false;
                return;
            }
            renderPlotlyChart(data[index], geocentric);
            index++;
        }, gif_refresh_milliseconds);
    }
    errorText.style.display = 'none';
}
// Function to fetch JSON data and render the Plotly chart
function fetchDataAndRenderPlot() {
    const date = dateInput.value;
    const geocentric = geocentricCheckbox.checked;
    const gif = document.getElementById('gif').checked;
    const duration = durationInput.value;
    const interval = intervalInput.value;

    // Stop any existing plotting process
    if (PlotManager.isPlotting) {
        clearInterval(PlotManager.intervalId); // Stop the existing interval
        PlotManager.isPlotting = false; // Reset the flag
    }

    PlotManager.isPlotting = true;

    const queryKey = gif ? `${date}-${gif}-${duration}-${interval}` : `${date}`;

    // Check if data is available in localStorage
    const cachedData = localStorage.getItem(queryKey);
    if (cachedData) {
        const data = JSON.parse(cachedData);
        const dataToPlot = data.data;
        renderPlot(dataToPlot, geocentric);
        return;
    }

    const fetchInput = gif
        ? `${api_root}/api?date=${date}&gif=${gif}&duration=${duration}&interval=${interval}`
        : `${api_root}/api?date=${date}`;

    // Fetch JSON data from the Flask backend
    fetch(fetchInput)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error);
                });
            }
            return response.json();
        })
        .then(data => {
            // Try to store the data in localStorage
            try {
                addToCache(queryKey, data);
            } catch (error) {
                console.error('Error storing data in localStorage:', error);
                errorText.textContent = 'Error: Data is too large to store in cache.';
                errorText.style.display = 'block';
            }
            renderPlot(data, geocentric);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            errorText.textContent = 'Error fetching data: ' + error.message;
            errorText.style.display = 'block';
        });
}

    // Calculate image positions and create image objects
    // const images = data.planets.map(planet => {
    //     const radius = geocentric ? planet.geo_radius : planet.radius;
    //     const label = geocentric ? planet.geocentric_label : planet.heliocentric_label;
    //     const angle = geocentric ? planet.ra : planet.hlon;
    //     const angleRadians = angle; // Angle is already in radians
    //     var xScale = 0.9*600/600;
    //     var yScale = xScale * 1.25;
    //
    //     // Normalize the radius to match the polar chart's range
    //     const normalizedRadius = radius / 20; // Assuming the radial axis range is [0, 10]
    //
    //     return {
    //         source: `/static/planets/${label.toLowerCase()}.png`, // Path to planet image
    //         xref: 'paper', // Use 'paper' reference for polar charts
    //         yref: 'paper', // Use 'paper' reference for polar charts
    //         x: 0.5 + xScale * normalizedRadius * Math.cos(angleRadians), // Normalize radius and convert to Cartesian
    //         y: 0.5 + yScale * normalizedRadius * Math.sin(angleRadians), // Normalize radius and convert to Cartesian
    //         sizex: 0.05, // Image width (relative to plot size)
    //         sizey: 0.05, // Image height (relative to plot size)
    //         xanchor: 'center', // Center the image horizontally
    //         yanchor: 'middle' // Center the image vertically
    //     };
    // });
function renderPlotlyChart(data, geocentric) {
    // Create individual traces for each planet
    const traces = data.planets.map(planet => {
        const radius = geocentric ? planet.geo_radius : planet.radius;
        const angle = geocentric ? planet.ra : planet.hlon;
        const angleDegrees = angle * (180 / Math.PI); // Convert radians to degrees
        const label = geocentric ? planet.geocentric_label : planet.heliocentric_label;

        return {
            r: [radius], // Single radius value for the planet
            theta: [angleDegrees], // Single angle value for the planet
            mode: 'markers+text', // Markers with text labels
            name: label, // Legend label for the planet
            text: [label], // Planet name as text
            textposition: 'top center', // Position text labels above the markers
            textfont: {
                family: 'Arial, sans-serif', // Roboto font with fallback
                size: 9, // Font size
                color: 'black', // White text
            },
            // texttemplate: `
            //     <span style="
            //         background: rgba(255, 0, 0, 0.6);
            //         border-radius: 0px;
            //         padding: 1px 3px;
            //         font-weight: 600;">
            //         %{text}
            //     </span>`,
            marker: {
                symbol: getMarkerSymbol(label, geocentric), // Marker symbol based on the planet
                size: 16, // Marker size
                color: getMarkerColor(label) // Marker color based on the planet
            },
            type: 'scatterpolar' // Specify the trace type
        };
    });

    const layout = {
        title: {
          text: `${geocentric ? 'Geocentric' : 'Solar System'} View at ${data.date}`,
          x: 0.5
        },
        polar: {
            radialaxis: {
                visible: true,
                showticklabels: false,
                range: [0, 9],
            },
            angularaxis: {
                direction: 'counterclockwise',
                tickfont: { size: 8 },
            }
        },
        showlegend: false, // Enable the legend
        dragmode: false, // Disable drag interactions
        staticPlot: true, // Disable interactions like zooming and dragging
        autosize: true, // Allow the plot to resize automatically
        // margin: { l: 50, r: 50, b: 50, t: 80 }, // Adjust margins to fit the title and labels
        // height: 600, // Set the height of the plot
        margin: { l: 0, r: 0, b: 20, t: 50 }, // Minimize margins to reduce whitespace
        height: Math.min(700, window.innerWidth * 0.87), // Dynamically adjust height for mobile screens
        yaxis: { fixedrange: true },
        xaxis: { fixedrange: true }
    };

    // Render the Plotly chart in the plot container
    Plotly.newPlot(plotContainer, traces, layout, { displayModeBar: false, scrollZoom: false, dragmode: false });
}


// Function to determine marker symbols based on planet name and view
function getMarkerSymbol(planetName, geocentric) {
    if (planetName === "Sun") {
        return 'star';
    } else {
        return 'circle'; // Default marker for other planets
    }
}

// Optional: Function to assign colors to markers
function getMarkerColor(planetName) {
    const colors = {
        Sun: 'gold',
        Moon: 'silver',
        Earth: 'blue',
        Mars: 'red',
        Venus: 'orange',
        Mercury: 'gray',
        Jupiter: 'brown',
        Saturn: 'tan',
        Uranus: 'lightblue',
        Neptune: 'darkblue'
    };
    return colors[planetName] || 'black'; // Default color if not specified
}

// Initial rendering when the page loads
fetchDataAndRenderPlot();

const resizeObserver = new ResizeObserver(() => {
    const width = plotContainer.clientWidth;
    const height = plotContainer.clientHeight;
    Plotly.relayout(plotContainer, { width, height });
});

resizeObserver.observe(plotContainer);

// Event listener for form submission
document.getElementById('plot-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the form from submitting
    fetchDataAndRenderPlot(); // Fetch data and render the plot
});
