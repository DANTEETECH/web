// Notification system
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  const textElement = document.getElementById('notification-text');
  
  // Set icon based on type
  const icon = notification.querySelector('i');
  if (type === 'success') {
    icon.className = 'fas fa-check-circle';
    notification.classList.add('success');
  } else if (type === 'error') {
    icon.className = 'fas fa-exclamation-circle';
    notification.classList.add('error');
  } else {
    icon.className = 'fas fa-bell';
    notification.classList.remove('success', 'error');
  }
  
  textElement.textContent = message;
  notification.classList.add('show');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// Simulated Room Database Implementation
class RoomDatabase {
  constructor() {
    this.data = {
      users: {},
      products: [],
      offers: [],
      chats: {},
      unread: {}
    };
    this.loadFromStorage();
  }
  
  // Save data to localStorage
  saveToStorage() {
    localStorage.setItem('danteetech_db', JSON.stringify(this.data));
  }
  
  // Load data from localStorage
  loadFromStorage() {
    const saved = localStorage.getItem('danteetech_db');
    if (saved) {
      this.data = JSON.parse(saved);
    }
  }
  
  // User operations
  registerUser(username, password) {
    if (this.data.users[username]) {
      return false;
    }
    this.data.users[username] = password;
    this.data.chats[username] = [];
    this.data.unread[username] = 0;
    this.saveToStorage();
    return true;
  }
  
  validateUser(username, password) {
    return this.data.users[username] === password;
  }
  
  // Product operations
  addProduct(name, price, images) {
    this.data.products.push({name, price, images});
    this.saveToStorage();
  }
  
  deleteProduct(index) {
    this.data.products.splice(index, 1);
    this.saveToStorage();
  }
  
  // Offer operations
  addOffer(offer) {
    this.data.offers.push(offer);
    this.saveToStorage();
  }
  
  updateOfferStatus(id, status) {
    const offer = this.data.offers.find(o => o.id === id);
    if (offer) {
      offer.status = status;
      this.saveToStorage();
      return true;
    }
    return false;
  }
  
  supplyProduct(id) {
    const offer = this.data.offers.find(o => o.id === id);
    if (offer && offer.supplied < offer.qty) {
      offer.supplied++;
      this.saveToStorage();
      return true;
    }
    return false;
  }
  
  // Chat operations
  addMessage(username, message) {
    if (!this.data.chats[username]) {
      this.data.chats[username] = [];
    }
    this.data.chats[username].push(message);
    this.saveToStorage();
  }
  
  getUnreadCount(username) {
    return this.data.unread[username] || 0;
  }
  
  setUnreadCount(username, count) {
    this.data.unread[username] = count;
    this.saveToStorage();
  }
  
  // Getters
  getUsers() { return this.data.users; }
  getProducts() { return this.data.products; }
  getOffers() { return this.data.offers; }
  getChats() { return this.data.chats; }
  getUnread() { return this.data.unread; }
}

// Initialize database
const db = new RoomDatabase();

// Global state
let currentUser = null;
let adminMode = false;
const slideIndexes = {};
let offerCount = {};

// Initialize offer count from existing offers
db.getOffers().forEach(offer => {
  const prefix = offer.id.split('-')[0];
  const num = parseInt(offer.id.split('-')[1]);
  if (!offerCount[prefix] || num > offerCount[prefix]) {
    offerCount[prefix] = num;
  }
});

// DOM Helper Functions
function show(id) {
  document.getElementById(id).style.display = 'block';
}

function hide(id) {
  document.getElementById(id).style.display = 'none';
}

function setActiveTab(tabType, activeId) {
  const tabs = document.querySelectorAll(`.${tabType} .tabs button`);
  tabs.forEach(tab => tab.classList.remove('active'));
  
  const activeTab = Array.from(tabs).find(tab => 
    tab.onclick.toString().includes(activeId)
  );
  if (activeTab) activeTab.classList.add('active');
}

//--- Auth ---
function registerUser() {
  const u = document.getElementById('regUser').value.trim();
  const p = document.getElementById('regPass').value.trim();
  
  if (!u || !p) {
    showNotification('Please enter both username and password', 'error');
    return;
  }
  
  if (db.registerUser(u, p)) {
    showNotification('Registration successful! You can now log in.', 'success');
    document.getElementById('regUser').value = '';
    document.getElementById('regPass').value = '';
  } else {
    showNotification('Username already exists. Please choose another.', 'error');
  }
}

