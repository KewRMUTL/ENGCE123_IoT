"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const BASE_API_URL = "https://api-node-iot.onrender.com";
    const CREATE_USER_API = `${BASE_API_URL}/api/users/createUser`;
    const LOCAL_JSON_URL = "./dataTest.json";

    let mainData = [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // Elements
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const navItems = document.querySelectorAll('nav li[data-target]');
    const pages = document.querySelectorAll('.page');
    
    const qrModal = document.getElementById('qrModal');
    const btnCloseQr = document.getElementById('btnCloseQr');
    const qrImageContainer = document.getElementById('qrImageContainer');
    const qrDataText = document.getElementById('qrDataText');

    function updateAuthUI() {
        if (currentUser) {
            if (authModal) authModal.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (authModal) authModal.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    if (tabLoginBtn && tabRegisterBtn) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        });

        tabRegisterBtn.addEventListener('click', () => {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
        });
    }

    // 1. ระบบเข้าสู่ระบบ (Strict Checking: ตรวจสอบทั้ง Username/เลขบ้าน และ Password ให้ตรงเป๊ะ)
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('loginUsername').value.trim();
            const inputPass = document.getElementById('loginPassword').value.trim();

            const user = mainData.find(u => 
                (u.houseNumber === inputUser || u.username === inputUser) && 
                u.password === inputPass
            );

            if (user) {
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                updateAuthUI();
                renderPage('home');
            } else {
                alert('เลขที่บ้าน/ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง!\n(ตัวอย่างทดสอบ: บ้านเลขที่ 158/1 | รหัสผ่าน pass123)');
            }
        });
    }

    // 2. ระบบลงทะเบียน (ส่งข้อมูลไปยัง DB ครบทุกฟิลด์ตามตาราง Users)
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const houseNo = document.getElementById('regHouseNo').value.trim();
            const name = document.getElementById('regName').value.trim();
            const startDate = document.getElementById('regMemberStart').value;
            const expireDate = document.getElementById('regMemberExpire').value;
            const password = document.getElementById('regPassword').value.trim();

            const todayStr = new Date().toISOString().split('T')[0];

            const payload = {
                houseNumber: houseNo,
                ownerName: name,
                registerDate: todayStr,
                memberStartDate: startDate,
                memberExpireDate: expireDate,
                password: password
            };

            console.log("ส่งข้อมูลลงทะเบียนไปยัง API:", payload);

            try {
                const response = await fetch(CREATE_USER_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    console.log("บันทึกลง Database สำเร็จ");
                }
            } catch (err) {
                console.error("API Error:", err);
            }

            const newUser = {
                id: mainData.length + 1,
                username: houseNo,
                ...payload,
                vehicles: []
            };

            mainData.push(newUser);
            currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            alert(`ลงทะเบียนสำเร็จสำหรับบ้านเลขที่ ${houseNo}! ข้อมูลถูกบันทึกเรียบร้อยแล้ว`);
            updateAuthUI();
            renderPage('home');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            currentUser = null;
            updateAuthUI();
        });
    }

    if (btnCloseQr) {
        btnCloseQr.addEventListener('click', () => {
            qrModal.style.display = 'none';
        });
    }

    function renderPage(target, params = null) {
        pages.forEach(page => page.classList.remove('active'));
        navItems.forEach(li => li.classList.remove('user-select'));

        const targetPage = document.querySelector(`#page-${target}`);
        if (targetPage) targetPage.classList.add('active');

        const activeLi = document.querySelector(`nav li[data-target="${target}"]`);
        if (activeLi) activeLi.classList.add('user-select');

        if (target === "home") {
            const filteredData = currentUser ? mainData.filter(u => u.houseNumber === currentUser.houseNumber) : mainData;
            renderDashboard(filteredData.length > 0 ? filteredData : [currentUser]);
        } else if (target === "user") {
            renderDirectUserDetail();
        } else if (target === "vehicleDetail" && params) {
            renderVehicleDetail(Number(params.id), Number(params.carIndex));
        }
    }

    navItems.forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            renderPage(li.dataset.target);
        });
    });

    function parseDate(dateStr) {
        if (!dateStr) return new Date();
        if (dateStr.includes('-')) return new Date(dateStr);
        const parts = dateStr.split('/');
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }

    function formatDateDisplay(dateStr) {
        if (!dateStr) return '-';
        const d = parseDate(dateStr);
        return d.toLocaleDateString('th-TH');
    }

    function createExpiryProgressBar(startDateStr, timeoutDateStr) {
        const start = parseDate(startDateStr);
        const end = parseDate(timeoutDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24));

        let percent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100));
        let color = '#28a745'; 
        if (percent <= 20 || remainingDays <= 7) color = '#dc3545';
        else if (percent <= 60) color = '#ffc107';

        let statusText = `เหลืออีก ${remainingDays} วัน`;
        if (remainingDays <= 0) {
            percent = 0;
            color = '#dc3545';
            statusText = 'หมดอายุแล้ว';
        }

        return `
        <div class="expire-progress-box">
            <div class="expire-info">
                <span>สถานะบัตรสมาชิก (หมดอายุ: ${formatDateDisplay(timeoutDateStr)})</span>
                <span><b>${statusText}</b></span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width: ${percent.toFixed(1)}%; background-color: ${color};"></div>
            </div>
        </div>`;
    }

    // 5. Render หน้า USER DATA และสร้าง QR Code IoT ที่สอดคล้องกับฝั่งหลังบ้าน
    function renderDirectUserDetail() {
        const container = document.getElementById('userDirectDetail');
        const user = currentUser || mainData[0];
        if (!container || !user) return;

        let vehiclesHTML = '';
        let carCount = 0;

        if (user.vehicles && user.vehicles.length > 0) {
            user.vehicles.forEach((v, index) => {
                if (v.type === "Car") { 
                    carCount++;
                    vehiclesHTML += `
                    <div class="headVlist">
                        <p class="Vlist">${v.plate}</p>
                        <p class="Vlist">รถยนต์</p> <!-- ปรับตามข้อ 5 -->
                        <a href="#" data-target="vehicleDetail" data-car-index="${index}" data-id="${user.id}">ดูประวัติเข้า-ออก</a>
                    </div>`;
                }
            });
        }

        if (carCount === 0) {
            vehiclesHTML = `<div class="headVlist">
                                <p class="Vlist">ไม่มีข้อมูลรถยนต์ที่ลงทะเบียน</p>
                                <p class="Vlist">-</p>
                                <p></p>
                            </div>`;
        }

        const progressBar = createExpiryProgressBar(user.memberStartDate, user.memberExpireDate);

        container.innerHTML = `
            <div class="homeNumber">
                <p class="homeList">เลขที่บ้าน</p>
                <p class="homeList">${user.houseNumber}</p>
            </div>
            <div class="nameOwner">
                <p class="homeList">ชื่อเจ้าบ้าน</p>
                <p class="homeList">${user.ownerName}</p>
            </div>
            <div class="TimeData">
                <p class="homeList">วันที่เข้าอยู่: ${formatDateDisplay(user.registerDate)}</p>
                <p class="homeList">วันที่เริ่มสมาชิก: ${formatDateDisplay(user.memberStartDate)} | หมดอายุ: ${formatDateDisplay(user.memberExpireDate)}</p>
            </div>
            ${progressBar}
            
            <div class="qr-section">
                <button type="button" class="qr-btn-generate" id="btnGenerateVisitorQR">📱 สร้าง QR Code สำหรับแขกสแกนเข้าหมู่บ้าน</button>
            </div>

            <section class="vehicleUser">
                <h1 class="vehicleList">รายละเอียดยานพาหนะที่ผูกไว้</h1>
                <div class="headVlist">
                    <h3 class="Vlist">ป้ายทะเบียน</h3>
                    <h3 class="Vlist">ประเภท</h3>
                    <h3 class="Vlist"></h3>
                </div>
                ${vehiclesHTML}
            </section>`;

        // สร้าง QR Code โครงสร้าง JSON สำหรับเชื่อมต่อกล้อง/สแกนเนอร์หลังบ้าน
        document.getElementById('btnGenerateVisitorQR')?.addEventListener('click', () => {
            const qrPayload = {
                type: "VISITOR_PASS",
                user_id: user.id,
                houseNumber: user.houseNumber,
                ownerName: user.ownerName,
                generateTime: new Date().toISOString(),
                status: "ACTIVE"
            };

            const jsonString = JSON.stringify(qrPayload);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jsonString)}`;
            
            qrImageContainer.innerHTML = `<img src="${qrUrl}" alt="Visitor QR Pass" style="width: 200px; height: 200px; border-radius: 8px; border: 2px solid var(--color-primary);">`;
            qrDataText.textContent = `Payload: ${jsonString}`;
            qrModal.style.display = 'flex';
        });
    }

    function renderVehicleDetail(id, carIndex) {
        const user = mainData.find(u => u.id === id) || currentUser;
        const pVdetail = document.querySelector("#page-vehicleDetail");
        if (!pVdetail || !user || !user.vehicles) return;

        const data = user.vehicles[carIndex];
        if (!data) return;

        let timeIn = '', timeOut = '';
        if (data.logs && data.logs.length > 0) {
            data.logs.forEach((log) => {
                timeIn += `<span class="time-record">${log.time_in || '-'}</span>`;
                timeOut += `<span class="time-record">${log.time_out || 'ยังไม่ออก'}</span>`;
            });
        } else {
            timeIn = `<span class="time-record">-</span>`;
            timeOut = `<span class="time-record">-</span>`;
        }

        pVdetail.innerHTML = `
        <button type="button" class="back-btn" id="btnBackToDetail">← กลับ</button>
        <div class="vehicle-card">
            <div class="v-title">ประวัติการเข้า-ออก</div>
            <div class="v-date">วันที่ลงทะเบียนรถ : ${formatDateDisplay(data.registerDate)} </div>
            <div class="v-grid">
                <div class="v-item">ป้ายทะเบียน : ${data.plate}</div>
                <div class="v-item">ประเภท : รถยนต์</div>
                <div class="v-item">เวลาเข้า</div>
                <div class="v-item">เวลาออก</div>
                <div class="v-item v-time">${timeIn}</div>
                <div class="v-item v-time">${timeOut}</div>
            </div>
        </div>`;

        document.getElementById('btnBackToDetail')?.addEventListener('click', () => renderPage('user'));
    }

    function renderDashboard(dataList) {
        let vehicleTotal = 0, carIn = 0, carOut = 0, insideVillageCount = 0;

        dataList.forEach(user => {
            if (user.vehicles) {
                user.vehicles.forEach(vehicle => {
                    if (vehicle.type === "Car") {
                        vehicleTotal++;
                        if (vehicle.logs && vehicle.logs.length > 0) {
                            vehicle.logs.forEach(log => {
                                if (log.time_in) carIn++;
                                if (log.time_out) carOut++;
                                if (log.time_in && !log.time_out) insideVillageCount++;
                            });
                        }
                    }
                });
            }

            const statusElem = document.getElementById("residentStatus");
            const expireElem = document.getElementById("expireDateText");
            
            const expDate = parseDate(user.memberExpireDate);
            const isExpired = expDate < new Date();

            if (statusElem) statusElem.textContent = isExpired ? 'Expired' : 'Active';
            if (expireElem) expireElem.textContent = formatDateDisplay(user.memberExpireDate);
        });

        document.getElementById("vehicleTotal").textContent = vehicleTotal;
        document.getElementById("carIn").textContent = carIn;
        document.getElementById("carOut").textContent = carOut;
        document.getElementById("insideVillage").textContent = insideVillageCount;
        document.getElementById("welcomeText").textContent = currentUser ? `Dashboard ลูกบ้าน (บ้านเลขที่ ${currentUser.houseNumber})` : "Dashboard ลูกบ้าน";
        document.getElementById("todayDate").textContent = new Date().toLocaleDateString("th-TH", { dateStyle: "full" });
    }

    document.querySelector('.main-content')?.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-target]');
        if (!link) return;
        e.preventDefault();
        const { target, ...params } = link.dataset;
        renderPage(target, params);
    });

    fetch(LOCAL_JSON_URL)
        .then(res => res.json())
        .then(data => {
            mainData = data;
            updateAuthUI();
            renderPage('home');
        })
        .catch(err => console.error("Error fetching data:", err));
});
