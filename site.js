(() => {
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const sticker = (id, cls = '') => `<svg class="stk ${cls}" aria-hidden="true"><use href="img/stickers.svg#${id}"/></svg>`;

  document.getElementById('agenda').innerHTML = TT.agenda.map(a => `
    <li>
      <time>${a.time}</time>
      <div class="card">
        <span class="card-stk" aria-hidden="true">${a.stickers.map(id => sticker(id)).join('')}</span>
        <h3>${esc(a.title)}</h3>
        ${a.items.length ? `<ul>${a.items.map(i => `<li><span class="li-stk">${i.s.map(id => sticker(id)).join('')}</span><span>${esc(i.t)}</span></li>`).join('')}</ul>` : ''}
      </div>
    </li>`).join('');

  // String of đèn ông sao across the page
  const bunting = document.querySelector('.bunting');
  if (bunting) bunting.innerHTML = '<svg class="b-line" viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0 4Q500 70 1000 4" fill="none" stroke="#ffd77a" stroke-opacity=".5" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>' +
    Array.from({ length: 9 }, (_, i) => {
      const x = (i + 1) / 10, sag = 4 + 66 * 4 * x * (1 - x) * 0.5; // follow the quadratic curve
      return `<span style="left:${x * 100}%;top:${sag}px;--dur:${3.6 + (i % 3) * .7}s;--d:${-i * .4}s"><svg><use href="img/stickers.svg#${i % 4 === 2 ? 'carp' : 'starlantern'}"/></svg></span>`;
    }).join('');

  // Swish payment link with number and amount filled in.
  const q = new URLSearchParams({ sw: TT.swish, amt: '100.00', msg: 'Hoi vien 2026' });
  document.getElementById('swish-open').href = 'https://app.swish.nu/1/p/sw/?' + q.toString().replace(/\+/g, '%20');

  const status = document.getElementById('copy-status');
  document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); status.textContent = 'Đã sao chép số Swish.'; }
    catch { status.textContent = 'Số Swish: ' + TT.swishPretty; }
    setTimeout(() => (status.textContent = ''), 3000);
  }));
})();
