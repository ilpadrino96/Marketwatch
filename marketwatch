(function(){
  if(document.getElementById('res-threshold-ui')) return;

  const container = document.createElement('div');
  container.id = 'res-threshold-ui';
  container.style = `
    position: fixed; bottom: 20px; right: 20px; 
    background: rgba(0,0,0,0.85); color: white; 
    padding: 15px; border-radius: 8px; font-family: Arial, sans-serif; 
    font-size: 14px; z-index: 999999; width: 240px;
    box-shadow: 0 0 10px #000;
  `;

  container.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">Set Thresholds</div>
    <label>Wood: <input type="number" id="th-wood" value="300" style="width:60px;"></label><br><br>
    <label>Stone: <input type="number" id="th-stone" value="300" style="width:60px;"></label><br><br>
    <label>Iron: <input type="number" id="th-iron" value="300" style="width:60px;"></label><br><br>
    <label>Chime:
      <select id="chime-select" style="width: 100%;">
        <option value="beep">Beep (triangle)</option>
        <option value="buzz">Buzz (square)</option>
        <option value="bell">Bell (sine)</option>
      </select>
    </label><br><br>
    <button id="th-start-btn" style="width:100%; padding: 6px; cursor:pointer; font-weight:bold;">Start Monitor</button>
    <button id="th-close-btn" style="width:100%; padding: 6px; margin-top:5px; cursor:pointer; font-size:12px; background:#333; border:none; color:#ccc;">Close</button>
    <div id="th-msg" style="margin-top:8px; font-size:12px; color:#f66;"></div>
  `;

  document.body.appendChild(container);

  function playChime(type){
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = type === 'buzz' ? 'square' : type === 'bell' ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.1, ctx.currentTime);

    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    o.stop(ctx.currentTime + 0.4);
  }

  function notify(msg){
    if(typeof UI !== 'undefined' && UI.ConfirmationBox){
      UI.ConfirmationBox(msg, []);
    } else {
      alert(msg);
    }
  }

  function getResourceValue(res, idMap){
    const td = document.getElementById(idMap[res]);
    if(!td) return null;
    const div = td.querySelector('.premium-exchange-sep');
    if(!div) return null;
    const text = div.textContent || '';
    const val = parseInt(text.replace(/\D/g, ''));
    return isNaN(val) ? null : val;
  }

  let monitorActive = false;
  let timeoutId = null;

  function check(thresholds, idMap, chimeType){
    if(!monitorActive) return;
    const resSpans = [];
    for(const r in thresholds){
      const val = getResourceValue(r, idMap);
      if(val !== null && val <= thresholds[r]){
        resSpans.push(`<span style="padding:0 10px 0 18px" class="res source ${r}">${val}</span>`);
      }
    }
    if(resSpans.length > 0){
      playChime(chimeType);
      notify(`<div style="margin-bottom:10px; font-weight:bold; font-size:14px;">⚠️ Resurse scăzute:</div>${resSpans.join('')}`);
    }
    timeoutId = setTimeout(() => check(thresholds, idMap, chimeType), 2000);
  }

  const idMap = {
    wood: 'premium_exchange_rate_wood',
    stone: 'premium_exchange_rate_stone',
    iron: 'premium_exchange_rate_iron'
  };

  document.getElementById('th-start-btn').onclick = function(){
    if(monitorActive){
      container.querySelector('#th-msg').textContent = 'Monitoring is already running!';
      return;
    }
    const w = parseInt(document.getElementById('th-wood').value);
    const s = parseInt(document.getElementById('th-stone').value);
    const i = parseInt(document.getElementById('th-iron').value);

    if([w,s,i].some(v => isNaN(v) || v < 0)){
      container.querySelector('#th-msg').textContent = 'Please enter valid positive numbers!';
      return;
    }

    const chimeType = document.getElementById('chime-select').value;

    container.querySelector('#th-msg').textContent = 'Monitoring started.';
    monitorActive = true;
    check({wood: w, stone: s, iron: i}, idMap, chimeType);
  };

  document.getElementById('th-close-btn').onclick = function(){
    monitorActive = false;
    if(timeoutId) clearTimeout(timeoutId);
    container.remove();
  };
})();
