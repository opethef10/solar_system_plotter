const gifCheckbox = document.getElementById('gif');
const durationInput = document.getElementById('duration');
const intervalInput = document.getElementById('interval');
const geocentricCheckbox = document.getElementById('geocentric');
const dateInput = document.getElementById('date');

const defaultDate = new Date().toISOString().split('T')[0];
const gif_refresh_milliseconds = 50; // Timeout in milliseconds
const estimated_network_size = 1.135; // Estimated network size in KiB

dateInput.value = defaultDate;

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
    const geocentric = document.getElementById('geocentric').checked;
    const gif = document.getElementById('gif').checked;
    const duration = durationInput.value;
    const interval = intervalInput.value;

    // Stop any existing plotting process
    if (PlotManager.isPlotting) {
        clearInterval(PlotManager.intervalId); // Stop the existing interval
        PlotManager.isPlotting = false; // Reset the flag
    }

    PlotManager.isPlotting = true;

    const queryKey = `${date}-${geocentric}-${gif}-${duration}-${interval}`;

    if (queryCache[queryKey]) {
        renderPlot(queryCache[queryKey], geocentric);
        return;
    }

    const fetchInput = gif
        ? `/api?date=${date}&geocentric=${geocentric}&gif=${gif}&duration=${duration}&interval=${interval}`
        : `/api?date=${date}&geocentric=${geocentric}`;

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
            queryCache[queryKey] = data; // Store the result in the cache
            renderPlot(data, geocentric);
            updateNetworkText();
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
    //         source: `/static/${label.toLowerCase()}.png`, // Path to planet image
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
        title: `${geocentric ? 'Geocentric' : 'Solar System'} View at ${data.date}`,
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

// Update the network text calculation based on GIF state, duration, and interval
const updateNetworkText = () => {
    const networkText = document.querySelector('#network-text'); // Get the new <li> element
    if (!networkText) return; // Ensure the element exists

    const gif = gifCheckbox.checked;
    const duration = durationInput.value;
    const interval = intervalInput.value;
    const date = dateInput.value;
    const geocentric = geocentricCheckbox.checked;

    const queryKey = `${date}-${geocentric}-${gif}-${duration}-${interval}`;

    if (queryCache[queryKey]) {
        networkText.textContent = 'Estimated network usage for plot: 0 KiB (cached)';
    } else if (gif) {
        if (duration <= 0 || interval <= 0) {
            networkText.textContent = 'Estimated network usage for plot: N/A';
            return;
        }
        let estimatedSize = (estimated_network_size * (duration / interval)); // Calculate size
        if (estimatedSize > 1024) {
            networkText.textContent = `Estimated network usage for plot: ${(estimatedSize / 1024).toFixed(1)} MiB`;
        } else {
            networkText.textContent = `Estimated network usage for plot: ${estimatedSize.toFixed(1)} KiB`;
        }
    } else {
        networkText.textContent = `Estimated network usage for plot: ${estimated_network_size.toFixed(1)} KiB`;
    }
};

// Add event listeners to update the network size dynamically
document.getElementById('gif').addEventListener('change', updateNetworkText);
document.getElementById('interval').addEventListener('input', updateNetworkText);
document.getElementById('duration').addEventListener('input', updateNetworkText);
document.getElementById('date').addEventListener('input', updateNetworkText);
document.getElementById('geocentric').addEventListener('change', updateNetworkText);

// Initial trigger to set the correct text
updateNetworkText();
