// ========== GLOBAL STATE & CONSTANTS ==========
let currentUser = null;                // Logged in user object
const STORAGE_KEY_PREFIX = 'bhatta_';   // Prefix for all user data
const USERS_KEY = 'bhatta_users';       // Key for users collection
let charts = { production: null, profit: null };

// DOM Elements (cached after DOM ready)
let authContainer, appContainer, loginPage, registerPage, otpPage;
let loginForm, registerForm, otpForm, logoutBtn, darkModeToggle;
let sidebarMenu, userInfoSidebar, dashboardTitle, liveDateTime;
let kpiCards, recentOrdersTable, creditSnapshot;
let productionChartCanvas, profitChartCanvas;
let addWorkerModal, addWorkerForm, closeModalButtons;
let workersView, attendanceView, productionView, ordersView, dispatchView, inventoryView, expensesView, creditView, reportsView;
let addWorkerBtn, markAttendanceBtn, bulkAttendanceBtn, addProductionBtn, addOrderBtn, addDispatchBtn, adjustStockBtn, addExpenseBtn, recordPaymentBtn;
let notificationBtn, notificationsPanel, profileBtn, profileMenu, logoutDropdown, mobileMenuToggle;
let loadingOverlay;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    attachEventListeners();
    checkExistingSession();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    initCharts();
    initNetworkListener();
});

function cacheElements() {
    authContainer = document.getElementById('authContainer');
    appContainer = document.getElementById('appContainer');
    loginPage = document.getElementById('loginPage');
    registerPage = document.getElementById('registerPage');
    otpPage = document.getElementById('otpPage');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    otpForm = document.getElementById('otpForm');
    logoutBtn = document.getElementById('logoutBtn');
    darkModeToggle = document.getElementById('darkModeToggle');
    sidebarMenu = document.getElementById('sidebarMenu');
    userInfoSidebar = document.getElementById('userInfoSidebar');
    dashboardTitle = document.getElementById('dashboardTitle');
    liveDateTime = document.getElementById('liveDateTime');
    kpiCards = document.getElementById('kpiCards');
    recentOrdersTable = document.getElementById('recentOrdersTable');
    creditSnapshot = document.getElementById('creditSnapshot');
    productionChartCanvas = document.getElementById('productionChart');
    profitChartCanvas = document.getElementById('profitChart');
    addWorkerModal = document.getElementById('addWorkerModal');
    addWorkerForm = document.getElementById('addWorkerForm');
    closeModalButtons = document.querySelectorAll('.close-modal');
    workersView = document.getElementById('workersView');
    attendanceView = document.getElementById('attendanceView');
    productionView = document.getElementById('productionView');
    ordersView = document.getElementById('ordersView');
    dispatchView = document.getElementById('dispatchView');
    inventoryView = document.getElementById('inventoryView');
    expensesView = document.getElementById('expensesView');
    creditView = document.getElementById('creditView');
    reportsView = document.getElementById('reportsView');
    addWorkerBtn = document.getElementById('addWorkerBtn');
    markAttendanceBtn = document.getElementById('markAttendanceBtn');
    bulkAttendanceBtn = document.getElementById('bulkAttendanceBtn');
    addProductionBtn = document.getElementById('addProductionBtn');
    addOrderBtn = document.getElementById('addOrderBtn');
    addDispatchBtn = document.getElementById('addDispatchBtn');
    adjustStockBtn = document.getElementById('adjustStockBtn');
    addExpenseBtn = document.getElementById('addExpenseBtn');
    recordPaymentBtn = document.getElementById('recordPaymentBtn');
    notificationBtn = document.getElementById('notificationBtn');
    notificationsPanel = document.getElementById('notificationsPanel');
    profileBtn = document.getElementById('profileBtn');
    profileMenu = document.getElementById('profileMenu');
    logoutDropdown = document.getElementById('logoutDropdown');
    mobileMenuToggle = document.getElementById('mobileMenuToggle');
    loadingOverlay = document.getElementById('loadingOverlay');

    // Show login/show register links
    document.getElementById('showRegister').addEventListener('click', (e) => { e.preventDefault(); showRegister(); });
    document.getElementById('showLogin').addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
}

function attachEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    otpForm.addEventListener('submit', handleOtpVerification);
    logoutBtn.addEventListener('click', logout);
    if (logoutDropdown) logoutDropdown.addEventListener('click', logout);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    profileBtn?.addEventListener('click', toggleProfileMenu);
    notificationBtn?.addEventListener('click', toggleNotifications);
    mobileMenuToggle?.addEventListener('click', toggleSidebar);
    closeModalButtons.forEach(btn => btn.addEventListener('click', closeAllModals));
    if (addWorkerBtn) addWorkerBtn.addEventListener('click', () => openModal('addWorkerModal'));
    if (addWorkerForm) addWorkerForm.addEventListener('submit', handleAddWorker);
    // Add similar listeners for other module buttons...
    // (Due to space, we'll only implement a few; full code would have all)
}

