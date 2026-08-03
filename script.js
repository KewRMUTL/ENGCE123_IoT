"use strict"

// ===================== ตัวแปรสถานะหลักของแอป =====================
const url = "./dataTest.json";
let mainData = [];       // ข้อมูลลูกบ้านทั้งหมดที่โหลดมาจาก JSON
let isLoading = true;    // true = กำลังโหลดข้อมูลอยู่
let fetchStatus = 0;     // เก็บ HTTP status ของการ fetch ล่าสุด
let loggedInHouse = localStorage.getItem('loggedInHouse') || null; // เก็บ Session บ้านที่ล็อกอิน

// ===================== เมนู / การสลับหน้า =====================
const navItems = document.querySelectorAll('nav li[data-target]');
const pages = document.querySelectorAll('.page');

function showPage(target, params) {
    pages.forEach(page => page.classList.remove('active'));        // ปิดทุกหน้าก่อน
    navItems.forEach(li => li.classList.remove('user-select'));    // เอาไฮไลต์เมนูออกก่อน

    const targetPage = document.querySelector(`#page-${target}`);
    if (targetPage) {
        targetPage.classList.add('active');   // เปิดเฉพาะหน้าที่ต้องการ
        renderUserPage(target, params);       // สั่ง render เนื้อหาของหน้านั้น
    }

    const activeLi = document.querySelector(`nav li[data-target="${target}"]`);
    if (activeLi) activeLi.classList.add('user-select');
}

navItems.forEach(li => {
    li.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(li.dataset.target);
    });
});

// ===================== ระบบ Login / Logout ลูกบ้าน =====================
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

function checkLoginState() {
    if (loggedInHouse) {
        loginModal.style.display = 'none';
    } else {
        loginModal.style.display = 'flex';
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const houseInput = document.getElementById('loginHouseNo').value.trim();
    if (houseInput) {
        loggedInHouse = houseInput;
        localStorage.setItem('loggedInHouse', houseInput);
        checkLoginState();
        refreshCurrentPage();
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('loggedInHouse');
    loggedInHouse = null;
    checkLoginState();
});

// ===================== โหลดข้อมูลจาก dataTest.json =====================
async function load(path) {
    try {
        const res = await fetch(path);
        fetchStatus = res.status;
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();
        mainData = data;
        isLoading = false;
        refreshCurrentPage();
    } catch (err) {
        console.log(err);
        isLoading = false;
        if (fetchStatus === 0) fetchStatus = 500;
        refreshCurrentPage();
    }
}

function refreshCurrentPage() {
    const activeLi = document.querySelector('nav li.user-select') || document.querySelector('nav li[data-target="home"]');
    if (activeLi) {
        const target = activeLi.dataset.target;
        renderUserPage(target, null);
    }
}

// ===================== ตัวกลางตัดสินใจว่าจะ render อะไร =====================
function renderUserPage(target, params) {
    const targetPage = document.querySelector(`#page-${target}`);
    let loadingContainer = null;
    if (targetPage) {
        loadingContainer = targetPage.querySelector('.dataLoading') || targetPage.querySelector('#UserData');
    }

    if (isLoading) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text">Loading data...</p>`;
        }
        return;
    }

    if (fetchStatus < 200 || fetchStatus > 299) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text" style="color: red;">Data loading error Please try again later(Code: ${fetchStatus})</p>`;
        }
        return;
    }

    // กรองข้อมูลเฉพาะบ้านที่ล็อกอิน (ถ้ามี)
    let filteredData = mainData;
    if (loggedInHouse) {
        filteredData = mainData.filter(u => u.houseNumber === loggedInHouse);
    }

    if (target === "user") {
        updateData(filteredData);
    } else if (target === "userDetail") {
        moreDetailsUser(Number(params.id));
    } else if (target === "vehicleDetail") {
        vDetail(Number(params.id), Number(params.carIndex));
    } else if (target === "home") {
        renderDashboard(filteredData);
    }
}

// ===================== Render หน้า USER DATA (list) =====================
function updateData(data) {
    const UserData = document.querySelector('#UserData');
    let div = "";
    data.forEach(element => {
        div += `
        <div class="User">
            <h2>${element.id}</h2>
            <h2>${element.houseNumber} (${element.ownerName})</h2>
            <a href="#" data-id="${element.id}" data-target="userDetail">แสดงข้อมูลเพิ่มเติม</a>
        </div>
        `;
    });
    UserData.innerHTML = div || `<p class="loading-text">ไม่พบข้อมูลลูกบ้านบ้านเลขที่ ${loggedInHouse || ''}</p>`;
}

