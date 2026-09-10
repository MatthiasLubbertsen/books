(() => {
  const authArea = document.getElementById('auth-area');
  const addForm = document.getElementById('add-form');
  const listSchool = document.getElementById('list-school');
  const listHome = document.getElementById('list-home');

  let authenticated = false;

  async function api(path, options) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `request failed (${res.status})`);
    }
    return res.status === 204 ? null : res.json();
  }

  function renderAuthArea() {
    authArea.innerHTML = '';
    if (authenticated) {
      const btn = document.createElement('button');
      btn.className = 'secondary';
      btn.textContent = 'log out';
      btn.onclick = async () => {
        await api('/api/logout', { method: 'POST' });
        authenticated = false;
        renderAuthArea();
        addForm.hidden = true;
        renderBooks(currentBooks);
      };
      authArea.appendChild(btn);
    } else {
      const form = document.createElement('form');
      form.className = 'login-form';
      form.style.display = 'flex';
      form.style.gap = '8px';
      form.innerHTML = `
        <input id="pin-input" type="password" inputmode="numeric" pattern="[0-9]*"
               maxlength="6" placeholder="pin" autocomplete="off" />
        <button type="submit">log in</button>
        <span class="error-text" id="login-error"></span>
      `;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const pin = document.getElementById('pin-input').value.trim();
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = '';
        try {
          await api('/api/login', { method: 'POST', body: JSON.stringify({ pin }) });
          authenticated = true;
          renderAuthArea();
          addForm.hidden = false;
          renderBooks(currentBooks);
        } catch (err) {
          errorEl.textContent = err.message;
        }
      };
      authArea.appendChild(form);
    }
  }

  function bookRow(book) {
    const li = document.createElement('li');
    li.className = 'book-row';

    const info = document.createElement('div');
    info.className = 'book-info';
    const title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = book.title;
    info.appendChild(title);
    if (book.author) {
      const author = document.createElement('div');
      author.className = 'book-author';
      author.textContent = book.author;
      info.appendChild(author);
    }
    li.appendChild(info);

    if (authenticated) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'icon';
      moveBtn.title = `move to ${book.location === 'school' ? 'home' : 'school'}`;
      moveBtn.textContent = book.location === 'school' ? '→ home' : '→ school';
      moveBtn.onclick = async () => {
        await api(`/api/books/${book.id}/move`, { method: 'POST' });
        await loadBooks();
      };
      li.appendChild(moveBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon danger';
      delBtn.title = 'delete';
      delBtn.textContent = '✕';
      delBtn.onclick = async () => {
        await api(`/api/books/${book.id}`, { method: 'DELETE' });
        await loadBooks();
      };
      li.appendChild(delBtn);
    }

    return li;
  }

  function renderList(el, items) {
    el.innerHTML = '';
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'nothing here';
      el.appendChild(li);
      return;
    }
    items
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((book) => el.appendChild(bookRow(book)));
  }

  let currentBooks = [];

  function renderBooks(books) {
    currentBooks = books;
    renderList(listSchool, books.filter((b) => b.location === 'school'));
    renderList(listHome, books.filter((b) => b.location === 'home'));
  }

  async function loadBooks() {
    const books = await api('/api/books');
    renderBooks(books);
  }

  addForm.onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('add-title').value;
    const author = document.getElementById('add-author').value;
    const location = document.getElementById('add-location').value;
    await api('/api/books', { method: 'POST', body: JSON.stringify({ title, author, location }) });
    addForm.reset();
    await loadBooks();
  };

  async function init() {
    const session = await api('/api/session');
    authenticated = session.authenticated;
    addForm.hidden = !authenticated;
    renderAuthArea();
    await loadBooks();
  }

  init();
})();
