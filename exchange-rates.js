let month, year;
let allInfoRetrieved, activeInfo;
let lowerBound, upperBound;
let rectX, rectY, rectWidth, rectHeight;
let r;
let colors
let deltaX;

$(document).ready(function() {
    $('input[type=checkbox]').on('change', getData);
    
    $('#previous-button').on('click', function() {
        if (month > 1) {
            --month;
        } else if (month === 1) {
            month = 12;
            --year;
        }

        allInfoRetrieved = {};
        clearDateLabels();
        drawDateLabels();
        getData();
    });

    $('#next-button').on('click', function() {
        if (month < 12) {
            ++month;
        } else if (month === 12) {
            month = 1;
            ++year;
        }

        let now = new Date();
        let currentMonth = now.getMonth() + 1;
        let currentYear = now.getFullYear();
        if (month === currentMonth && year === currentYear)
            $('#next-button').prop('disabled', true);

        allInfoRetrieved = {};
        clearDateLabels();
        drawDateLabels();
        getData();
    });

    initialize();
});

function initialize() {
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');

    month = 5, year = 2023;
    rectX = 80; rectY = 15;
    rectWidth = canvas.width - rectX - 1;
    rectHeight = canvas.height - rectY - 1 - 50;
    allInfoRetrieved = {};
    r = 4;
    colors = {
        'AUD': [170, 187, 204],
        'CZK': [187, 170, 204],
        'GBP': [204, 187, 170],
        'CHF': [187, 204, 170],
        'CAD': [170, 204, 187],
        'JPY': [204, 170, 187],
        'USD': [247, 99, 136]
    };

    colorLegend();
    drawDateLabels();
    getData();
}

/**
 * If necessary, retrieves data.
 * Invokes the function which draws the chart.
 */
async function getData() {    
    let selectedCurrencies = getSelectedCurrencies();

    keys = Object.keys(allInfoRetrieved);
    let neededCurrencies = [];
    for (let i = 0; i < selectedCurrencies.length; i++) {
        if (!keys.includes(selectedCurrencies[i])) { // It is necessary to add data for this currency and the selected month
            allInfoRetrieved[selectedCurrencies[i]] = [];
            neededCurrencies.push(selectedCurrencies[i]);
        }
    }

    neededCurrencies = neededCurrencies.join(',');
    if (neededCurrencies.length > 0) {
        let canvas = $('#canvas')[0];
        let ctx = canvas.getContext('2d');
        clearRect();
        ctx.font= '26px Arial';

        // When retrieving data, disable user interaction with the application via buttons and checkboxes
        setDisabledProperty(true);

        let now = new Date();
        let currentMonth = now.getMonth() + 1;
        let currentDate = now.getDate();

        let dayLimit = month === currentMonth ? currentDate : getLastDayOfMonth(month, year);
        
        drawCenteredText(ctx, 'Retrieving data...', rectX + rectWidth / 2, rectY + rectHeight / 2);
        console.log('Retrieving: ' + neededCurrencies);
        
        for (let dayOfMonth = 1; dayOfMonth <= dayLimit; ++dayOfMonth) {
            let url = generateUrl(month, year);
            if (dayOfMonth < 10) url += '0' + dayOfMonth;
            else url += dayOfMonth;
    
            await $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json',
                data: {
                    base: 'EUR',
                    symbols: neededCurrencies
                },
                success: function(data) {
                    Object.entries(data.rates).forEach(([currency, value]) => {
                        allInfoRetrieved[currency].push(value);
                    });
                }
            });
        }
    }

    // Data has been retrieved -- enable user interaction with the application again via buttons and checkboxes
    setDisabledProperty(false);

    activeInfo = {};
    for (let selectedCurrency of selectedCurrencies)
        activeInfo[selectedCurrency] = allInfoRetrieved[selectedCurrency];

    drawChart();
}

/**
 * For the given month and year, generates a url for querying the API.
 */
function generateUrl(month, year) {
    let url = `https://api.exchangerate.host/`;
    url += year + '-';
    if (month < 10)
        url += '0' + month + '-';
    else
        url += month + '-';

    return url;
}