// ========== AUTHENTICATION FUNCTIONS ==========
function handleLogin(e) {
    e.preventDefault();
    const mobile = document.getElementById('loginMobile').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = getAllUsers();
    const user = users.find(u => u.mobile === mobile);
    if (!user) {
        alert('User not found. Please register.');
        return;
    }
    if (password && user.password !== password) {
        alert('Invalid password');
        return;
    }
    // Simulate sending OTP
    pendingRegistration = { ...user, isLogin: true };
    document.getElementById('otpMobileDisplay').innerText = mobile;
    showOtp();
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const role = document.getElementById('regRole').value;
    const password = document.getElementById('regPassword').value;

    if (getAllUsers().some(u => u.mobile === mobile)) {
        alert('Mobile already registered. Please login.');
        return;
    }

    pendingRegistration = {
        id: generateId(),
        name,
        mobile,
        role,
        password: password || ''
    };
    document.getElementById('otpMobileDisplay').innerText = mobile;
    showOtp();
}

function handleOtpVerification(e) {
    e.preventDefault();
    const otp = document.getElementById('otpCode').value.trim();
    if (otp !== '123456') {
        alert('Invalid OTP (use 123456 for demo)');
        return;
    }
    if (!pendingRegistration) {
        alert('Session expired. Please restart.');
        showLogin();
        return;
    }

    if (!pendingRegistration.isLogin) {
        // New registration: save user
        const users = getAllUsers();
        users.push(pendingRegistration);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    currentUser = { ...pendingRegistration };
    delete currentUser.password; // don't store password in memory
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Initialize user data stores if needed (they will be created on first access)
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    updateSidebarUserInfo();
    renderSidebarMenu();
    showDashboard();
    refreshKPIs();
    refreshCharts();
    refreshRecentOrders();
    refreshCreditSnapshot();
    document.getElementById('otpCode').value = '';
    pendingRegistration = null;
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    showLogin();
}

// ========== USER DATA HELPERS ==========
function getAllUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function userStorageKey(module) {
    if (!currentUser) return null;
    return `${STORAGE_KEY_PREFIX}${currentUser.id}_${module}`;
}

function loadData(module, defaultValue = []) {
    const key = userStorageKey(module);
    if (!key) return defaultValue;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function saveData(module, data) {
    const key = userStorageKey(module);
    if (key) localStorage.setItem(key, JSON.stringify(data));
}

// ========== UI UPDATE FUNCTIONS ==========
function updateSidebarUserInfo() {
    if (!currentUser) return;
    let icon = 'user';
    if (currentUser.role === 'owner') icon = 'crown';
    else if (currentUser.role === 'supervisor') icon = 'clipboard';
    userInfoSidebar.innerHTML = `
        <p class="text-xs text-gray-500 uppercase">Logged in as</p>
        <p class="font-medium flex items-center"><i class="fa-solid fa-${icon} mr-2 text-orange-600"></i> ${currentUser.name} (${currentUser.role})</p>
    `;
    document.getElementById('profileName').innerText = currentUser.name.split(' ')[0];
}

function renderSidebarMenu() {
    let items = [];
    if (currentUser.role === 'owner') {
        items = ['Dashboard', 'Workers', 'Attendance', 'Production', 'Orders', 'Dispatch', 'Inventory', 'Expenses', 'Credit', 'Reports'];
    } else if (currentUser.role === 'supervisor') {
        items = ['Dashboard', 'Workers', 'Attendance', 'Production', 'Orders', 'Dispatch', 'Expenses', 'Credit'];
    } else {
        items = ['Dashboard', 'My Attendance', 'My Tasks'];
    }
    const menuHtml = items.map(item => {
        const view = item.toLowerCase().replace(/\s/g, '');
        const icon = getIconForMenuItem(item);
        return `<a href="#" data-view="${view}" class="menu-item"><i class="fa-solid fa-${icon}"></i><span>${item}</span></a>`;
    }).join('');
    sidebarMenu.innerHTML = menuHtml;
    document.querySelectorAll('.menu-item').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const view = a.dataset.view;
            if (view === 'dashboard') showDashboard();
            else showModuleView(view);
        });
    });
}

