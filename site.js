(() => {
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  document.getElementById('agenda').innerHTML = TT.agenda.map(a => `
    <li>
      <time>${a.time}</time>
      <div class="card">
        <h3>${esc(a.title)}</h3>
        ${a.items.length ? `<ul>${a.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      </div>
    </li>`).join('');

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
