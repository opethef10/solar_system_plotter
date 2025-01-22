const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get('date') || new Date().toISOString().split('T')[0];
const geocentricParam = urlParams.get('geocentric') === 'true';
const gifParam = urlParams.get('gif') === 'true';
const durationParam = urlParams.get('duration') || 1000; // Default value 1000
const intervalParam = urlParams.get('interval') || 5; // Default value 5

document.getElementById('date').value = dateParam;
document.getElementById('geocentric').checked = geocentricParam;
document.getElementById('gif').checked = gifParam;
document.getElementById('duration').value = durationParam;
document.getElementById('interval').value = intervalParam;

const plotImg = document.getElementById('plot');
const helperText = document.getElementById('helper-text');
const placeholderSrc = '/static/loading.gif'; // Path to your placeholder image
plotImg.src = placeholderSrc; // Set placeholder image initially

const action = gifParam ? '/plot_gif' : '/plot';
const params = new URLSearchParams({
    date: dateParam,
    geocentric: geocentricParam,
    duration: durationParam,
    interval: intervalParam
}).toString();

const actualSrc = `${action}?${params}`;
const tempImg = new Image();
tempImg.src = actualSrc;

tempImg.onload = function() {
    plotImg.src = actualSrc; // Update to actual image once loaded
    helperText.style.display = 'none'; // Hide helper text when image is loade
};

tempImg.onerror = function() {
    plotImg.alt = 'Failed to load plot'; // Set alt text if image fails to load
};

const gifCheckbox = document.getElementById('gif');
const durationInput = document.getElementById('duration');
const intervalInput = document.getElementById('interval');

function toggleGifInputs() {
    const isGifChecked = gifCheckbox.checked;
    durationInput.disabled = !isGifChecked;
    intervalInput.disabled = !isGifChecked;
}

gifCheckbox.addEventListener('change', toggleGifInputs);
toggleGifInputs();
