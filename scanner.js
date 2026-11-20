// ==UserScript==
// @name         ARZ MARKET SCANNER PRO (v2.0 РАЗВЕДКА)
// @namespace    arz-market
// @version      2.0
// @description  Скрипт для раскрытия страницы без сбора цен
// @match        https://online.arz-mcr.ru/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  if (document.getElementById('arz-scanner-panel')) {
    alert('ARZ SCANNER уже запущен. Закрой старую панель!');
    return;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let stopped = false;
  let running = false;

  const panel = document.createElement('div');
  panel.id = 'arz-scanner-panel';
  panel.style.cssText = 'position:fixed;z-index:999999;top:12px;left:3%;width:94%;max-width:440px;background:#111827;color:white;padding:16px;border:2px solid #f59e0b;border-radius:14px;font:14px Arial;box-shadow:0 5px 30px #0009;max-height:85vh;overflow:auto';

  panel.innerHTML = `
    <div style="font-size:20px;font-weight:bold;color:#f59e0b">ARZ SCANNER v2.0</div>
    <div style="color:#9ca3af;margin:4px 0 12px">Режим: Только раскрытие страницы (Разведка)</div>
    
    <div id="arz-status" style="padding:12px;background:#202b40;border-radius:8px;line-height:1.6;margin-bottom:10px">
      Ожидание запуска...
    </div>

    <button id="arz-start" style="width:100%;padding:13px;margin-top:10px;background:#f59e0b;color:#111;border:0;border-radius:8px;font-weight:bold;font-size:16px">🚀 НАЧАТЬ РАЗВЕДКУ</button>
    <button id="arz-stop" style="width:100%;padding:11px;margin-top:7px;background:#9b3434;color:white;border:0;border-radius:8px">ОСТАНОВИТЬ</button>
    <button id="arz-close" style="width:100%;padding:9px;margin-top:7px;background:#374151;color:white;border:0;border-radius:8px">ЗАКРЫТЬ ПАНЕЛЬ</button>
  `;

  document.body.appendChild(panel);

  const status = panel.querySelector('#arz-status');
  const start = panel.querySelector('#arz-start');

  function getCardsCount() {
    return document.querySelectorAll('main .card').length;
  }

  function updateStatus(msg) {
    status.innerHTML = msg;
  }

  async function scan() {
    if (running) return;
    running = true;
    stopped = false;
    start.disabled = true;
    start.textContent = '⏳ ИДЕТ РАЗВЕДКА...';

    let page = 1;

    try {
      while (!stopped) {
        const countBefore = getCardsCount();
        
        updateStatus(`
          <div style="color:#f59e0b;font-weight:bold;font-size:16px;margin-bottom:5px">Страница ${page}</div>
          <div>Карточек на странице: <b style="color:#10b981">${countBefore}</b></div>
          <div style="font-size:12px;color:#9ca3af;margin-top:5px">Ищем кнопку "Показать еще"...</div>
        `);

        // Плавный скролл вниз (чтобы браузер "проснулся")
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(800); 

        const moreButton = document.querySelector('main .page-more button');

        if (!moreButton || moreButton.disabled) {
          updateStatus(`
            <div style="color:#10b981;font-weight:bold;font-size:16px;margin-bottom:5px">🏁 КОНЕЦ!</div>
            <div>Кнопка "Показать еще" больше не найдена.</div>
            <div style="margin-top:5px">Всего загружено: <b>${countBefore}</b> карточек.</div>
          `);
          break;
        }

        moreButton.click();
        updateStatus(`
          <div style="color:#f59e0b;font-weight:bold;font-size:16px;margin-bottom:5px">Страница ${page}</div>
          <div>Нажали "Показать еще". Ждем загрузки...</div>
        `);
        
        // Ждем, пока загрузятся новые карточки (максимум 4 секунды)
        let added = false;
        for (let waitTry = 0; waitTry < 20; waitTry++) {
            await sleep(200); 
            if (getCardsCount() > countBefore) {
                added = true;
                break;
            }
        }

        if (!added) {
            updateStatus(`
              <div style="color:#ef4444;font-weight:bold;font-size:16px;margin-bottom:5px">⚠️ ЗАСТРЯЛИ</div>
              <div>Сайт не дал новые товары за 4 секунды. Ждем еще 5 сек...</div>
            `);
            await sleep(5000);
            
            if (getCardsCount() === countBefore) {
                updateStatus(`
                  <div style="color:#ef4444;font-weight:bold;font-size:16px;margin-bottom:5px">🛑 СТОП</div>
                  <div>Сайт перестал грузить карточки.</div>
                  <div style="margin-top:5px">Итог: загружено <b>${countBefore}</b> товаров.</div>
                `);
                break;
            }
        }

        page++;
        // Пауза между страницами, чтобы не быть роботом
        await sleep(1200); 
      }
    } catch (e) {
      updateStatus(`<div style="color:#ef4444">Ошибка: ${String(e)}</div>`);
    } finally {
      running = false;
      start.disabled = false;
      start.textContent = '🚀 НАЧАТЬ РАЗВЕДКУ';
    }
  }

  start.onclick = scan;
  panel.querySelector('#arz-stop').onclick = () => { 
    stopped = true; 
    updateStatus('Останавливаем разведку...'); 
  };
  panel.querySelector('#arz-close').onclick = () => {
    if (running) { alert('Сначала останови разведку'); return; }
    panel.remove();
  };

  updateStatus('Панель готова к запуску v2.0');
})();
