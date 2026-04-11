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

// ===================== Tabs =====================

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'papers' && !papersLoaded) loadPapers();
    if (tab.dataset.tab === 'articles' && !articlesLoaded) loadArticles();
  });
});

// ===================== Papers =====================

let papersLoaded = false;
let papersIndex = null;
let papersData = {};
let currentPaperDate = null;

function loadPapers() {
  fetch('data/papers/index.json?v=' + Date.now())
    .then(r => r.json())
    .then(idx => {
      papersIndex = idx;
      papersLoaded = true;
      if (!idx.dates || idx.dates.length === 0) {
        document.getElementById('paperEmpty').style.display = '';
        return;
      }
      renderPaperDateNav(idx.dates);
      loadPaperDay(idx.dates[0]);
    })
    .catch(() => {
      document.getElementById('paperEmpty').textContent = 'データを取得できません';
      document.getElementById('paperEmpty').style.display = '';
    });
}

function renderPaperDateNav(dates) {
  const nav = document.getElementById('paperDateNav');
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
    btn.addEventListener('click', () => loadPaperDay(date));
    nav.appendChild(btn);
  });
}

function loadPaperDay(date) {
  currentPaperDate = date;
  document.querySelectorAll('#paperDateNav .date-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.date === date);
  });

  if (papersData[date]) {
    renderPaperCards(papersData[date].items);
    return;
  }

  document.getElementById('paperCards').innerHTML = '';
  document.getElementById('paperEmpty').textContent = '読み込み中...';
  document.getElementById('paperEmpty').style.display = '';

  fetch('data/papers/' + date + '.json')
    .then(r => r.json())
    .then(data => {
      papersData[date] = data;
      renderPaperCards(data.items);
    })
    .catch(() => {
      document.getElementById('paperEmpty').textContent = 'データを取得できません';
      document.getElementById('paperEmpty').style.display = '';
    });
}

function renderPaperCards(items) {
  const container = document.getElementById('paperCards');
  const empty = document.getElementById('paperEmpty');
  container.innerHTML = '';

  if (!items || items.length === 0) {
    empty.textContent = '論文がありません';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<div class="card-source">' + esc(item.category || 'arxiv') + '</div>'
      + '<div class="card-title">' + esc(item.title) + '</div>'
      + '<div class="paper-line"><strong>何がわかったか:</strong> ' + esc(item.finding) + '</div>'
      + '<div class="paper-line"><strong>人間にとって:</strong> ' + esc(item.human_impact) + '</div>'
      + '<div class="paper-line"><strong>日常のどこに:</strong> ' + esc(item.daily_use) + '</div>';
    card.addEventListener('click', () => window.open(item.url, '_blank'));
    container.appendChild(card);
  });
}

// ===================== Articles =====================

let articlesLoaded = false;
let articlesData = [];

function loadArticles() {
  fetch('data/articles/index.json?v=' + Date.now())
    .then(r => r.json())
    .then(idx => {
      articlesData = idx.articles || [];
      articlesLoaded = true;
      renderArticleList();
    })
    .catch(() => {
      document.getElementById('articleEmpty').textContent = 'データを取得できません';
      document.getElementById('articleEmpty').style.display = '';
    });
}

function renderArticleList() {
  const list = document.getElementById('articleList');
  const empty = document.getElementById('articleEmpty');
  list.innerHTML = '';

  if (articlesData.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  articlesData.forEach(a => {
    const div = document.createElement('div');
    div.className = 'article-item';
    const d = new Date(a.date + 'T00:00:00');
    const dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    div.innerHTML = '<div class="article-item-date">' + esc(dateStr) + '</div>'
      + '<div class="article-item-title">' + esc(a.title) + '</div>'
      + '<div class="article-item-summary">' + esc(a.summary) + '</div>'
      + (a.tags && a.tags.length > 0
        ? '<div class="article-item-tags">' + a.tags.map(t => '<span>' + esc(t) + '</span>').join('') + '</div>'
        : '');
    div.addEventListener('click', () => openArticle(a.slug));
    list.appendChild(div);
  });
}

function openArticle(slug) {
  fetch('data/articles/' + slug + '.json?v=' + Date.now())
    .then(r => r.json())
    .then(article => {
      const view = document.getElementById('articleView');
      const content = document.getElementById('articleContent');
      const d = new Date(article.date + 'T00:00:00');
      const dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();

      content.innerHTML = '<div class="article-body">'
        + '<h1>' + esc(article.title) + '</h1>'
        + '<div class="article-meta">' + esc(dateStr)
        + (article.tags ? ' / ' + article.tags.map(t => esc(t)).join(', ') : '')
        + '</div>'
        + renderMarkdown(article.body)
        + '</div>';

      view.classList.add('active');
      view.scrollTop = 0;
    });
}

document.getElementById('articleBack').addEventListener('click', () => {
  document.getElementById('articleView').classList.remove('active');
});

function renderMarkdown(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^(?!<[hublop]|<hr|<li)(.+)$/gm, '<p>$1</p>')
    .replace(/<\/blockquote>\n<blockquote>/g, '<br>');
}
