const gifCheckbox = document.getElementById('gif');
const durationInput = document.getElementById('duration');
const intervalInput = document.getElementById('interval');
const geocentricCheckbox = document.getElementById('geocentric');
const dateInput = document.getElementById('date');

const defaultDate = new Date().toISOString().split('T')[0];
const gif_refresh_milliseconds = 50; // Timeout in milliseconds

dateInput.value = defaultDate;

if ('serviceWorker' in navigator) {
  // sw.js is cache-first. When a new service worker takes over from an older one (e.g. right after a
  // deploy) reload once, so the page runs the new files instead of the previously cached ones.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.error('Service Worker registration failed:', err));
}

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;   // show button
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        installBtn.hidden = true; // hide after user acts
    }
});

// Optional: hide if already running as an installed PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.hidden = true;
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
// Compute the positions in the browser (solar.js) and render the Plotly chart
function computeAndRenderPlot() {
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

    let data;
    try {
        data = SolarSystem.computeSolarSystem({ date, gif, duration, interval });
    } catch (error) {
        console.error('Error computing positions:', error);
        errorText.textContent = 'Error: ' + error.message;
        errorText.style.display = 'block';
        return;
    }

    PlotManager.isPlotting = true;
    renderPlot(data, geocentric);
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
computeAndRenderPlot();

const resizeObserver = new ResizeObserver(() => {
    const width = plotContainer.clientWidth;
    const height = plotContainer.clientHeight;
    Plotly.relayout(plotContainer, { width, height });
});

resizeObserver.observe(plotContainer);

// Event listener for form submission
document.getElementById('plot-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the form from submitting
    computeAndRenderPlot(); // Compute and render the plot
});
