$(document).ready(async () => {
    const getExpensiveCoins = async () => {
        const url = 'https://api.coingecko.com/api/v3/coins/markets';
        const params = {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 100,
            page: 1
        };
        return await $.ajax(url, { data: params });
    };

    const coins = await getExpensiveCoins();
    let selectedCoins = [];

    const getSpecificCoinData = async (coinId) => {
        try {
            if (localStorage.getItem(coinId)) {
                const savedData = JSON.parse(localStorage.getItem(coinId));
                const lastUpdated = new Date(savedData.lastUpdated);
                const twoMinutes = 2 * 60 * 1000;
                const difference = Math.abs(new Date() - lastUpdated);
                if (difference <= twoMinutes) {
                    return savedData.coinData;
                }
            }

            const coinData = await $.ajax(`https://api.coingecko.com/api/v3/coins/${coinId}`);
            localStorage.setItem(
                coinId,
                JSON.stringify({
                    coinData,
                    lastUpdated: new Date(),
                })
            );
            return coinData;
        } catch (error) {
            console.error(`Error fetching data for coin ID "${coinId}":`, error);
            return null;
        }
    };

    const updateModal = () => {
        let html = '';
        selectedCoins.forEach(coinId => {
            html += `
            <div class="form-check">
                <input class="form-check-input modal-checkbox" type="checkbox" value="" coinid="${coinId}" checked>
                <label class="form-check-label">${coinId}</label>
            </div>`;
        });
        $('#selectedCoinsContainer').html(html);
        $('.modal-checkbox').on('change', function(event) {
            const coinId = $(event.target).attr('coinid');
            if (!event.target.checked) {
                selectedCoins = selectedCoins.filter(item => item !== coinId);
                $(`.checkbox[coinid="${coinId}"]`).prop('checked', false);
            }
        });
    };

    const showSelectedCoinsInModal = () => {
        updateModal()
        let myModal = new bootstrap.Modal(document.getElementById('myModal'))
        myModal.show()
    }

    $('.link').on('click', (event) => {
        const page = $(event.target).attr('pageTitle')
        $('.page').hide()
        $('.' + page).show('slow')
        if (page === 'reports') {
            showRealTimeReport()
        }
    });

    let html = ''
    coins.map((coin) => {
        html += `
        <div class="coin">
            <div>
            <h3 class="coinsList">${coin.name}</h3>
            <div class="form-check form-switch">
                <input class="form-check-input checkbox" type="checkbox" role="switch" coinid="${coin.id}">
            </div>
            </div>
            <button id=${coin.id}>More info</button>
        </div>`
    })
    $('.currencies').html(html)

    $('.coin button').on('click', async (event) => {
        const id = event.target.id
        if ($(event.target).text() === 'Hide') {
            $(event.target).parent().find('.moreInfo, img').hide('slow')
            $(event.target).text('More Info')
        } else {
            $(event.target).text('Loading...')
            const coinData = await getSpecificCoinData(id)
            $(event.target).text('Hide')
            const { ils, eur, usd } = coinData.market_data.current_price
            let moreHtml = `<div class="moreInfo">
                <p>ILS: ₪${ils}</p>
                <p>EUR: €${eur}</p>
                <p>USD: $${usd}</p></div>`
            $(event.target).parent().append(moreHtml)
            $(event.target).parent().prepend(`<img src=${coinData.image.thumb} alt="${coinData.name}"/>`)
        }
    })

    $('.checkbox').on('click', (event) => {
        const coinId = $(event.target).attr('coinid')
        if ($(event.target).is(':checked')) {
            selectedCoins.push(coinId)
        } else {
            selectedCoins = selectedCoins.filter(item => item !== coinId)
        }
        if (selectedCoins.length > 5) {
            $(event.target).prop('checked', false)
            selectedCoins = selectedCoins.filter(item => item !== coinId)
            showSelectedCoinsInModal()
        }
    });

    $('#searchCoin').on('input', function() {
        let searchText = $(this).val().toLowerCase()
        let filteredCoins = coins.filter(coin => coin.name.toLowerCase().startsWith(searchText))
        
        let suggestionsHtml = ''
        filteredCoins.forEach(coin => {
            suggestionsHtml += `<div class="autocomplete-suggestion" data-coinid="${coin.id}">${coin.name}</div>`
        })
        $('#searchResults').html(suggestionsHtml)

        $('.autocomplete-suggestion').on('click', function() {
            const coinId = $(this).attr('data-coinid')
            $('#searchCoin').val($(this).text())
            $('#searchResults').hide()
            const specificCoin = coins.find(coin => coin.id === coinId)
            if (specificCoin) {
                displaySearchedCoin(specificCoin)
            }
        })
        $('#searchResults').show()
    })

    const displaySearchedCoin = (coin) => {
        $('.coin').hide()
        $(`.coin:has(h3:contains(${coin.name}))`).show()
    }

    const showRealTimeReport = () => {
        const ctx = document.getElementById('coinChart').getContext('2d')
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['0s', '2s', '4s', '6s', '8s', '10s'],
                datasets: selectedCoins.map((coinId, index) => ({
                    label: coinId,
                    borderColor: `hsl(${(index * 50) % 360}, 100%, 50%)`,
                    data: [...Array(6).keys()].map(() => Math.random() * 100)
                }))
            }
        })

        setInterval(() => {
            chart.data.datasets.forEach(dataset => {
                dataset.data.shift()
                dataset.data.push(Math.random() * 100)
            })
            chart.update()
        }, 2000)
    }
})