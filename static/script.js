const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get('date') || new Date().toISOString().split('T')[0];
const geocentricParam = urlParams.get('geocentric') === 'true';

document.getElementById('date').value = dateParam;
document.getElementById('geocentric').checked = geocentricParam;

const plotImg = document.getElementById('plot');
plotImg.src = `/plot?date=${dateParam}&geocentric=${geocentricParam}`;
