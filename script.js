// --- TRANSLATIONS ---
const i18n = {
    en: {
        appName: "Bhatta Manager", loginSubtitle: "Smart Management for Brick Kilns",
        prodToday: "Production Today", presentWorkers: "Present Workers",
        dispatchToday: "Dispatch Today", totalExpense: "Total Expense",
        prodGraph: "Production Graph", quickActions: "Quick Actions",
        addWorker: "Add Worker", addProd: "Add Prod", attendance: "Attendance",
        payment: "Payment", workerList: "Worker List", dailyAttendance: "Daily Attendance",
        saveAttendance: "Save Attendance", recordProduction: "Record Production",
        stage: "Stage", quantity: "Quantity (Bricks)", damaged: "Damaged",
        submit: "Submit Record", history: "History", paymentLedger: "Payment Ledger",
        inventory: "Inventory", addStock: "Add Stock Entry", home: "Home",
        workers: "Workers", production: "Production", payments: "Payments",
        save: "Save", cancel: "Cancel", makePayment: "Make Payment", pay: "Pay"
    },
    hi: {
        appName: "भट्टा मैनेजर", loginSubtitle: "ईंट भट्ठे के लिए स्मार्ट प्रबंधन",
        prodToday: "आज का उत्पादन", presentWorkers: "उपस्थित मजदूर",
        dispatchToday: "आज की डिसपैच", totalExpense: "कुल खर्च",
        prodGraph: "उत्पादन ग्राफ", quickActions: "त्वरित कार्य",
        addWorker: "मजदूर जोड़ें", addProd: "उत्पादन जोड़ें", attendance: "हाजिरी",
        payment: "भुगतान", workerList: "मजदूर सूची", dailyAttendance: "दैनिक हाजिरी",
        saveAttendance: "हाजरी सहेजें", recordProduction: "उत्पादन दर्ज करें",
        stage: "चरण", quantity: "मात्रा (ईंटें)", damaged: "टूटी हुई",
        submit: "रिकॉर्ड जमा करें", history: "इतिहास", paymentLedger: "भुगतान खाता",
        inventory: "स्टॉक", addStock: "स्टॉक जोड़ें", home: "होम",
        workers: "मजदूर", production: "उत्पादन", payments: "भुगतान",
        save: "सहेजें", cancel: "रद्द करें", makePayment: "भुगतान करें", pay: "भुगतान"
    }
};

// --- STATE MANAGEMENT ---
let currentUser = null;
let appData = {};
let currentLang = 'en';
let prodChartInstance = null;