function loginCustomer() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  
  if (db.validateUser(u, p)) {
    currentUser = u;
    document.getElementById('welcomeUser').textContent = u;
    hide('authSection');
    show('customerPortal');
    showCustomerPage('products');
    renderProducts();
    renderOffers();
    renderCustomerOrders();
    renderChat();
    showNotification(`Welcome back, ${u}!`, 'success');
  } else {
    showNotification('Invalid username or password', 'error');
  }
}

function logoutCustomer() {
  currentUser = null;
  hide('customerPortal');
  show('authSection');
  showNotification('You have been logged out', 'info');
}

function adminLogin() {
  const pw = prompt('Admin password:');
  if (pw === 'Danteetech123') {
    adminMode = true;
    hide('authSection');
    show('adminPortal');
    showAdminPage('manageProducts');
    renderAdminProducts();
    renderAdminOffers();
    renderAdminSupply();
    populateAdminChatUsers();
    updateNotification();
    showNotification('Admin access granted', 'success');
  } else {
    showNotification('Wrong password', 'error');
  }
}

function logoutAdmin() {
  adminMode = false;
  hide('adminPortal');
  show('authSection');
  showNotification('Admin session ended', 'info');
}

//--- Tab navigation ---
function showCustomerPage(id) {
  ['products', 'offers', 'orders', 'chat'].forEach(x => hide(x));
  show(id);
  setActiveTab('customerPortal', id);
  
  if (id === 'chat') {
    db.setUnreadCount(currentUser, 0);
    updateNotification();
  }
}

function showAdminPage(id) {
  ['manageProducts', 'pendingOffers', 'supplyTracking', 'adminChat'].forEach(x => hide(x));
  show(id);
  setActiveTab('adminPortal', id);
  
  if (id === 'adminChat') {
    db.setUnreadCount('admin', 0);
    updateNotification();
  }
}

//--- Products Slider & Zoom ---
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const s = document.getElementById('searchProduct').value.toLowerCase();
  grid.innerHTML = '';
  
  const products = db.getProducts();
  products.filter(p => p.name.toLowerCase().includes(s)).forEach((p, i) => {
    if (slideIndexes[i] == null) slideIndexes[i] = 0;
    const imgSrc = p.images[slideIndexes[i]];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${imgSrc}" onclick="zoomImage('${imgSrc}')"/>
      <div class="info">
        <p><strong>${p.name}</strong></p>
        <p>₦${p.price.toLocaleString()}</p>
      </div>
      <div class="slider-controls" style="display:flex; gap:5px; margin:10px 0;">
        <button onclick="prevSlide(${i})"><i class="fas fa-chevron-left"></i></button>
        <button onclick="nextSlide(${i})"><i class="fas fa-chevron-right"></i></button>
      </div>
      <input id="qty_${i}" type="number" min="1" placeholder="Quantity" style="margin:8px 0; padding:8px;"/>
      <input id="off_${i}" type="number" min="1" placeholder="Your Offer (₦)" style="margin:8px 0; padding:8px;"/>
      <button onclick="custAddOffer(${i})"><i class="fas fa-hand-holding-usd"></i> Make Offer</button>`;
    grid.appendChild(card);
  });
}

function nextSlide(i) {
  const products = db.getProducts();
  slideIndexes[i] = (slideIndexes[i] + 1) % products[i].images.length;
  renderProducts();
}

function prevSlide(i) {
  const products = db.getProducts();
  slideIndexes[i] = (slideIndexes[i] - 1 + products[i].images.length) % products[i].images.length;
  renderProducts();
}

function zoomImage(src) {
  document.getElementById('modalImage').src = src;
  show('imgModal');
}

function closeModal() {
  hide('imgModal');
}

//--- Offers & Orders ---
function custAddOffer(i) {
  const qty = +document.getElementById(`qty_${i}`).value;
  const off = +document.getElementById(`off_${i}`).value;
  
  if (!qty || !off) {
    showNotification('Please enter both quantity and offer amount', 'error');
    return;
  }
  
  const pref = currentUser.slice(0, 2).toUpperCase();
  offerCount[pref] = (offerCount[pref] || 0) + 1;
  const id = `${pref}-${offerCount[pref].toString().padStart(4, '0')}`;
  
  const offer = {
    id,
    customer: currentUser,
    product: db.getProducts()[i].name,
    qty,
    off,
    status: 'pending',
    supplied: 0
  };
  
  db.addOffer(offer);
  renderOffers();
  renderCustomerOrders();
  showNotification('Offer submitted successfully!', 'success');
}

function renderOffers() {
  const grid = document.getElementById('offersGrid');
  grid.innerHTML = '';
  
  const offers = db.getOffers().filter(o => o.customer === currentUser);
  offers.forEach(o => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <p><strong>${o.product}</strong></p>
      <p>ID: ${o.id}</p>
      <p>Qty: ${o.qty}</p>
      <p>Offer: ₦${o.off.toLocaleString()}</p>
      <span class="status ${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>`;
    grid.appendChild(card);
  });
}

