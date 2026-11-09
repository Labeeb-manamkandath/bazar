(function () {
  const B = window.Bazar, esc = B.esc;
  const key = location.pathname.indexOf('refund') >= 0 ? 'refund' : 'delivery';
  B.boot({ active: '' });
  document.getElementById('ph').textContent = key === 'refund' ? 'Refund Policy' : 'Delivery Policy';
  document.getElementById('crumbNow').textContent = key === 'refund' ? 'Refund Policy' : 'Delivery Policy';
  document.title = (key === 'refund' ? 'Refund Policy' : 'Delivery Policy') + ' | Bazar by clickfor.in';
  const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = B.SITE + '/' + key + '-policy'; document.head.appendChild(canonical);

  // Plain text to HTML: blank line = new paragraph, lines starting with "- " = bullet list.
  function body(text) {
    return String(text).split(/\n{2,}/).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length && lines.every(l => /^[-•*]\s+/.test(l))) return '<ul>' + lines.map(l => `<li>${esc(l.replace(/^[-•*]\s+/, ''))}</li>`).join('') + '</ul>';
      return '<p>' + esc(lines.join(' ')) + '</p>';
    }).join('');
  }
  window.BazarPolicyHtml = body;

  fetch('/api/public?r=policy&k=' + key).then(r => r.json()).then(d => {
    const date = d.published_at ? new Date(d.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    document.getElementById('policy').innerHTML = (date ? `<p class="updated">Last updated: ${esc(date)}</p>` : '') +
      d.sections.map(s => `<section><h2>${esc(s.heading)}</h2>${body(s.body)}</section>`).join('');
  }).catch(() => { document.getElementById('policy').innerHTML = '<p>We could not load this page. Please refresh, or message us on WhatsApp.</p>'; });
})();
