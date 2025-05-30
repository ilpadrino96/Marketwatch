(() => {
  if (window.premiumMarketMonitor) return;
  window.premiumMarketMonitor = true;

  const pushoverUserKey = 'uet9xuivey6rrfbga3uzt4s369yds6';
  const pushoverApiToken = 'a738p4osx4o5mnea6pbcadjfz3au3i';

  // UI container with dark style
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.backgroundColor = '#121212';
  container.style.border = '2px solid #444';
  container.style.borderRadius = '8px';
  container.style.padding = '15px';
  container.style.zIndex = 999999;
  container.style.width = '300px';
  container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  container.style.fontSize = '14px';
  container.style.color = '#eee';
  container.style.boxShadow = '0 0 10px #666';

  container.innerHTML = `
    <div id="pm_status" style="text-align:center; font-weight:bold; margin-bottom:10px;">
      Status: <span id="pm_status_dot" style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#ffa; margin-left:5px;"></span>
    </div>
    <div style="font-weight:bold; font-size:18px; margin-bottom:10px; text-align:center; color:#aaf;">Premium Market Monitor</div>
    <label>Wood threshold: <input id="pm_wood" type="number" value="300" style="width:60px; background:#222; color:#eee; border:1px solid #444; border-radius:3px;"/></label><br/><br/>
    <label>Clay threshold: <input id="pm_stone" type="number" value="300" style="width:60px; background:#222; color:#eee; border:1px solid #444; border-radius:3px;"/></label><br/><br/>
    <label>Iron threshold: <input id="pm_iron" type="number" value="300" style="width:60px; background:#222; color:#eee; border:1px solid #444; border-radius:3px;"/></label><br/><br/>
    <label>Chime: 
      <select id="pm_chime" style="width:100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#222; color:#eee; border:1px solid #444; border-radius:3px;">
        <option value="beep">Beep (triangle)</option>
        <option value="buzz">Buzz (square)</option>
        <option value="bell">Bell (sine)</option>
      </select>
    </label><br/><br/>
    <button id="pm_start" style="width:100%; padding:6px; font-weight:bold; cursor:pointer; background:#334455; color:#aaf; border:none; border-radius:4px;">Start Monitor</button><br/><br/>
    <button id="pm_stop" style="width:100%; padding:6px; font-weight:bold; cursor:pointer; background:#663333; color:#faa; border:none; border-radius:4px;">Stop Monitor</button><br/><br/>
    <button id="pm_toggle_logs" style="width:100%; padding:6px; font-weight:bold; cursor:pointer; background:#444; color:#ccc; border:none; border-radius:4px;">Show Logs</button><br/><br/>
    <button id="pm_export_logs" style="width:100%; padding:6px; font-weight:bold; cursor:pointer; background:#228822; color:#cfc; border:none; border-radius:4px;">Export Logs as CSV</button>
    <div id="pm_logs" style="margin-top:10px; max-height:150px; overflow-y:auto; background:#222; border:1px solid #444; border-radius:5px; padding:5px; font-family: monospace; font-size:12px; display:none; color:#ddd;"></div>
  `;

  document.body.appendChild(container);

  // Elements references
  const woodInput = container.querySelector('#pm_wood');
  const stoneInput = container.querySelector('#pm_stone');
  const ironInput = container.querySelector('#pm_iron');
  const chimeSelect = container.querySelector('#pm_chime');
  const startBtn = container.querySelector('#pm_start');
  const stopBtn = container.querySelector('#pm_stop');
  const toggleLogsBtn = container.querySelector('#pm_toggle_logs');
  const exportLogsBtn = container.querySelector('#pm_export_logs');
  const logsDiv = container.querySelector('#pm_logs');
  const statusDot = container.querySelector('#pm_status_dot');

  let blinkInterval = null;
  function updateStatus(running) {
    if (running) {
      statusDot.style.backgroundColor = '#4f4';
      blinkInterval = setInterval(() => {
        statusDot.style.opacity = statusDot.style.opacity === '0' ? '1' : '0';
      }, 600);
    } else {
      statusDot.style.backgroundColor = '#ffa';
      statusDot.style.opacity = '1';
      if (blinkInterval) clearInterval(blinkInterval);
      blinkInterval = null;
    }
  }

  // Pushover notification
  async function sendPushover(msg) {
  try {
    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        token: pushoverApiToken,
        user: pushoverUserKey,
        message: msg,
        title: 'Premium Market Alert',
        sound: 'cashregister' // <-- add this line
      })
    });
    addLog('Info | Pushover sent: ' + msg);
  } catch (err) {
    addLog('Info | Pushover error: ' + err.message);
  }
}


  // Sound chime function
  function playChime(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type === 'buzz' ? 'square' : (type === 'bell' ? 'sine' : 'triangle');
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.4);
  }

  // Format date/time dd/mm/yyyy hh:mm:ss
  function formatDateTime(date) {
    return date.toLocaleDateString('en-GB') + ' ' + date.toTimeString().split(' ')[0];
  }

  // Log array with structured entries
  const logEntries = [];

  // Log with structured data: type | resource | message | oldPrice | newPrice
  function addLog(text, type = 'Info', resource = '', oldPrice = '', newPrice = '') {
    const ts = formatDateTime(new Date());
    let line = `[${ts}] ${text}`;
    logsDiv.innerHTML += line + '<br>';
    logsDiv.scrollTop = logsDiv.scrollHeight;

    logEntries.push({
      date: ts,
      type,
      resource,
      message: text,
      oldPrice,
      newPrice
    });
  }

  // Get current rate from the page element (by resource)
  function getRate(resource) {
    const id = 'premium_exchange_rate_' + resource;
    const td = document.getElementById(id);
    if (!td) return null;
    const divs = td.getElementsByClassName('premium-exchange-sep');
    if (divs.length === 0) return null;
    const text = divs[0].textContent.trim();
    const val = parseInt(text.replace(/\D/g, ''), 10);
    return isNaN(val) ? null : val;
  }

  // Monitoring control variables
  let monitorInterval = null;
  let lastRate = {
    wood: null,
    stone: null,
    iron: null
  };
  let notifiedFlag = {
    wood: false,
    stone: false,
    iron: false
  };

  // Main monitor loop
  function monitor() {
    ['wood', 'stone', 'iron'].forEach(res => {
      const threshold = parseInt(container.querySelector(`#pm_${res}`).value, 10);
      if (isNaN(threshold)) return;
      const rate = getRate(res);
      if (rate === null) return;

      // Detect price changes
      if (lastRate[res] !== null && lastRate[res] !== rate) {
        addLog(
          `${res.toUpperCase()} rate changed: ${lastRate[res]} → ${rate}`,
          'Price change',
          res,
          lastRate[res],
          rate
        );
      }

      // Save last rate
      lastRate[res] = rate;

      // Alert logic: notify only when crossing threshold downward
      if (rate <= threshold) {
        if (!notifiedFlag[res]) {
          playChime(chimeSelect.value);
          sendPushover(`⚠️ ${res.charAt(0).toUpperCase() + res.slice(1)} rate low: ${rate}`);
          addLog(`Alert sent for ${res.toUpperCase()} (threshold: ${threshold}, current: ${rate})`, 'Alert', res);
          notifiedFlag[res] = true;
        }
      } else {
        if (notifiedFlag[res]) {
          addLog(`${res.toUpperCase()} rate went above threshold (${threshold}). Reset alert flag.`, 'Info', res);
          notifiedFlag[res] = false;
        }
      }
    });
  }

  startBtn.onclick = () => {
    if (monitorInterval) {
      addLog('Monitor already running.', 'Info');
      return;
    }
    addLog('Monitor started.', 'Info');
    updateStatus(true);
    monitor();
    monitorInterval = setInterval(monitor, 2500);
  };

  stopBtn.onclick = () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
      addLog('Monitor stopped.', 'Info');
      updateStatus(false);
    } else {
      addLog('Monitor was not running.', 'Info');
    }
  };

  toggleLogsBtn.onclick = () => {
    if (logsDiv.style.display === 'none' || !logsDiv.style.display) {
      logsDiv.style.display = 'block';
      toggleLogsBtn.textContent = 'Hide Logs';
    } else {
      logsDiv.style.display = 'none';
      toggleLogsBtn.textContent = 'Show Logs';
    }
  };

  exportLogsBtn.onclick = () => {
    if (logEntries.length === 0) {
      alert('No logs to export!');
      return;
    }
    // Build CSV content with header
    let csvContent = 'Date,Type,Resource,Message,Old Price,New Price\n';
    logEntries.forEach(({date, type, resource, message, oldPrice, newPrice}) => {
      // Escape quotes and commas in message
      const cleanMessage = `"${message.replace(/"/g, '""')}"`;
      csvContent += `${date},${type},${resource},${cleanMessage},${oldPrice},${newPrice}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `premium_market_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Initially hide logs and set status off
  logsDiv.style.display = 'none';
  updateStatus(false);
})();