// ===================== คำนวณหลอดสีวันหมดอายุ (Progress Bar) =====================
function parseThaiDateStr(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function createExpiryProgressBar(startDateStr, timeoutDateStr) {
    const start = parseThaiDateStr(startDateStr);
    const end = parseThaiDateStr(timeoutDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24));

    let percent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100));

    let color = '#28a745'; 
    if (percent <= 20 || remainingDays <= 7) {
        color = '#dc3545'; 
    } else if (percent <= 60) {
        color = '#ffc107'; 
    }

    let statusText = `เหลืออีก ${remainingDays} วัน`;
    if (remainingDays <= 0) {
        percent = 0;
        color = '#dc3545';
        statusText = 'หมดอายุแล้ว';
    }

    return `
    <div class="expire-progress-box">
        <div class="expire-info">
            <span>สถานะบัตรสมาชิก (หมดอายุ: ${timeoutDateStr})</span>
            <span><b>${statusText}</b></span>
        </div>
        <div class="progress-track">
            <div class="progress-fill" style="width: ${percent.toFixed(1)}%; background-color: ${color};"></div>
        </div>
    </div>`;
}

// ===================== Render หน้ารายละเอียด user =====================
function moreDetailsUser(id) {
    const user = mainData.find(u => u.id === id);
    const moreUserde = document.querySelector('#page-userDetail');

    if (!user) {
        moreUserde.innerHTML = `<p class="loading-text">ไม่พบข้อมูล</p>`;
        return;
    }

    // สร้างรายการยานพาหนะ (กรองเฉพาะ Car ตัด Motorcycle ออกตามประชุม)
    let vehiclesHTML = '';
    let carCount = 0;

    if (user.vehicles && user.vehicles.length > 0) {
        user.vehicles.forEach((v, index) => {
            if (v.type === "Car") {  // <-- กรองเฉพาะรถยนต์
                carCount++;
                vehiclesHTML += `
                <div class="headVlist">
                    <p class="Vlist">${v.plate}</p>
                    <p class="Vlist">${v.type}</p>
                    <a href="" data-target="vehicleDetail" data-car-index="${index}" data-id="${user.id}">ดูประวัติเข้า-ออก</a>
                </div>`;
            }
        });
    }

    if (carCount === 0) {
        vehiclesHTML = `<div class="headVlist">
                            <p class="Vlist">ไม่มีข้อมูลรถยนต์</p>
                            <p class="Vlist">-</p>
                            <p></p>
                        </div>`;
    }

    const progressBar = createExpiryProgressBar(user.dateMember, user.MemberTimeout);

    moreUserde.innerHTML = `
            <button class="back-btn" onclick="showPage('user')">
            ← กลับ
            </button>
            <section class="homeDetail">
                <div class="homeNumber">
                    <p class="homeList">เลขที่บ้าน</p>
                    <p class="homeList">${user.houseNumber}</p>
                </div>
                <div class="nameOwner">
                    <p class="homeList">ชื่อเจ้าบ้าน</p>
                    <p class="homeList">${user.ownerName}</p>
                </div>
                <div class="TimeData">
                    <p class="homeList">วันที่เข้าอยู่ ${user.regitter ?? '-'}</p>
                    <p class="homeList">วันที่สมัครสมาชิก ${user.dateMember ?? '-'} | วันหมดอายุ ${user.MemberTimeout ?? '-'}</p>
                </div>
                ${progressBar}
            </section>
            <section class="vehicleUser">
                <h1 class="vehicleList">รายละเอียดยานพาหนะ (เฉพาะรถยนต์)</h1>
                <div class="headVlist">
                    <h3 class="Vlist">ป้ายทะเบียน</h3>
                    <h3 class="Vlist">ประเภทยานพาหนะ</h3>
                    <h3 class="Vlist"></h3>
                </div>
                ${vehiclesHTML}
            </section>`;
}

