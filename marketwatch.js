(() => {
  if (window.premiumMarketMonitor) return;
  window.premiumMarketMonitor = true;

  const pushoverUserKey = 'uet9xuivey6rrfbga3uzt4s369yds6';
  const pushoverApiToken = 'acuz192hbhu6wvg41scxtecyvw8kp3';

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
    <button id="pm_toggle_logs" style="width:100%; padding:6px; font-weight:bold; cursor:pointer; background:#444; color:#ccc; border:none; border-radius:4px;">Show Logs</button>
    <div id="pm_logs" style="margin-top:10px; max-height:150px; overflow-y:auto; background:#222; border:1px solid #444; border-radius:5px; padding:5px; font-family: monospace; font-size:12px; display:none; color:#ddd;"></div>
  `;

  // Add status display
const statusDisplay = document.createElement('div');
statusDisplay.id = 'pm_status';
statusDisplay.style.marginBottom = '10px';
statusDisplay.style.textAlign = 'center';
statusDisplay.style.fontWeight = 'bold';
statusDisplay.style.color = '#0f0';
statusDisplay.textContent = 'Monitor is OFF';
container.insertBefore(statusDisplay, container.children[1]);


  document.body.appendChild(container);

  

  // Create and insert Export CSV button
  const exportCsvBtn = document.createElement('button');
  exportCsvBtn.textContent = 'Export as CSV';
  exportCsvBtn.style.cssText = 'width:100%; padding:6px; font-weight:bold; cursor:pointer; background:#226688; color:#cceeff; border:none; border-radius:4px; margin-top:5px;';
  container.appendChild(exportCsvBtn);

  // Elements references
  const woodInput = container.querySelector('#pm_wood');
  const stoneInput = container.querySelector('#pm_stone');
  const ironInput = container.querySelector('#pm_iron');
  const chimeSelect = container.querySelector('#pm_chime');
  const startBtn = container.querySelector('#pm_start');
  const stopBtn = container.querySelector('#pm_stop');
  const toggleLogsBtn = container.querySelector('#pm_toggle_logs');
  const logsDiv = container.querySelector('#pm_logs');

  // Pushover notification
  async function sendPushover(msg) {
    try {
      await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: pushoverApiToken,
          user: pushoverUserKey,
          message: msg,
          title: 'Premium Market Alert'
        })
      });
      addLog('Pushover sent: ' + msg);
    } catch (err) {
      addLog('Pushover error: ' + err.message);
    }
  }

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

  function formatDateTime(date) {
    return date.toLocaleDateString('en-GB') + ' ' + date.toTimeString().split(' ')[0];
  }

  function addLog(text) {
    const ts = formatDateTime(new Date());
    logsDiv.innerHTML += `[${ts}] ${text}<br>`;
    logsDiv.scrollTop = logsDiv.scrollHeight;
  }

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

  let monitorInterval = null;
  let lastRate = { wood: null, stone: null, iron: null };
  let notifiedFlag = { wood: false, stone: false, iron: false };

  function monitor() {
    ['wood', 'stone', 'iron'].forEach(res => {
      const threshold = parseInt(container.querySelector(`#pm_${res}`).value, 10);
      if (isNaN(threshold)) return;
      const rate = getRate(res);
      if (rate === null) return;

      if (lastRate[res] !== rate) {
        addLog(`${res.toUpperCase()} rate changed: ${lastRate[res]} → ${rate}`);
        lastRate[res] = rate;
      }

      if (rate <= threshold) {
        if (!notifiedFlag[res]) {
          playChime(chimeSelect.value);
          sendPushover(`⚠️ ${res.charAt(0).toUpperCase() + res.slice(1)} rate low: ${rate}`);
          addLog(`Alert sent for ${res.toUpperCase()} (threshold: ${threshold}, current: ${rate})`);
          notifiedFlag[res] = true;
        }
      } else {
        if (notifiedFlag[res]) {
          addLog(`${res.toUpperCase()} rate went above threshold (${threshold}). Reset alert flag.`);
          notifiedFlag[res] = false;
        }
      }
    });
  }

  startBtn.onclick = () => {
  if (monitorInterval) {
    addLog('Monitor already running.');
    return;
  }
  addLog('Monitor started.');
  statusDisplay.textContent = 'Monitor is RUNNING';
  statusDisplay.style.color = '#0f0';
  monitor();
  monitorInterval = setInterval(monitor, 2500);
};

stopBtn.onclick = () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    addLog('Monitor stopped.');
    statusDisplay.textContent = 'Monitor is OFF';
    statusDisplay.style.color = '#f00';
  } else {
    addLog('Monitor was not running.');
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

  exportCsvBtn.onclick = () => {
    const lines = logsDiv.innerText.trim().split('\n');
    if (lines.length === 0 || !logsDiv.innerText.trim()) {
      alert('No logs to export!');
      return;
    }

    const csvContent = ['Timestamp,Message'];
    for (const line of lines) {
      const match = line.match(/^\[(.*?)\] (.*)$/);
      if (match) {
        const [, timestamp, message] = match;
        csvContent.push(`"${timestamp}","${message.replace(/"/g, '""')}"`);
      }
    }

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
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

  logsDiv.style.display = 'none';
})();