/**
 * For the given month and year, returns the last day of the month.
 */
function getLastDayOfMonth(month, year) {    
    let thirtyOneDays = [
        1,
        3,
        5,
        7,
        8,
        10,
        12
    ];
    
    let lastDayOfMonth;
    if (month != 2) {
        lastDayOfMonth = 30;
        if (thirtyOneDays.includes(month))
            ++lastDayOfMonth;
    } else {
        lastDayOfMonth = 28;
        if (year % 4 === 0)
            ++lastDayOfMonth;
    }

    return lastDayOfMonth;
}

/**
 * Draws the chart.
 */
function drawChart() {    
    clearRect();
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');

    setLowerAndUpperBound();

    ctx.strokeStyle = 'lightgray';
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

    drawGridAndLabels();
    
    Object.entries(activeInfo).forEach(([currency, values]) => {
        drawGraph(currency, values);
    });
}

/**
 * Retrieves the extreme value in the chart.
 * If type === 'min', retrieves the minimum.
 * If type === 'max', retrieves the maximum.
 */
function getMostExtremeValue(type) {
    let currencyExtremes = [];
    
    Object.entries(activeInfo).forEach(([currency, values]) => {
        if (type === 'min')
            currencyExtremes.push(Math.min(...values));
        else if (type === 'max')
            currencyExtremes.push(Math.max(...values));
    });

    if (type === 'min')
        return Math.min(...currencyExtremes);
    else if (type === 'max')
        return Math.max(...currencyExtremes);
}

/**
 * For the given currency and its values, draws a line graph.
 */
function drawGraph(currency, values) {    
    let canvas = $('#canvas')[0];

    let x = 0;
    let ctx = canvas.getContext( '2d' );
    for (let i = 0; i < values.length - 1; ++i) {
        let currentValue = values[i];
        let nextValue = values[i + 1]

        let red = colors[currency][0];
        let green = colors[currency][1];
        let blue = colors[currency][2];
        ctx.strokeStyle = makeRGB(red, green, blue);
        ctx.beginPath();
        ctx.moveTo(rectX + x, rectY + getYcoordinates(currentValue));
        ctx.lineTo(rectX + x + deltaX, rectY + getYcoordinates(nextValue));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rectX + x, rectY + getYcoordinates(currentValue), r, 0, 2 * Math.PI, false);
        ctx.stroke();

        x += deltaX;
    }

    ctx.beginPath();
    ctx.arc(rectX + x, rectY + getYcoordinates(values[values.length - 1]), r, 0, 2 * Math.PI, true);
    ctx.stroke();
}

/**
 * For the given currency value, returns the y-coordinate of the point on the graph.
 */
function getYcoordinates(value) {
    return rectHeight - ((value - lowerBound) / (upperBound - lowerBound)) * rectHeight;
}

/**
 * Draws text centered around coordinates (x, y).
 */
function drawCenteredText(ctx, text, x, y) {    
    let textMetrics = ctx.measureText(text);
    let textWidth = textMetrics.width;
    let textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    let centerX = x - textWidth / 2;
    let centerY = y + textHeight / 2;

    ctx.fillText(text, centerX, centerY);
}

/**
 * Draws the grid and the corresponding labels on the y-axis of the graph.
 */
function drawGridAndLabels() {
    drawVerticalLines();
    drawHorizontalLinesAndLabels();
}

/**
 * Clear the chart for new data.
 */
function clearRect() {
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, rectY - 1, canvas.width, rectHeight + 6);
}

/**
 * Draws the date markers along the horizontal axis of the chart.
 */
function drawDateLabels() {    
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');
    
    let labelPattern = getLabelPattern();
    
    let x = rectX;
    deltaX = rectWidth / (getLastDayOfMonth(month, year) - 1);
    for (let dayOfMonth = 1; dayOfMonth <= 26; dayOfMonth += 5) {
        let label = labelPattern;
    
        if (dayOfMonth < 10) label += '0' + dayOfMonth;
        else label += dayOfMonth;

        ctx.font = '13px Arial';
        drawCenteredText(ctx, label, x, rectY + rectHeight + 30);

        x += 5 * deltaX;
    }
}