// ===================== แสดงข้อมูลรถแต่ละคัน (Vehicle Detail) =====================
function vDetail(id, carIndex) {
    const user = mainData.find(u => u.id === id);
    const pVdetail = document.querySelector("#page-vehicleDetail");
    if (!user) {
        pVdetail.innerHTML = `<p class="loading-text">ไม่พบข้อมูล</p>`;
        return;
    }
    const data = user.vehicles[carIndex];
    if (!data) {
        pVdetail.innerHTML = `<p class="loading-text">ไม่พบข้อมูลยานพาหนะ</p>`;
        return;
    }

    let timeIn = '';
    let timeOut = '';
    if (data.timeInOut && data.timeInOut.length > 0) {
        data.timeInOut.forEach((t) => {
            timeIn += `<span class="time-record">${t.in || '-'}</span>`;
            timeOut += `<span class="time-record">${t.out || 'ยังไม่ออก'}</span>`;
        });
    } else {
        timeIn += `<span class="time-record">-</span>`;
        timeOut += `<span class="time-record">-</span>`;
    }

    // แก้ไขลิงก์ปุ่มย้อนกลับ ให้เด้งกลับไปที่หน้า userDetail ของลูกบ้านคนนี้
    let page = `
    <button class="back-btn" onclick="showPage('userDetail', { id: ${id} })">
    ← กลับ
    </button>

    <div class="vehicle-card">
        <div class="v-title">ข้อมูลการเข้า-ออกของรถยนต์</div>
        <div class="v-date">Register : ${data.regitter ?? '-'} </div>
        
        <div class="v-grid">
            <div class="v-item">ป้ายทะเบียน : ${data.plate}</div>
            <div class="v-item">ประเภท : ${data.type}</div>
            
            <div class="v-item">เวลาเข้า</div>
            <div class="v-item">เวลาออก</div>
            
            <div class="v-item v-time" id="time-in-list">${timeIn}</div>
            <div class="v-item v-time" id="time-out-list">${timeOut}</div>
        </div>
    </div>`;
    pVdetail.innerHTML = page;
}

// ฟังก์ชันค้นหาลูกบ้าน
function filterUsers() {
    const keyword = document.getElementById("searchUser").value.toLowerCase();
    const filtered = mainData.filter(u => 
        (u.houseNumber.toLowerCase().includes(keyword) || u.ownerName.toLowerCase().includes(keyword)) &&
        (!loggedInHouse || u.houseNumber === loggedInHouse)
    );
    updateData(filtered);
}

// ===================== Event Delegation สำหรับลิงก์ทั้งหมด =====================
document.querySelector('.main-content').addEventListener('click', (e) => {
    const link = e.target.closest('a[data-target]');
    if (!link) return;
    e.preventDefault();

    const { target, ...params } = link.dataset;
    showPage(target, params);
});

// ===================== Render Dashboard (คำนวณเฉพาะ Car) =====================
function renderDashboard(dataList) {
    let vehicleTotal = 0;
    let carIn = 0;
    let carOut = 0;
    let insideVillageCount = 0;

    dataList.forEach(user => {
        user.vehicles.forEach(vehicle => {
            // กรองนับสถิติเฉพาะ "Car"
            if (vehicle.type === "Car") {
                vehicleTotal++;
                if (vehicle.timeInOut && vehicle.timeInOut.length > 0) {
                    vehicle.timeInOut.forEach(log => {
                        if (log.in) carIn++;
                        if (log.out) carOut++;
                        if (log.in && !log.out) insideVillageCount++;
                    });
                }
            }
        });

        // ดึงสถานะสมาชิกของบ้านที่ล็อกอินอยู่
        document.getElementById("residentStatus").textContent = user.memberStatus || 'Active';
        document.getElementById("expireDateText").textContent = user.MemberTimeout || '-';
    });

    document.getElementById("vehicleTotal").textContent = vehicleTotal;
    document.getElementById("carIn").textContent = carIn;
    document.getElementById("carOut").textContent = carOut;
    document.getElementById("insideVillage").textContent = insideVillageCount;

    document.getElementById("welcomeText").textContent = loggedInHouse ? `Dashboard (บ้านเลขที่ ${loggedInHouse})` : "Resident Dashboard";
    document.getElementById("todayDate").textContent = new Date().toLocaleDateString("th-TH", { dateStyle: "full" });
}

// เริ่มต้นเช็คสถานะและโหลดข้อมูล
checkLoginState();
showPage('home');
load(url);