function renderCustomerOrders() {
  const grid = document.getElementById('ordersGrid');
  grid.innerHTML = '';
  
  const orders = db.getOffers().filter(o => 
    o.customer === currentUser && o.status === 'accepted'
  );
  
  orders.forEach(o => {
    const status = o.supplied === o.qty ? 'complete' : 'accepted';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <p><strong>${o.product}</strong></p>
      <p>ID: ${o.id}</p>
      <p>Qty: ${o.qty}</p>
      <p>Supplied: ${o.supplied}</p>
      <span class="status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
    grid.appendChild(card);
  });
}

//--- Admin product/offers supply management ---
function adminAddProduct() {
  const n = document.getElementById('newProdName').value.trim();
  const p = +document.getElementById('newProdPrice').value;
  const files = document.getElementById('newProdImage').files;
  
  if (!n || !p || !files.length) {
    showNotification('Please provide complete product information', 'error');
    return;
  }
  
  const imgs = [];
  let loaded = 0;
  
  Array.from(files).forEach(f => {
    const r = new FileReader();
    r.onload = e => {
      imgs.push(e.target.result);
      loaded++;
      if (loaded === files.length) {
        db.addProduct(n, p, imgs);
        renderProducts();
        renderAdminProducts();
        document.getElementById('newProdName').value = '';
        document.getElementById('newProdPrice').value = '';
        document.getElementById('newProdImage').value = '';
        showNotification('Product added successfully!', 'success');
      }
    };
    r.readAsDataURL(f);
  });
}

function renderAdminProducts() {
  const grid = document.getElementById('adminProductsGrid');
  grid.innerHTML = '';
  
  const products = db.getProducts();
  products.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <p><strong>${p.name}</strong></p>
      <p>₦${p.price.toLocaleString()}</p>
      <button onclick="adminDelProd(${i})"><i class="fas fa-trash"></i> Delete</button>`;
    grid.appendChild(card);
  });
}

function adminDelProd(i) {
  if (confirm('Are you sure you want to delete this product?')) {
    db.deleteProduct(i);
    renderProducts();
    renderAdminProducts();
    showNotification('Product deleted successfully', 'success');
  }
}

function renderAdminOffers() {
  const grid = document.getElementById('adminOffersGrid');
  grid.innerHTML = '';
  
  const offers = db.getOffers().filter(o => o.status === 'pending');
  offers.forEach(o => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <p><strong>${o.product}</strong></p>
      <p>ID: ${o.id}</p>
      <p>Cust: ${o.customer}</p>
      <p>Qty: ${o.qty}</p>
      <p>Offer: ₦${o.off.toLocaleString()}</p>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button onclick="setOfferStatus('${o.id}','accepted')"><i class="fas fa-check"></i> Accept</button>
        <button onclick="setOfferStatus('${o.id}','rejected')"><i class="fas fa-times"></i> Reject</button>
      </div>`;
    grid.appendChild(card);
  });
}

function setOfferStatus(id, s) {
  if (db.updateOfferStatus(id, s)) {
    renderProducts();
    renderAdminOffers();
    renderAdminSupply();
    renderCustomerOrders();
    showNotification(`Offer ${s === 'accepted' ? 'accepted' : 'rejected'} successfully!`, 'success');
  }
}

