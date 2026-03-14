// ---------- STATE ----------
let currentUser = null;
let appData = {
    workers: [],
    attendance: [],
    production: [],
    payments: [],
    orders: [],
    inventory: { coal: 5000, diesel: 800, soil: 20 },
    stockHistory: []
};
let prodChartInstance = null;
let otpSent = false;

// ---------- INIT ----------
function init() {
    const storedUser = localStorage.getItem('bhatta_current_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        loadData();
        showApp();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
    document.getElementById('current-date').innerText = new Date().toLocaleDateString();
}

function loadData() {
    const allData = JSON.parse(localStorage.getItem('bhatta_db') || '{}');
    if (!allData[currentUser.mobile]) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        allData[currentUser.mobile] = {
            workers: [{ id: Date.now() - 100, name: 'Ramesh', village: 'Sonepur', phone: '9876543210', role: 'labor', balance: 2000 }],
            attendance: [],
            production: [{ id: Date.now() - 200, date: today, stage: 'jalai', qty: 4500, damaged: 100 }],
            payments: [],
            orders: [{ id: Date.now() - 400, customer: 'Ram Traders', qty: 10000, rate: 7500, advance: 5000, status: 'pending', date: today }],
            inventory: { coal: 5200, diesel: 750, soil: 22 },
            stockHistory: [{ material: 'coal', change: +200, note: 'purchase', date: yesterday }]
        };
        localStorage.setItem('bhatta_db', JSON.stringify(allData));
    }
    appData = allData[currentUser.mobile];
    if (!appData.inventory) appData.inventory = { coal: 5000, diesel: 800, soil: 20 };
    if (!appData.stockHistory) appData.stockHistory = [];
    updateDashboard();
}

function saveData() {
    const allData = JSON.parse(localStorage.getItem('bhatta_db') || '{}');
    allData[currentUser.mobile] = appData;
    localStorage.setItem('bhatta_db', JSON.stringify(allData));
    updateDashboard();
}

// ---------- AUTH ----------
function handleLogin() {
    const mobileInput = document.getElementById('login-mobile');
    const otpInput = document.getElementById('login-otp');
    const btn = document.getElementById('btn-login-action');

    let mobile = mobileInput.value.trim();
    mobile = mobile.replace(/\D/g, '');

    if (!otpSent) {
        if (mobile.length !== 10) {
            alert("Please enter a valid 10-digit mobile number");
            return;
        }
        otpSent = true;
        otpInput.style.display = 'block';
        btn.innerText = "Verify OTP";
        alert("OTP 1234 sent to " + mobile);
    } else {
        const otp = otpInput.value.trim();
        if (otp === "1234") {
            currentUser = { mobile: mobile };
            localStorage.setItem('bhatta_current_user', JSON.stringify(currentUser));
            loadData();
            showApp();
        } else {
            alert("Invalid OTP. Use 1234");
        }
    }
}

function logout() {
    localStorage.removeItem('bhatta_current_user');
    location.reload();
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    navTo('view-dashboard');
}

// ---------- NAVIGATION ----------
function navTo(viewId, el) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    if (viewId === 'view-workers') renderWorkers();
    if (viewId === 'view-attendance') renderAttendance();
    if (viewId === 'view-production') renderProdHistory();
    if (viewId === 'view-payments') renderPayments();
    if (viewId === 'view-orders') renderOrders();
    if (viewId === 'view-inventory') renderInventory();
}

