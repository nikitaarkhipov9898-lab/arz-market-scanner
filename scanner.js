(() => {
  if (document.getElementById('arz-scanner-panel')) {
    alert('ARZ SCANNER уже запущен');
    return;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let stopped = false;
  let running = false;

  const panel = document.createElement('div');
  panel.id = 'arz-scanner-panel';
  panel.style.cssText = 'position:fixed;z-index:999999;top:12px;left:3%;width:94%;max-width:440px;background:#111827;color:white;padding:16px;border:1px solid #3978f6;border-radius:14px;font:14px Arial;box-shadow:0 5px 30px #0009;max-height:85vh;overflow:auto';

  panel.innerHTML = `
    <div style="font-size:20px;font-weight:bold">ARZ SCANNER: РАЗВЕДКА</div>
    <div style="color:#9ca3af;margin:8px 0">Режим: Только раскрытие страницы</div>
    <div id="arz-status" style="padding:12px;background:#202b40;border-radius:8px;line-height:1.6">Готов к запуску</div>
    <button id="arz-start" style="width:100%;padding:13px;margin-top:10px;background:#2878ed;color:white;border:0;border-radius:8px;font-weight:bold">НАЧАТЬ РАСКРЫТИЕ</button>
    <button id="arz-stop" style="width:100%;padding:11px;margin-top:7px;background:#9b3434;color:white;border:0;border-radius:8px">ОСТАНОВИТЬ</button>
    <button id="arz-close" style="width:100%;padding:9px;margin-top:7px;background:#374151;color:white;border:0;border-radius:8px">ЗАКРЫТЬ ПАНЕЛЬ</button>
  `;

  document.body.appendChild(panel);

  const status = panel.querySelector('#arz-status');
  const start = panel.querySelector('#arz-start');

  function getCardsCount() {
    return document.querySelectorAll('main .card').length;
  }

  function updateStatus(message) {
    status.innerText = message;
  }

  async function scan() {
    if (running) return;
    running = true;
    stopped = false;
    start.disabled = true;

    let page = 1;

    try {
      while (!stopped) {
        const countBefore = getCardsCount();
        updateStatus(`Страница ${page}: загружено ${countBefore} товаров...`);

        // Плавный скролл вниз, чтобы браузер "проснулся"
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(500); 

        const moreButton = document.querySelector('main .page-more button');

        if (!moreButton || moreButton.disabled) {
          updateStatus(`Конец! Больше нет кнопки "Показать еще".\nВсего загружено: ${countBefore} товаров.`);
          break;
        }

        moreButton.click();
        updateStatus(`Страница ${page}: нажимаю "Показать еще"...`);
        
        // Ждем, пока загрузятся новые карточки (максимум 3 секунды)
        let added = false;
        for (let waitTry = 0; waitTry < 15; waitTry++) {
            await sleep(200); 
            if (getCardsCount() > countBefore) {
                added = true;
                break;
            }
        }

        if (!added) {
            updateStatus(`Страница ${page}: сайт не дал новые товары. Ждем еще 3 сек...`);
            await sleep(3000); // Даем сайту больше времени
            if (getCardsCount() === countBefore) {
                updateStatus(`Остановка. Сайт перестал грузить товары.\nВсего: ${countBefore} шт.`);
                break;
            }
        }

        page++;
        // Небольшая пауза между страницами, чтобы не быть роботом
        await sleep(1000); 
      }
    } catch (e) {
      updateStatus('Ошибка: ' + String(e));
    } finally {
      running = false;
      start.disabled = false;
    }
  }

  start.onclick = scan;
  panel.querySelector('#arz-stop').onclick = () => { stopped = true; updateStatus('Остановка...'); };
  panel.querySelector('#arz-close').onclick = () => {
    if (running) { alert('Сначала останови сканирование'); return; }
    panel.remove();
  };

  updateStatus('Панель готова. Открой рынок и нажми запуск.');
})();
