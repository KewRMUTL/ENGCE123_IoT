"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================
    // 1. ตั้งค่า URL ของ API บน Cloud Server และไฟล์ข้อมูล Local
    // ==========================================================
    const BASE_API_URL = "https://api-node-iot.onrender.com";
    const AUTH_LOGIN_API = `${BASE_API_URL}/api/auth/login`;              // API เข้าสู่ระบบ
    const CREATE_USER_API = `${BASE_API_URL}/api/users/createUser`;        // API สร้างลูกบ้านใหม่
    const CREATE_VEHICLE_API = `${BASE_API_URL}/api/vehicles/createVehicle`;// API เพิ่มรถยนต์
    const DELETE_VEHICLE_API = `${BASE_API_URL}/api/vehicles/deleteVehicle`;// API ลบรถยนต์
    const LOCAL_JSON_URL = "./dataTest.json";                             // ไฟล์ JSON สำรอง

    let mainData = []; // ตัวแปรเก็บรายการลูกบ้านทั้งหมด
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null; // ดึงข้อมูลผู้ใช้ที่ล็อกอินค้างไว้

    // ==========================================================
    // 2. ดึง Element ต่างๆ จากหน้าเว็บ (index.html) มาเตรียมใช้งาน
    // ==========================================================
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const navItems = document.querySelectorAll('nav li[data-target]');
    const pages = document.querySelectorAll('.page');
    
    // Elements สำหรับป๊อปอัพ QR Code
    const qrModal = document.getElementById('qrModal');
    const btnCloseQr = document.getElementById('btnCloseQr');
    const qrImageContainer = document.getElementById('qrImageContainer');
    const qrDataText = document.getElementById('qrDataText');
    const visitorCodeDisplay = document.getElementById('visitorCodeDisplay');

    // Elements สำหรับป๊อปอัพเพิ่มรถยนต์
    const addVehicleModal = document.getElementById('addVehicleModal');
    const addVehicleForm = document.getElementById('addVehicleForm');
    const btnCancelAddVehicle = document.getElementById('btnCancelAddVehicle');

    // Elements สำหรับ Dropdown เลือก วัน/เดือน/ปี
    const regDaySelect = document.getElementById('regDay');
    const regMonthSelect = document.getElementById('regMonth');
    const regYearSelect = document.getElementById('regYear');

    // ==========================================================
    // 3. ฟังก์ชันสร้างรายการเลือก วัน/เดือน/ปี แบบลื่นไหล (Dropdown)
    // ==========================================================
    function initDateSelects() {
        if (!regDaySelect || !regMonthSelect || !regYearSelect) return;

        const monthsTH = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // เจนตัวเลือกวันที่ 1-31
        regDaySelect.innerHTML = "";
        for (let d = 1; d <= 31; d++) {
            const opt = document.createElement('option');
            opt.value = d < 10 ? `0${d}` : `${d}`;
            opt.textContent = `วันที่ ${d}`;
            if (d === currentDay) opt.selected = true;
            regDaySelect.appendChild(opt);
        }

        // เจนตัวเลือกเดือน ม.ค.-ธ.ค.
        regMonthSelect.innerHTML = "";
        monthsTH.forEach((mName, idx) => {
            const opt = document.createElement('option');
            const mVal = (idx + 1) < 10 ? `0${idx + 1}` : `${idx + 1}`;
            opt.value = mVal;
            opt.textContent = mName;
            if (idx === currentMonth) opt.selected = true;
            regMonthSelect.appendChild(opt);
        });

        // 3. สร้างตัวเลือก ปี เริ่มที่ ค.ศ. 1957 (พ.ศ. 2500) จนถึงปีปัจจุบัน (currentYear)
        regYearSelect.innerHTML = "";
        for (let y = 1957; y <= currentYear; y++) { // เริ่มที่ พ.ศ.2500 ถึงปีปัจจุบัน
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = `พ.ศ. ${y + 543} (${y})`;
            // เซตให้เลือกปีปัจจุบัน (currentYear) เป็นค่าเริ่มต้น
            if (y === currentYear) opt.selected = true; 
            regYearSelect.appendChild(opt);
        }
    }

    initDateSelects();

    // ==========================================================
    // 4. ฟังก์ชันสุ่มตัวอักษร+ตัวเลข 10 หลัก สำหรับ QR Code สำหรับแขก
    // ==========================================================
    function generateRandomVisitorCode(length = 10) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

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

    // ==========================================================
    // 5. ระบบเข้าสู่ระบบ (Login)
    // ==========================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('loginUsername').value.trim();
            const inputPass = document.getElementById('loginPassword').value.trim();

            try {
                const res = await fetch(AUTH_LOGIN_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: inputUser, password: inputPass })
                });

                const isLoginSuccess = await res.json();

                if (isLoginSuccess === true || isLoginSuccess.status === true) {
                    let user = mainData.find(u => u.username === inputUser || u.houseNumber === inputUser);
                    if (!user) {
                        user = { id: Date.now(), houseNumber: inputUser, username: inputUser, ownerName: "ลูกบ้าน", vehicles: [] };
                    }
                    currentUser = user;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    updateAuthUI();
                    renderPage('home');
                    return;
                }
            } catch (err) {
                console.warn("Cloud Login Error, falling back to Local JSON check:", err);
            }

            const localUser = mainData.find(u => 
                (u.houseNumber === inputUser || u.username === inputUser) && 
                u.password === inputPass
            );

            if (localUser) {
                currentUser = localUser;
                localStorage.setItem('currentUser', JSON.stringify(localUser));
                updateAuthUI();
                renderPage('home');
            } else {
                alert('ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง!\n(ตัวอย่างทดสอบ: supanat01 | รหัสผ่าน 123456)');
            }
        });
    }

    // ==========================================================
    // 6. ระบบลงทะเบียนลูกบ้านใหม่ (Register)
    // ==========================================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const houseNo = document.getElementById('regHouseNo').value.trim();
            const name = document.getElementById('regName').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value.trim();

            const d = regDaySelect.value;
            const m = regMonthSelect.value;
            const y = regYearSelect.value;
            const startDateVal = `${y}-${m}-${d}`;

            const todayStr = new Date().toISOString().split('T')[0];

            const startObj = new Date(startDateVal);
            const expireObj = new Date(startObj);
            expireObj.setFullYear(expireObj.getFullYear() + 1);
            const expireDateStr = expireObj.toISOString().split('T')[0];

            const payload = {
                houseNumber: houseNo,
                ownerName: name,
                username: username,
                password: password,
                role: "member",
                registerDate: todayStr,
                memberStartDate: startDateVal,
                memberExpireDate: expireDateStr
            };

            try {
                const response = await fetch(CREATE_USER_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    console.log("บันทึกลง Database บน Cloud สำเร็จ");
                }
            } catch (err) {
                console.error("API Error:", err);
            }

            const newUser = {
                id: mainData.length + 1,
                ...payload,
                vehicles: []
            };

            mainData.push(newUser);
            currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            alert(`ลงทะเบียนสำเร็จสำหรับบ้านเลขที่ ${houseNo}!\nวันเริ่มสมาชิก: ${formatDateDisplay(startDateVal)}\nวันหมดอายุสมาชิกอัตโนมัติ: ${formatDateDisplay(expireDateStr)}`);
            updateAuthUI();
            renderPage('home');
        });
    }

    // ==========================================================
    // 7. ระบบลงทะเบียนรถยนต์เพิ่ม (ซิงค์ข้อมูลเข้า mainData เพื่อให้อัปเดตสถิติหน้า Home)
    // ==========================================================
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const plateInputRaw = document.getElementById('inputPlate').value.trim();
            const provinceInputRaw = document.getElementById('inputProvince').value.trim();
            if (!plateInputRaw || !provinceInputRaw) return;

            // ตัดช่องว่างป้ายทะเบียนและจังหวัด
            const cleanedPlate = plateInputRaw.replace(/\s+/g, '');
            const cleanedProvince = provinceInputRaw.replace(/\s+/g, '');

            const targetUser = currentUser || mainData[0];
            const todayDisplay = new Date().toLocaleDateString('en-GB');

            const payload = {
                user_id: targetUser.id || 1,
                plate: cleanedPlate,
                province: cleanedProvince,
                type: "Car",
                registerDate: todayDisplay
            };

            let vehicleId = Date.now();

            try {
                const response = await fetch(CREATE_VEHICLE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    console.log("ลงทะเบียนรถยนต์ลง Cloud Database เรียบร้อย");
                    const resData = await response.json();
                    if (resData && resData.id) vehicleId = resData.id;
                }
            } catch (err) {
                console.error("Create Vehicle API Error:", err);
            }

            const newVehicleObj = {
                id: vehicleId,
                user_id: targetUser.id,
                plate: cleanedPlate,
                province: cleanedProvince,
                type: "Car",
                registerDate: new Date().toISOString().split('T')[0],
                logs: []
            };

            if (!targetUser.vehicles) targetUser.vehicles = [];
            targetUser.vehicles.push(newVehicleObj);

            // 🟢 อัปเดตใน mainData ด้วยเพื่อให้หน้า Home คำนวณยอดรวมถูกต้อง
            const mainUserIndex = mainData.findIndex(u => u.id === targetUser.id || u.houseNumber === targetUser.houseNumber);
            if (mainUserIndex !== -1) {
                mainData[mainUserIndex] = targetUser;
            }

            localStorage.setItem('currentUser', JSON.stringify(targetUser));

            let displayPlate = cleanedPlate;
            if (cleanedPlate.length > 3) {
                displayPlate = cleanedPlate.substring(0, cleanedPlate.length - 4) + ' ' + cleanedPlate.substring(cleanedPlate.length - 4);
            }

            alert(`ลงทะเบียนรถยนต์ป้ายทะเบียน "${displayPlate}" (${cleanedProvince}) เรียบร้อยแล้ว!`);
            addVehicleModal.style.display = 'none';
            document.getElementById('inputPlate').value = '';
            document.getElementById('inputProvince').value = '';
            renderDirectUserDetail();
        });
    }

    if (btnCancelAddVehicle) {
        btnCancelAddVehicle.addEventListener('click', () => {
            addVehicleModal.style.display = 'none';
        });
    }

    // ==========================================================
    // 8. ฟังก์ชันสั่งลบรถยนต์ (ยิง API DELETE /api/vehicles/deleteVehicle/:id)
    // ==========================================================
    async function deleteVehicle(vehicleId, carIndex) {
        const targetUser = currentUser || mainData[0];
        if (!targetUser || !targetUser.vehicles) return;

        const vehicleToDelete = targetUser.vehicles[carIndex];
        const plateName = vehicleToDelete ? vehicleToDelete.plate : "";

        if (!confirm(`คุณต้องการลบรถยนต์ป้ายทะเบียน "${plateName}" ออกใช่หรือไม่?`)) {
            return;
        }

        try {
            // ยิง DELETE ไปยัง API ของเพื่อนตามสเปค DELETE/api/vehicles/deleteVehicle/1
            const response = await fetch(`${DELETE_VEHICLE_API}/${vehicleId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log("ลบรถยนต์จาก Cloud Database สำเร็จ");
            }
        } catch (err) {
            console.error("Delete Vehicle API Error:", err);
        }

        // ลบออกจากอาร์เรย์ฝั่ง Local
        targetUser.vehicles.splice(carIndex, 1);

        // อัปเดตใน mainData
        const mainUserIndex = mainData.findIndex(u => u.id === targetUser.id || u.houseNumber === targetUser.houseNumber);
        if (mainUserIndex !== -1) {
            mainData[mainUserIndex] = targetUser;
        }

        localStorage.setItem('currentUser', JSON.stringify(targetUser));
        alert("ลบรายการรถยนต์เรียบร้อยแล้ว!");
        renderDirectUserDetail();
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

    // ==========================================================
    // 9. ฟังก์ชันสลับการแสดงผลหน้าเว็บ (SPA)
    // ==========================================================
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

    // ==========================================================
    // 10. ฟังก์ชันวาดการ์ดแสดงรายละเอียดลูกบ้าน (หน้า USER DATA) + ปุ่มลบ
    // ==========================================================
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
                        <p class="Vlist">${v.plate} ${v.province ? `(${v.province})` : ''}</p>
                        <p class="Vlist">รถยนต์</p>
                        <div style="display: flex; justify-content: center; gap: 8px; align-items: center;">
                            <a href="#" data-target="vehicleDetail" data-car-index="${index}" data-id="${user.id}">ดูประวัติ</a>
                            <button type="button" class="btn-delete-v" data-v-id="${v.id}" data-car-index="${index}" style="background-color: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 15px; cursor: pointer; font-family: Prompt; font-size: 13px;">🗑️ ลบ</button>
                        </div>
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
                <div class="vehicle-header-flex">
                    <h1 class="vehicleList">รายละเอียดยานพาหนะที่ผูกไว้</h1>
                    <button type="button" class="btn-add-vehicle" id="btnOpenAddVehicleModal">＋ ลงทะเบียนรถเพิ่ม</button>
                </div>
                <div class="headVlist">
                    <h3 class="Vlist">ป้ายทะเบียน</h3>
                    <h3 class="Vlist">ประเภท</h3>
                    <h3 class="Vlist">การจัดการ</h3>
                </div>
                ${vehiclesHTML}
            </section>`;

        // ดักจับกดปุ่มลบ
        container.querySelectorAll('.btn-delete-v').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vId = e.target.dataset.vId;
                const cIdx = Number(e.target.dataset.carIndex);
                deleteVehicle(vId, cIdx);
            });
        });

        document.getElementById('btnOpenAddVehicleModal')?.addEventListener('click', () => {
            addVehicleModal.style.display = 'flex';
        });

        document.getElementById('btnGenerateVisitorQR')?.addEventListener('click', () => {
            const randomStreamCode = generateRandomVisitorCode(10);

            const qrPayload = {
                type: "VISITOR_PASS",
                user_id: user.id,
                houseNumber: user.houseNumber,
                visitorCode: randomStreamCode,
                generateTime: new Date().toISOString(),
                status: "ACTIVE"
            };

            const jsonString = JSON.stringify(qrPayload);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jsonString)}`;
            
            visitorCodeDisplay.textContent = randomStreamCode;
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
                <div class="v-item">ป้ายทะเบียน : ${data.plate} ${data.province ? `(${data.province})` : ''}</div>
                <div class="v-item">ประเภท : รถยนต์</div>
                <div class="v-item">เวลาเข้า</div>
                <div class="v-item">เวลาออก</div>
                <div class="v-item v-time">${timeIn}</div>
                <div class="v-item v-time">${timeOut}</div>
            </div>
        </div>`;

        document.getElementById('btnBackToDetail')?.addEventListener('click', () => renderPage('user'));
    }

    // ==========================================================
    // 11. คำนวณ Dashboard หน้า Home
    // ==========================================================
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

    // ==========================================================
    // โหลดข้อมูลเริ่มต้น: ดึงจาก Cloud API ของฝั่งแอดมิน
    // ==========================================================
    async function initApp() {
        try {
            // ดึงข้อมูลลูกบ้านทั้งหมดจาก Cloud Database
            const res = await fetch(`${BASE_API_URL}/api/users/getUsers`);
            if (res.ok) {
                const cloudUsers = await res.json();
                if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
                    mainData = cloudUsers;
                } else {
                    throw new Error("Cloud returned empty array");
                }
            } else {
                throw new Error("Cloud response not OK");
            }
        } catch (err) {
            console.warn("ไม่สามารถดึงข้อมูลจาก Cloud ได้ กำลังโหลด dataTest.json สำรองแทน:", err);
            try {
                const localRes = await fetch(LOCAL_JSON_URL);
                mainData = await localRes.json();
            } catch (localErr) {
                console.error("Local JSON Error:", localErr);
            }
        }

        // ซิงค์ข้อมูลผู้ใช้ปัจจุบัน
        if (currentUser) {
            const idx = mainData.findIndex(u => u.id === currentUser.id || u.houseNumber === currentUser.houseNumber);
            if (idx !== -1) {
                currentUser = mainData[idx];
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        }

        updateAuthUI();
        renderPage('home');
    }

    initApp();
});