function getIconForMenuItem(item) {
    const map = {
        'dashboard': 'chart-pie',
        'workers': 'users',
        'attendance': 'clock',
        'production': 'industry',
        'orders': 'cart-shopping',
        'dispatch': 'truck-fast',
        'inventory': 'warehouse',
        'expenses': 'file-invoice',
        'credit': 'credit-card',
        'reports': 'chart-line',
        'my attendance': 'user-clock',
        'my tasks': 'list'
    };
    return map[item.toLowerCase()] || 'circle';
}

function showDashboard() {
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('moduleViews').classList.add('hidden');
    dashboardTitle.innerText = 'Dashboard';
    refreshKPIs();
    refreshCharts();
    refreshRecentOrders();
    refreshCreditSnapshot();
}

function showModuleView(viewName) {
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('moduleViews').classList.remove('hidden');
    document.querySelectorAll('.module-view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(viewName + 'View');
    if (target) {
        target.classList.remove('hidden');
        dashboardTitle.innerText = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        // Load specific data
        if (viewName === 'workers') loadWorkersView();
        else if (viewName === 'attendance') loadAttendanceView();
        else if (viewName === 'production') loadProductionView();
        else if (viewName === 'orders') loadOrdersView();
        else if (viewName === 'dispatch') loadDispatchView();
        else if (viewName === 'inventory') loadInventoryView();
        else if (viewName === 'expenses') loadExpensesView();
        else if (viewName === 'credit') loadCreditView();
        else if (viewName === 'reports') loadReportsView();
    } else {
        dashboardTitle.innerText = viewName;
    }
}

// ========== DASHBOARD DATA REFRESH ==========
function refreshKPIs() {
    const workers = loadData('workers', []);
    const attendance = loadData('attendance', []);
    const orders = loadData('orders', []);
    const production = loadData('production', []);
    const expenses = loadData('expenses', []);
    const credit = loadData('credit', []);
    const dispatch = loadData('dispatch', []);

    const totalWorkers = workers.length;
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today).length;
    const totalProduction = production.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const ordersToday = orders.filter(o => o.date === today).length;
    const dispatchedToday = dispatch.filter(d => d.date === today).length;
    const pendingDeliveries = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
    const totalIncome = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const pendingCredit = credit.reduce((sum, c) => sum + (c.balance || 0), 0);

    const kpiHtml = `
        <div class="kpi-card"><div class="kpi-content"><p>Total workers</p><p>${totalWorkers}</p></div><i class="fa-solid fa-users kpi-icon text-orange"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Today's attendance</p><p>${todayAttendance} / ${totalWorkers}</p></div><i class="fa-solid fa-clock kpi-icon text-blue"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Production (total)</p><p>${totalProduction}</p></div><i class="fa-solid fa-industry kpi-icon text-green"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Orders today</p><p>${ordersToday}</p></div><i class="fa-solid fa-cart-shopping kpi-icon text-purple"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Dispatched today</p><p>${dispatchedToday}</p></div><i class="fa-solid fa-truck-fast kpi-icon text-teal"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Pending deliveries</p><p>${pendingDeliveries}</p></div><i class="fa-solid fa-hourglass-half kpi-icon text-red"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Total income</p><p>₹${totalIncome}</p></div><i class="fa-solid fa-indian-rupee-sign kpi-icon text-emerald"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Total expenses</p><p>₹${totalExpenses}</p></div><i class="fa-solid fa-file-invoice kpi-icon text-rose"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Net profit</p><p>₹${netProfit}</p></div><i class="fa-solid fa-chart-line kpi-icon text-amber"></i></div>
        <div class="kpi-card"><div class="kpi-content"><p>Pending credit</p><p>₹${pendingCredit}</p></div><i class="fa-solid fa-hand-holding-dollar kpi-icon text-indigo"></i></div>
    `;
    kpiCards.innerHTML = kpiHtml;
}