/**
 * Adds the corresponding colors to the chart legend.
 */
function colorLegend() {
    
    let paragraphs = $('#currencies p');

    paragraphs.each(function() {
        let inputElement = $(this).children()[0];
        let currency = $(inputElement).attr('id');

        let red = colors[currency][0];
        let green = colors[currency][1];
        let blue = colors[currency][2];
        $(this).css('background-color', makeRGB(red, green, blue));
    });
}

function makeRGB(red, green, blue) {
    return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
}

/**
 * Deletes the date markers along the horizontal axis.
 */
function clearDateLabels() {
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, rectHeight + 30, canvas.width, 30);
}

/**
 * Depending on the bool parameter, it either enables or disables user interaction with the application via buttons and checkboxes.
 */
function setDisabledProperty(bool) {    
    // enable/disable the "Previous month" button
    $('#previous-button').prop('disabled', bool);
    
    // enable/disable the "Next month" button
    if (!bool) {
        let now = new Date();
        let currentMonth = now.getMonth() + 1;
        let currentYear = now.getFullYear();

        if (month !== currentMonth || year !== currentYear)
            $('#next-button').prop('disabled', false);
    } else {
        $('#next-button').prop('disabled', true);
    }

    // enable/disable the currency checkboxes
    let paragraphs = $('#currencies p');
    paragraphs.each(function() {
        let inputElement = $(this).children()[0];
        $(inputElement).prop('disabled', bool);
    });
}

/**
 * Retrieves the selected currencies.
 */
function getSelectedCurrencies() {
    return $("input[name='currency']:checked")
        .map(function() { return this.value; })
        .get();
}

function setLowerAndUpperBound() {
    let minimumValue = getMostExtremeValue('min');
    let maximumValue = getMostExtremeValue('max');

    lowerBound = Math.max(minimumValue - 0.11 * (maximumValue - minimumValue), 0);
    upperBound = maximumValue + 0.11 * (maximumValue - minimumValue);
}

/**
 * Draws vertical lines in the chart grid.
 */
function drawVerticalLines() {
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');
    
    let x = 5 * deltaX;
    for (let j = 0; j < 5; ++j) {
        ctx.beginPath();
        ctx.moveTo(rectX + x, rectY);
        ctx.lineTo(rectX + x, rectY + rectHeight);
        ctx.stroke();
        
        x += 5 * deltaX;
    }
}

/**
 * Draws horizontal lines in the chart grid and labels along the vertical axis.
 */
function drawHorizontalLinesAndLabels() {
    let canvas = $('#canvas')[0];
    let ctx = canvas.getContext('2d');

    let deltaY = rectHeight / 7;
    let deltaValue = (upperBound - lowerBound) / 7;
    let y = deltaY;
    let value = upperBound - deltaValue;
    ctx.font = '13px Arial';
    let spacing = 40;
    let digits = getNumberOfDigits();
    for (let i = 0; i < 6; ++i) {
        if (!isNaN(value)) {
            let roundedValue = value.toFixed(digits);
            drawCenteredText(ctx, roundedValue, rectX - spacing, rectY + y);
        }
        
        ctx.beginPath();
        ctx.moveTo(rectX, rectY + y);
        ctx.lineTo(rectX + rectWidth, rectY + y);
        ctx.stroke();
        
        y += deltaY;
        value -= deltaValue;
    }

    if (!isNaN(value)) {
        let roundedValue = Math.abs(value).toFixed(digits);
        drawCenteredText(ctx, roundedValue, rectX - spacing, rectY + y);
    }
}

/**
 * Returns a datestamp template in the form 'YYYY-MM-'
 */
function getLabelPattern() {
    let labelPattern =  year + '-';
    if (month < 10)
        labelPattern += '0' + month + '-';
    else
        labelPattern += month + '-';

    return labelPattern;
}

function getNumberOfDigits() {
    return Math.ceil(Math.abs(Math.log10(upperBound - lowerBound))) + 1;
}
