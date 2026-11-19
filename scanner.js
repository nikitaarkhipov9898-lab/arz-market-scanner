
(() => {
  if (document.getElementById('arz-scanner-panel')) {
    alert('ARZ SCANNER уже запущен');
    return;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let stopped = false;
  let running = false;
  let results = new Map();
  let errors = [];

  const panel = document.createElement('div');
  panel.id = 'arz-scanner-panel';
  panel.style.cssText = 'position:fixed;z-index:999999;top:12px;left:3%;width:94%;max-width:440px;background:#111827;color:white;padding:16px;border:1px solid #3978f6;border-radius:14px;font:14px Arial;box-shadow:0 5px 30px #0009;max-height:85vh;overflow:auto';

  panel.innerHTML = `
    <div style="font-size:20px;font-weight:bold">ARZ MARKET SCANNER PRO</div>
    <div style="color:#9ca3af;margin:8px 0">Vice-City · Полный сбор рынка</div>
    <div id="arz-status" style="padding:12px;background:#202b40;border-radius:8px;line-height:1.6">Готов к запуску</div>
    <button id="arz-start" style="width:100%;padding:13px;margin-top:10px;background:#2878ed;color:white;border:0;border-radius:8px;font-weight:bold">НАЧАТЬ СКАНИРОВАНИЕ</button>
    <button id="arz-stop" style="width:100%;padding:11px;margin-top:7px;background:#9b3434;color:white;border:0;border-radius:8px">ОСТАНОВИТЬ</button>
    <button id="arz-download" style="width:100%;padding:11px;margin-top:7px;background:#16834e;color:white;border:0;border-radius:8px" disabled>СКАЧАТЬ JSON</button>
    <button id="arz-close" style="width:100%;padding:9px;margin-top:7px;background:#374151;color:white;border:0;border-radius:8px">ЗАКРЫТЬ ПАНЕЛЬ</button>
  `;

  document.body.appendChild(panel);

  const status = panel.querySelector('#arz-status');
  const start = panel.querySelector('#arz-start');
  const download = panel.querySelector('#arz-download');

  function getCards() {
    return [...document.querySelectorAll('main .card')];
  }

  function getItem(card) {
    const link = card.querySelector('.title a.name');
    if (!link) return null;

    const href = link.getAttribute('href') || '';
    const id = href.match(/\/items\/(\d+)/)?.[1];
    if (!id) return null;

    return {
      id,
      name: link.innerText.trim(),
      href
    };
  }

  async function expandCard(id) {
    let card = getCards().find(c => getItem(c)?.id === id);
    if (!card) return null;

    for (let i = 0; i < 100; i++) {
      const button = card.querySelector('.more button');
      if (!button || !button.innerText.includes('Ещё')) break;

      button.click();
      await sleep(350);

      card = getCards().find(c => getItem(c)?.id === id);
      if (!card) break;
    }

    return getCards().find(c => getItem(c)?.id === id) || null;
  }

  function readCard(card) {
    const item = getItem(card);
    if (!item) return null;

    const shown = card.querySelector('.more > span')?.innerText.trim() || '';
    const expected = shown.match(/из\s*(\d+)/i);
    const offers = [];

    for (const offer of card.querySelectorAll('.offers li.offer')) {
      const raw = offer.innerText.trim();
      const priceMatch = raw.match(/([\d\s\u00a0\u202f]+)\s*VC\$/i);
      const quantityMatch = raw.match(/([\d\s\u00a0\u202f]+)\s*шт/i);

      if (!priceMatch) continue;

      offers.push({
        player: offer.querySelector('.player')?.innerText.trim() || '',
        stall: offer.querySelector('.lavka')?.innerText.trim() || '',
        price: Number(priceMatch[1].replace(/\D/g, '')),
        quantity: quantityMatch
          ? Number(quantityMatch[1].replace(/\D/g, ''))
          : null,
        raw
      });
    }

    offers.sort((a, b) => a.price - b.price);

    return {
      ...item,
      shown,
      expectedOffers: expected ? Number(expected[1]) : null,
      offersCount: offers.length,
      complete: expected ? offers.length === Number(expected[1]) : null,
      offers
    };
  }

  function updateStatus(message) {
    status.innerText = message +
      '\n\nТоваров собрано: ' + results.size +
      '\nОбъявлений собрано: ' +
      [...results.values()].reduce((n, x) => n + x.offersCount, 0) +
      '\nОшибок: ' + errors.length;
  }

  async function scan() {
    if (running) return;
    running = true;
    stopped = false;
    results.clear();
    errors = [];
    download.disabled = true;
    start.disabled = true;

    try {
      let unchangedPages = 0;

      for (let page = 1; page <= 100; page++) {
        if (stopped) break;

        let cards = getCards();
        if (!cards.length) {
          errors.push('На странице не найдены карточки main .card');
          break;
        }

        const ids = cards.map(c => getItem(c)?.id).filter(Boolean);
        updateStatus('Страница ' + page + ': обработка ' + ids.length + ' карточек');

        for (let i = 0; i < ids.length; i++) {
          if (stopped) break;

          const id = ids[i];
          try {
            const card = await expandCard(id);
            if (!card) {
              errors.push('Не найдена карточка ID ' + id);
              continue;
            }

            const data = readCard(card);
            if (data) results.set(id, data);
            updateStatus('Страница ' + page + ': товар ' + (i + 1) + ' из ' + ids.length);
          } catch (e) {
            errors.push('Товар ID ' + id + ': ' + String(e));
          }
        }

        if (stopped) break;

        const before = new Set(
          getCards().map(c => getItem(c)?.id).filter(Boolean)
        );

        const moreButton = document.querySelector('main .page-more button');

        if (!moreButton || moreButton.disabled) break;

        moreButton.click();
        updateStatus('Загружаем следующую порцию товаров...');
        await sleep(1800);

        const after = getCards().map(c => getItem(c)?.id).filter(Boolean);
        const added = after.filter(id => !before.has(id));

        if (!added.length) unchangedPages++;
        else unchangedPages = 0;

        if (unchangedPages >= 2) {
          errors.push('Остановка: две попытки загрузки не добавили новые товары');
          break;
        }
      }

      const data = {
        scanner: 'ARZ MARKET SCANNER PRO',
        server: 'Vice-City',
        serverId: new URL(location.href).searchParams.get('server'),
        scannedAt: new Date().toISOString(),
        source: location.href,
        totalProducts: results.size,
        totalOffers: [...results.values()].reduce((n, x) => n + x.offersCount, 0),
        incompleteProducts: [...results.values()]
          .filter(x => x.complete === false)
          .map(x => ({id:x.id,name:x.name,shown:x.shown,count:x.offersCount,expected:x.expectedOffers})),
        errors,
        products: [...results.values()]
      };

      window.arzMarketScanResult = data;

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        {type:'application/json'}
      );
      const url = URL.createObjectURL(blob);
      download.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ARZ_VICE_CITY_' +
          new Date().toISOString().replace(/[:.]/g,'-') + '.json';
        a.click();
      };
      download.disabled = false;

      updateStatus(
        (stopped ? 'Сканирование остановлено' : 'Сканирование завершено') +
        '\nТоваров: ' + data.totalProducts +
        '\nОбъявлений: ' + data.totalOffers +
        '\nНеполных карточек: ' + data.incompleteProducts.length
      );

    } catch (e) {
      errors.push(String(e));
      updateStatus('Ошибка сканирования: ' + String(e));
    } finally {
      running = false;
      start.disabled = false;
    }
  }

  start.onclick = scan;
  panel.querySelector('#arz-stop').onclick = () => {
    stopped = true;
    updateStatus('Останавливаем сканирование...');
  };
  panel.querySelector('#arz-close').onclick = () => {
    if (running) {
      alert('Сначала останови сканирование');
      return;
    }
    panel.remove();
  };

  updateStatus('Панель готова. Открой рынок Vice-City и нажми запуск.');
})();
