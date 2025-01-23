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
fetch(actualSrc)
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(JSON.stringify(errorData['error']));
            });
        }
        return response.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        plotImg.src = url; // Update to actual image once loaded
        helperText.style.display = 'none'; // Hide helper text when image is loaded
    })
    .catch(error => {
        plotImg.src = ''; // Remove the placeholder image
        plotImg.alt = error; // Set alt text if image fails to load
        console.error(error, error);
        helperText.style.display = 'none'; // Hide helper text when image is loaded
    });

const gifCheckbox = document.getElementById('gif');
const durationInput = document.getElementById('duration');
const intervalInput = document.getElementById('interval');
durationInput.max = 1000;
durationInput.min = 1;
intervalInput.min = 1;

function toggleGifInputs() {
    const isGifChecked = gifCheckbox.checked;
    durationInput.disabled = !isGifChecked;
    intervalInput.disabled = !isGifChecked;
}

gifCheckbox.addEventListener('change', toggleGifInputs);
toggleGifInputs();
