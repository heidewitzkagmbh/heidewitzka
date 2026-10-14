(() => {
  const stage = document.getElementById('search-economy-chart');
  const controls = document.querySelector('.se-chart-controls');
  const external = document.getElementById('se-chart-external');
  if (!stage || !controls || !external) return;

  const buttons = [...controls.querySelectorAll('button[data-symbol]')];
  let selectedSymbol;

  function showChart(button) {
    const symbol = button.dataset.symbol;
    if (symbol === selectedSymbol) return;
    selectedSymbol = symbol;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));

    const url = `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/`;
    external.href = url;
    external.textContent = `${button.dataset.name}-Kursverlauf bei TradingView öffnen ↗`;

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    const chart = document.createElement('div');
    chart.className = 'tradingview-widget-container__widget';
    const credit = document.createElement('div');
    credit.className = 'tradingview-widget-copyright';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener nofollow';
    link.textContent = `${button.dataset.name}-Chart`;
    credit.append(link, ' von TradingView');
    container.append(chart, credit);
    stage.replaceChildren(container);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      range: '12M',
      timezone: 'Europe/Berlin',
      theme: 'light',
      style: '3',
      locale: 'de_DE',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: true,
      hide_volume: true,
      withdateranges: true,
      save_image: false,
      calendar: false,
      details: false,
      backgroundColor: '#ffffff',
      support_host: 'https://www.tradingview.com'
    });
    script.onerror = () => {
      if (!container.isConnected) return;
      const message = document.createElement('p');
      message.className = 'se-chart-error';
      message.setAttribute('role', 'status');
      message.textContent = 'Der Chart konnte nicht geladen werden. Über den Link darunter lässt sich der Kursverlauf direkt öffnen.';
      stage.replaceChildren(message);
      selectedSymbol = undefined;
    };
    container.append(script);
  }

  controls.hidden = false;
  buttons.forEach(button => button.addEventListener('click', () => showChart(button)));
  showChart(buttons[0]);
})();
