// ===================== FEED =====================

let feedIndex = null;
let feedData = {};
let currentDate = null;

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ===================== Init =====================

fetch('data/updates/index.json?v=' + Date.now())
  .then(r => r.json())
  .then(idx => {
    feedIndex = idx;
    if (!idx.dates || idx.dates.length === 0) {
      document.getElementById('emptyMsg').style.display = '';
      return;
    }
    renderDateNav(idx.dates);
    loadDay(idx.dates[0]);
  })
  .catch(() => {
    document.getElementById('emptyMsg').textContent = 'データを取得できません';
    document.getElementById('emptyMsg').style.display = '';
  });

// ===================== Date Navigation =====================

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = ['日','月','火','水','木','金','土'][d.getDay()];
  return (d.getMonth() + 1) + '月' + d.getDate() + '日(' + dow + ')';
}

function renderDateNav(dates) {
  const nav = document.getElementById('dateNav');
  nav.innerHTML = '';
  if (dates.length === 1) {
    nav.className = 'date-nav single';
    const span = document.createElement('span');
    span.className = 'date-label';
    span.textContent = formatDate(dates[0]);
    nav.appendChild(span);
    return;
  }
  nav.className = 'date-nav';
  dates.forEach(date => {
    const btn = document.createElement('button');
    btn.className = 'date-btn';
    btn.textContent = formatDate(date);
    btn.dataset.date = date;
    btn.addEventListener('click', () => loadDay(date));
    nav.appendChild(btn);
  });
}

function loadDay(date) {
  currentDate = date;
  document.querySelectorAll('.date-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.date === date);
  });

  if (feedData[date]) {
    renderCards(feedData[date].items);
    return;
  }

  document.getElementById('cards').innerHTML = '';
  document.getElementById('emptyMsg').textContent = '読み込み中...';
  document.getElementById('emptyMsg').style.display = '';

  fetch('data/updates/' + date + '.json')
    .then(r => r.json())
    .then(data => {
      feedData[date] = data;
      renderCards(data.items);
    })
    .catch(() => {
      document.getElementById('emptyMsg').textContent = 'データを取得できません';
      document.getElementById('emptyMsg').style.display = '';
    });
}

// ===================== Render =====================

function renderCards(items) {
  const container = document.getElementById('cards');
  const emptyMsg = document.getElementById('emptyMsg');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  const filtered = query
    ? items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        (item.repo || '').toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query) ||
        (item.highlights || []).some(h => h.toLowerCase().includes(query))
      )
    : items;

  container.innerHTML = '';
  if (!filtered || filtered.length === 0) {
    emptyMsg.textContent = query ? '検索結果なし' : '記事がありません';
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    const src = item.repo ? item.source + ' / ' + item.repo : (item.feed || item.source);
    card.innerHTML = '<div class="card-source">' + esc(src) + '</div>'
      + '<div class="card-title">' + esc(item.title) + '</div>'
      + '<div class="card-summary">' + esc(item.summary) + '</div>'
      + (item.highlights && item.highlights.length > 0
        ? '<ul class="card-highlights">' + item.highlights.map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>'
        : '')
      + (item.category ? '<span class="card-category">' + esc(item.category) + '</span>' : '');
    card.addEventListener('click', () => window.open(item.url, '_blank'));
    container.appendChild(card);
  });
}

// ===================== Search =====================

let searchTimer = null;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (currentDate && feedData[currentDate]) {
      renderCards(feedData[currentDate].items);
    }
  }, 200);
});