function refreshCharts() {
    // Production chart (dummy data – in real app, fetch from production records)
    if (charts.production) charts.production.destroy();
    charts.production = new Chart(productionChartCanvas, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Bricks (thousands)',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#f97316',
                backgroundColor: 'rgba(249,115,22,0.1)',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    if (charts.profit) charts.profit.destroy();
    charts.profit = new Chart(profitChartCanvas, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                { label: 'Income', data: [0, 0, 0, 0, 0, 0], backgroundColor: '#10b981' },
                { label: 'Expenses', data: [0, 0, 0, 0, 0, 0], backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });
}

function refreshRecentOrders() {
    const orders = loadData('orders', []).slice(0, 5);
    if (orders.length === 0) {
        recentOrdersTable.innerHTML = '<div class="empty-state"><i class="fa-regular fa-receipt"></i><p>No orders yet</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Customer</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
    orders.forEach(o => {
        html += `<tr><td>${o.customer}</td><td>${o.qty}</td><td>₹${o.amount}</td><td><span class="status-badge status-${o.status.toLowerCase().replace(' ', '-')}">${o.status}</span></td></tr>`;
    });
    html += '</tbody></table>';
    recentOrdersTable.innerHTML = html;
}

function refreshCreditSnapshot() {
    const credit = loadData('credit', []);
    const total = credit.reduce((s, c) => s + (c.balance || 0), 0);
    let html = `<p class="text-2xl font-bold">₹${total}</p><p class="text-sm text-gray-500">from ${credit.length} customers</p>`;
    credit.slice(0, 3).forEach(c => {
        html += `<div class="flex justify-between mt-2"><span>${c.customer}</span><span class="text-red-600">₹${c.balance}</span></div>`;
    });
    creditSnapshot.innerHTML = html;
}

// ========== MODULE VIEWS ==========
function loadWorkersView() {
    const workers = loadData('workers', []);
    const container = document.getElementById('workersTableContainer');
    if (workers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-users"></i><p>No workers added yet. Click "Add Worker" to get started.</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Actions</th></tr></thead><tbody>';
    workers.forEach(w => {
        html += `<tr><td>${w.name}</td><td>${w.phone}</td><td>${w.type}</td><td>
            <button class="btn-outline btn-sm" onclick="editWorker('${w.id}')"><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="btn-outline btn-sm text-red" onclick="deleteWorker('${w.id}')"><i class="fa-regular fa-trash-can"></i></button>
        </td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function loadAttendanceView() { /* similar */ }
function loadProductionView() { /* similar */ }
function loadOrdersView() { /* similar */ }
function loadDispatchView() { /* similar */ }
function loadInventoryView() { /* similar */ }
function loadExpensesView() { /* similar */ }
function loadCreditView() { /* similar */ }
function loadReportsView() { /* similar */ }

// ========== CRUD OPERATIONS ==========
function handleAddWorker(e) {
    e.preventDefault();
    const name = document.getElementById('workerName').value.trim();
    const phone = document.getElementById('workerPhone').value.trim();
    const address = document.getElementById('workerAddress').value.trim();
    const type = document.getElementById('workerType').value;
    const photo = document.getElementById('workerPhoto').value.trim();

    if (!name || !phone) {
        alert('Name and phone are required');
        return;
    }

    const workers = loadData('workers', []);
    const newWorker = {
        id: generateId(),
        name,
        phone,
        address,
        type,
        photo: photo || null,
        createdAt: new Date().toISOString()
    };
    workers.push(newWorker);
    saveData('workers', workers);
    closeAllModals();
    addWorkerForm.reset();
    loadWorkersView();
    refreshKPIs(); // Update total workers on dashboard
}

function editWorker(id) {
    // Open modal with data
}

function deleteWorker(id) {
    if (confirm('Are you sure?')) {
        let workers = loadData('workers', []);
        workers = workers.filter(w => w.id !== id);
        saveData('workers', workers);
        loadWorkersView();
        refreshKPIs();
    }
}

// ========== MODAL HANDLING ==========
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// ========== UI TOGGLES ==========
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    const icon = document.getElementById('darkModeIcon');
    if (isDark) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function toggleProfileMenu() {
    profileMenu.classList.toggle('hidden');
}

function toggleNotifications() {
    notificationsPanel.classList.toggle('hidden');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ========== DATE & TIME ==========
function updateDateTime() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    liveDateTime.innerText = now.toLocaleDateString(undefined, options);
}

// ========== NETWORK STATUS ==========
function initNetworkListener() {
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (navigator.onLine) {
        statusEl.innerText = 'Online';
        statusEl.parentElement.className = 'connection-status text-green-600';
    } else {
        statusEl.innerText = 'Offline';
        statusEl.parentElement.className = 'connection-status text-red-600';
    }
}

// ========== CHECK EXISTING SESSION ==========
function checkExistingSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        updateSidebarUserInfo();
        renderSidebarMenu();
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginPage.classList.remove('hidden');
    registerPage.classList.add('hidden');
    otpPage.classList.add('hidden');
}

function showRegister() {
    loginPage.classList.add('hidden');
    registerPage.classList.remove('hidden');
    otpPage.classList.add('hidden');
}

function showOtp() {
    loginPage.classList.add('hidden');
    registerPage.classList.add('hidden');
    otpPage.classList.remove('hidden');
}

// ========== CHART INIT ==========
function initCharts() {
    // Dummy initialization; will be replaced on refresh
    refreshCharts();
}

// ========== EXPOSE GLOBALLY FOR INLINE HANDLERS ==========
window.editWorker = editWorker;
window.deleteWorker = deleteWorker;
// etc...
    