function renderAdminSupply() {
  const grid = document.getElementById('adminSupplyGrid');
  grid.innerHTML = '';
  
  const supplies = db.getOffers().filter(o => 
    o.status === 'accepted' && o.supplied < o.qty
  );
  
  supplies.forEach(o => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <p><strong>${o.product}</strong></p>
      <p>ID: ${o.id}</p>
      <p>Cust: ${o.customer}</p>
      <p>Qty: ${o.qty}</p>
      <p>Supplied: ${o.supplied}</p>
      <button class="supply-btn" onclick="adminSupply('${o.id}')"><i class="fas fa-plus"></i> Supply +1</button>`;
    grid.appendChild(card);
  });
}

function adminSupply(id) {
  if (db.supplyProduct(id)) {
    renderAdminSupply();
    renderCustomerOrders();
    showNotification('Supply updated successfully!', 'success');
  }
}

//--- Chat & notifications ---
function sendChat() {
  const inp = document.getElementById('chatInput');
  const t = inp.value.trim();
  
  if (!t) return;
  
  const message = {
    sender: 'customer',
    text: t,
    timestamp: new Date().toLocaleTimeString()
  };
  
  db.addMessage(currentUser, message);
  inp.value = '';
  renderChat();
  
  // Update unread count for admin
  const unread = db.getUnread();
  db.setUnreadCount('admin', (unread.admin || 0) + 1);
  updateNotification();
  
  if (adminMode) {
    populateAdminChatUsers();
    renderAdminChat();
  }
  
  // Show out-of-app notification
  if (!document.hasFocus()) {
    showNotification(`New message from ${currentUser}`, 'info');
  }
}

function renderChat() {
  const c = document.getElementById('chatContainer');
  c.innerHTML = '';
  
  const chats = db.getChats();
  if (chats[currentUser]) {
    chats[currentUser].forEach(m => {
      const d = document.createElement('div');
      d.className = `chat-msg ${m.sender}`;
      d.innerHTML = `
        <span class="sender">${m.sender === 'customer' ? 'You' : 'Admin'}</span>
        ${m.text}
        <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">${m.timestamp}</div>
      `;
      c.appendChild(d);
    });
  }
  
  c.scrollTop = c.scrollHeight;
  db.setUnreadCount(currentUser, 0);
  updateNotification();
}

function populateAdminChatUsers() {
  const sel = document.getElementById('adminChatUserSelect');
  sel.innerHTML = "<option value=''>-- Select Customer --</option>";
  
  const chats = db.getChats();
  for (const u in chats) {
    if (chats[u].length) {
      const unread = db.getUnread();
      const optionText = u + (unread[u] ? ` (${unread[u]})` : '');
      const o = document.createElement('option');
      o.value = u;
      o.textContent = optionText;
      sel.appendChild(o);
    }
  }
}

let adminChatUser = null;
function renderAdminChat() {
  const sel = document.getElementById('adminChatUserSelect');
  adminChatUser = sel.value;
  
  const c = document.getElementById('adminChatContainer');
  c.innerHTML = '';
  
  if (!adminChatUser) return;
  
  const chats = db.getChats();
  if (chats[adminChatUser]) {
    chats[adminChatUser].forEach(m => {
      const d = document.createElement('div');
      d.className = `chat-msg ${m.sender}`;
      d.innerHTML = `
        <span class="sender">${m.sender === 'customer' ? adminChatUser : 'You'}</span>
        ${m.text}
        <div style="font-size:0.75rem; opacity:0.7; margin-top:4px;">${m.timestamp}</div>
      `;
      c.appendChild(d);
    });
  }
  
  c.scrollTop = c.scrollHeight;
  db.setUnreadCount(adminChatUser, 0);
  updateNotification();
}

function adminSendChat() {
  const inp = document.getElementById('adminChatInput');
  const t = inp.value.trim();
  
  if (!t || !adminChatUser) return;
  
  const message = {
    sender: 'admin',
    text: t,
    timestamp: new Date().toLocaleTimeString()
  };
  
  db.addMessage(adminChatUser, message);
  inp.value = '';
  renderAdminChat();
  
  if (currentUser === adminChatUser) {
    renderChat();
    const unread = db.getUnread();
    db.setUnreadCount(currentUser, (unread[currentUser] || 0) + 1);
    updateNotification();
  }
  
  // Show out-of-app notification for customer
  if (currentUser !== adminChatUser) {
    showNotification(`New message from Admin`, 'info');
  }
}

function updateNotification() {
  const unread = db.getUnread();
  
  const a = document.getElementById('chatNotifAdmin');
  a.textContent = unread.admin || '';
  a.className = 'badge' + (unread.admin ? ' show' : '');
  
  const c = document.getElementById('chatNotifCust');
  c.textContent = unread[currentUser] || '';
  c.className = 'badge' + (unread[currentUser] ? ' show' : '');
}

// Initialize with sample data if database is empty
window.addEventListener('load', () => {
  if (db.getProducts().length === 0) {
    // Add sample products
    db.addProduct('Laptop Pro X1', 450000, [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'
    ]);
    db.addProduct('Wireless Headphones', 25000, [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'
    ]);
    db.addProduct('Smartphone Z5', 320000, [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80'
    ]);
    renderProducts();
    renderAdminProducts();
  }
});