// --- INITIALIZATION ---
function init() {
    const storedUser = localStorage.getItem('bhatta_current_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        loadData();
        showApp();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
    document.getElementById('current-date').innerText = new Date().toLocaleDateString();
}

function loadData() {
    const allData = JSON.parse(localStorage.getItem('bhatta_db') || '{}');
    if (!allData[currentUser.mobile]) {
        // Initialize empty data for new user
        allData[currentUser.mobile] = {
            workers: [],
            attendance: [],
            production: [],
            payments: [],
            inventory: { coal: 0, diesel: 0, soil: 0 }
        };
        localStorage.setItem('bhatta_db', JSON.stringify(allData));
    }
    appData = allData[currentUser.mobile];
    updateDashboard();
}

function saveData() {
    const allData = JSON.parse(localStorage.getItem('bhatta_db') || '{}');
    allData[currentUser.mobile] = appData;
    localStorage.setItem('bhatta_db', JSON.stringify(allData));
    updateDashboard();
}

// --- AUTHENTICATION ---
let otpSent = false;
function handleLogin() {
    const mobile = document.getElementById('login-mobile').value;
    const otpInput = document.getElementById('login-otp');
    const btn = document.getElementById('btn-login-action');

    if (!otpSent) {
        if(mobile.length < 10) return alert("Enter valid mobile");
        otpSent = true;
        otpInput.style.display = 'block';
        btn.innerText = "Verify OTP";
        alert("OTP Sent: 1234 (Demo)");
    } else {
        const otp = otpInput.value;
        if (otp === "1234") {
            currentUser = { mobile: mobile, role: 'Owner' };
            localStorage.setItem('bhatta_current_user', JSON.stringify(currentUser));
            loadData();
            showApp();
        } else {
            alert("Invalid OTP");
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

// --- NAVIGATION ---
function navTo(viewId, navEl = null) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    // Update Nav UI
    if(navEl) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navEl.classList.add('active');
    }

    // Refresh specific views
    if(viewId === 'view-workers') renderWorkers();
    if(viewId === 'view-attendance') renderAttendance();
    if(viewId === 'view-production') renderProdHistory();
    if(viewId === 'view-payments') renderPayments();
    if(viewId === 'view-inventory') renderInventory();
}

// --- DASHBOARD LOGIC ---
function updateDashboard() {
    // Calculate Today's Production
    const today = new Date().toISOString().split('T')[0];
    const todayProd = appData.production
        .filter(p => p.date === today)
        .reduce((sum, p) => sum + (parseInt(p.qty) - parseInt(p.damaged)), 0);
    
    document.getElementById('dash-production').innerText = todayProd.toLocaleString();

    // Calculate Present Workers
    const todayAtt = appData.attendance.filter(a => a.date === today && a.status === 'present');
    document.getElementById('dash-workers').innerText = todayAtt.length;

    // Total Expense
    const totalExp = appData.payments.reduce((sum, p) => sum + parseInt(p.amount), 0);
    document.getElementById('dash-expense').innerText = "₹" + totalExp.toLocaleString();

    // Update Chart
    updateChart(todayProd);
}

function updateChart(todayProd) {
    const ctx = document.getElementById('productionChart').getContext('2d');
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [1000, 1500, 1200, 1700, 1300, 2000, todayProd || 0]; 

    if (prodChartInstance) prodChartInstance.destroy();

    prodChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bricks',
                data: data,
                backgroundColor: '#FF6B00',
                borderRadius: 4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// --- WORKER MODULE ---
function saveWorker() {
    const name = document.getElementById('w-name').value;
    const village = document.getElementById('w-village').value;
    const phone = document.getElementById('w-phone').value;
    const role = document.getElementById('w-role').value;

    if(!name) return alert("Name required");

    appData.workers.push({ id: Date.now(), name, village, phone, role, balance: 0 });
    saveData();
    hideModal('modal-worker');
    renderWorkers();
    
    // Clear inputs
    document.getElementById('w-name').value = '';
    document.getElementById('w-village').value = '';
    document.getElementById('w-phone').value = '';
}

function renderWorkers() {
    const container = document.getElementById('workers-list-container');
    container.innerHTML = '';
    if(appData.workers.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">No workers added yet.</p>';
        return;
    }
    appData.workers.forEach(w => {
        container.innerHTML += `
            <div class="list-item">
                <div>
                    <div style="font-weight:bold;">${w.name}</div>
                    <div style="font-size:12px; color:#777;">${w.village} | ${w.role}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;">Bal: ₹${w.balance}</div>
                    <i class="fas fa-edit" style="color:var(--primary); margin-left:10px;"></i>
                </div>
            </div>
        `;
    });
}

// --- ATTENDANCE MODULE ---
function renderAttendance() {
    const container = document.getElementById('attendance-list-container');
    container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    
    const existing = appData.attendance.find(a => a.date === today);
    
    if(existing) {
        container.innerHTML = '<p style="text-align:center; color:green;">Attendance already marked for today.</p>';
        return;
    }

    if(appData.workers.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Add workers first.</p>';
        return;
    }

    appData.workers.forEach(w => {
        container.innerHTML += `
            <div class="list-item">
                <span>${w.name}</span>
                <div>
                    <label><input type="radio" name="att_${w.id}" value="present" checked> P</label>
                    <label><input type="radio" name="att_${w.id}" value="absent"> A</label>
                </div>
            </div>
        `;
    });
}

function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const records = [];
    
    appData.workers.forEach(w => {
        const status = document.querySelector(`input[name="att_${w.id}"]:checked`).value;
        records.push({ workerId: w.id, date: today, status });
    });

    appData.attendance.push(...records);
    saveData();
    alert("Attendance Saved!");
    renderAttendance();
}

// --- PRODUCTION MODULE ---
function addProduction() {
    const stage = document.getElementById('prod-stage').value;
    const qty = document.getElementById('prod-qty').value;
    const damaged = document.getElementById('prod-damaged').value;
    const today = new Date().toISOString().split('T')[0];

    if(!qty) return alert("Enter quantity");

    appData.production.push({
        id: Date.now(), date: today, stage, qty, damaged
    });
    saveData();
    alert("Production Recorded");
    document.getElementById('prod-qty').value = '';
    document.getElementById('prod-damaged').value = '0';
    renderProdHistory();
}

function renderProdHistory() {
    const container = document.getElementById('prod-history-container');
    container.innerHTML = '';
    const recent = appData.production.slice().reverse().slice(0, 5);
    recent.forEach(p => {
        container.innerHTML += `
            <div class="list-item">
                <span>${p.stage.toUpperCase()} - ${p.date}</span>
                <strong>${p.qty} <small style="color:red">(-${p.damaged})</small></strong>
            </div>
        `;
    });
}

// --- PAYMENT MODULE ---
function renderPayments() {
    const container = document.getElementById('payments-list-container');
    container.innerHTML = '';
    const recent = appData.payments.slice().reverse().slice(0, 10);
    
    if(recent.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">No payments yet.</p>';
        return;
    }

    recent.forEach(p => {
        const worker = appData.workers.find(w => w.id == p.workerId);
        const wName = worker ? worker.name : 'Unknown';
        container.innerHTML += `
            <div class="list-item">
                <div>
                    <div style="font-weight:bold;">${wName}</div>
                    <div style="font-size:12px; color:#777;">${p.type} | ${p.date}</div>
                </div>
                <div style="color:var(--success); font-weight:bold;">- ₹${p.amount}</div>
            </div>
        `;
    });
}

function savePayment() {
    const workerId = document.getElementById('p-worker-select').value;
    const amount = document.getElementById('p-amount').value;
    const type = document.getElementById('p-type').value;
    const today = new Date().toISOString().split('T')[0];

    if(!workerId || !amount) return alert("Fill all fields");

    const workerIndex = appData.workers.findIndex(w => w.id == workerId);
    if(workerIndex > -1) {
        appData.workers[workerIndex].balance -= parseInt(amount); 
    }

    appData.payments.push({
        id: Date.now(), workerId, amount, type, date: today
    });
    saveData();
    hideModal('modal-payment');
    renderPayments();
    document.getElementById('p-amount').value = '';
}

// --- INVENTORY MODULE ---
function renderInventory() {
    document.getElementById('inv-coal').innerText = appData.inventory.coal + " kg";
    document.getElementById('inv-diesel').innerText = appData.inventory.diesel + " L";
    document.getElementById('inv-soil').innerText = appData.inventory.soil + " tons";
}

// --- UTILS ---
function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).style.display = 'flex';
    if(id === 'modal-payment') {
        const select = document.getElementById('p-worker-select');
        select.innerHTML = '';
        appData.workers.forEach(w => {
            select.innerHTML += `<option value="${w.id}">${w.name}</option>`;
        });
    }
}
function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).style.display = 'none';
}

function changeLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(i18n[lang][key]) el.innerText = i18n[lang][key];
    });
}

function toggleFabMenu() {
    alert("Quick Add Menu (Expandable in full version)");
}

// Start App
init();