// ---------- DASHBOARD ----------
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayProd = appData.production
        .filter(p => p.date === today)
        .reduce((s, p) => s + (parseInt(p.qty) - parseInt(p.damaged)), 0);
    document.getElementById('dash-production').innerText = todayProd;
    
    const present = appData.attendance
        .filter(a => a.date === today && a.status === 'present').length;
    document.getElementById('dash-workers').innerText = present;
    
    const dispatchedToday = appData.orders
        .filter(o => o.date === today && o.status === 'dispatched')
        .reduce((s, o) => s + parseInt(o.qty), 0);
    document.getElementById('dash-dispatched').innerText = dispatchedToday;
    
    const totalExp = appData.payments
        .reduce((s, p) => s + parseInt(p.amount), 0);
    document.getElementById('dash-expense').innerText = '₹' + totalExp;

    // Credit calculation
    let credit = 0;
    appData.orders.filter(o => o.status !== 'dispatched').forEach(o => {
        const val = (parseInt(o.qty) * parseInt(o.rate)) / 1000;
        credit += val - (parseInt(o.advance) || 0);
    });
    document.getElementById('dash-credit').innerText = '₹' + Math.max(0, credit);
    
    // Profit calculation
    const revenue = appData.orders
        .filter(o => o.status === 'dispatched')
        .reduce((s, o) => s + (parseInt(o.qty) * parseInt(o.rate) / 1000), 0);
    document.getElementById('dash-profit').innerText = '₹' + Math.max(0, revenue - totalExp);
    
    // Pending orders count
    document.getElementById('dash-pending-orders').innerText = 
        appData.orders.filter(o => o.status !== 'dispatched').length;
    
    updateChart();
}

function updateChart() {
    const ctx = document.getElementById('productionChart').getContext('2d');
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let ds = d.toISOString().split('T')[0];
        labels.push(ds.slice(5));
        let dayProd = appData.production
            .filter(p => p.date === ds)
            .reduce((s, p) => s + (parseInt(p.qty) - parseInt(p.damaged)), 0);
        data.push(dayProd);
    }
    if (prodChartInstance) prodChartInstance.destroy();
    prodChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Bricks',
                data: data,
                backgroundColor: '#f97316'
            }]
        },
        options: {
            plugins: { legend: { display: false } }
        }
    });
}

// ---------- WORKER ----------
function saveWorker() {
    const name = document.getElementById('w-name').value.trim();
    if (!name) return alert("Name required");
    appData.workers.push({
        id: Date.now(),
        name: name,
        village: document.getElementById('w-village').value,
        phone: document.getElementById('w-phone').value,
        role: document.getElementById('w-role').value,
        balance: 0
    });
    saveData();
    hideModal('modal-worker');
    renderWorkers();
    document.getElementById('w-name').value = '';
}

function renderWorkers() {
    const c = document.getElementById('workers-list-container');
    if (appData.workers.length === 0) {
        c.innerHTML = '<p>No workers</p>';
        return;
    }
    c.innerHTML = appData.workers.map(w => `
        <div class="list-item">
            <div>
                <b>${w.name}</b><br>
                <small>${w.village} | ${w.role}</small>
            </div>
            <div>Bal: ₹${w.balance}</div>
        </div>
    `).join('');
}

// ---------- ATTENDANCE ----------
function renderAttendance() {
    const c = document.getElementById('attendance-list-container');
    c.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    
    if (appData.attendance.some(a => a.date === today)) {
        c.innerHTML = '<p>Attendance already marked</p>';
        return;
    }
    if (!appData.workers.length) {
        c.innerHTML = '<p>Add workers first</p>';
        return;
    }
    appData.workers.forEach(w => {
        c.innerHTML += `
            <div class="list-item">
                <span>${w.name}</span>
                <div>
                    <label>
                        <input type="radio" name="att_${w.id}" value="present" checked> P
                    </label>
                    <label style="margin-left:10px;">
                        <input type="radio" name="att_${w.id}" value="absent"> A
                    </label>
                </div>
            </div>
        `;
    });
}

function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const records = [];
    appData.workers.forEach(w => {
        const sel = document.querySelector(`input[name="att_${w.id}"]:checked`);
        if (sel) records.push({ workerId: w.id, date: today, status: sel.value });
    });
    if (!records.length) return alert("No data");
    appData.attendance = appData.attendance.filter(a => a.date !== today);
    appData.attendance.push(...records);
    saveData();
    alert("Saved");
    renderAttendance();
}

// ---------- PRODUCTION ----------
function addProduction() {
    const stage = document.getElementById('prod-stage').value;
    const qty = parseInt(document.getElementById('prod-qty').value);
    const damaged = parseInt(document.getElementById('prod-damaged').value) || 0;
    if (!qty) return alert("Enter quantity");
    appData
