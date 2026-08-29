"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================
    // ส่วนที่ 1: การตั้งค่า URL เชื่อมต่อ API Cloud Server ของแอดมิน
    // ==========================================================
    const BASE_API_URL = "https://api-node-iot.onrender.com";
    const AUTH_LOGIN_API = `${BASE_API_URL}/api/auth/login`;               // ยิงตรวจสอบ Login
    const CREATE_USER_API = `${BASE_API_URL}/api/users/createUser`;        // ยิงสร้างลูกบ้านใหม่
    const UPDATE_USER_API = `${BASE_API_URL}/api/users/updateUser`;        // ยิงอัปเดตข้อมูล/ต่ออายุสมาชิก
    const CREATE_VEHICLE_API = `${BASE_API_URL}/api/vehicles/createVehicle`;// ยิงเพิ่มรถยนต์
    const DELETE_VEHICLE_API = `${BASE_API_URL}/api/vehicles/deleteVehicle`;// ยิงลบรถยนต์

    // ==========================================================
    // ส่วนที่ 2: ฐานข้อมูลตั้งต้น (Mock Data สำหรับทดสอบทันที)
    // ==========================================================
    const defaultUsers = [
        {
            id: 1,
            houseNumber: "158/1",
            ownerName: "สมหมาย ดีใจ",
            username: "158/1",
            password: "pass123",
            role: "member",
            registerDate: "2026-08-11",
            memberStartDate: "2026-08-11",
            memberExpireDate: "2027-08-11",
            vehicles: [
                {
                    id: 101,
                    user_id: 1,
                    plate: "1กข1111",
                    province: "กรุงเทพฯ",
                    type: "Car",
                    registerDate: "2026-08-11",
                    logs: [
                        { time_in: "2026-08-25T15:30:00", time_out: "2026-08-25T19:00:00" }
                    ]
                }
            ]
        },
        {
            id: 2,
            houseNumber: "67/1",
            ownerName: "ศุภณัฐ",
            username: "supanat01",
            password: "123456",
            role: "member",
            registerDate: "2026-08-11",
            memberStartDate: "2026-08-11",
            memberExpireDate: "2027-08-11",
            vehicles: []
        },
        {
            id: 3,
            houseNumber: "99",
            ownerName: "ลำลอง ฟองดำ",
            username: "99",
            password: "pass123",
            role: "member",
            registerDate: "2019-09-09",
            memberStartDate: "2019-09-09",
            memberExpireDate: "2020-09-09", // บัญชีทดสอบสถานะ Expired
            vehicles: []
        }
    ];

    // โหลดข้อมูลจาก LocalStorage ถ้าไม่มีให้ใช้ข้อมูลตั้งต้น
    let mainData = JSON.parse(localStorage.getItem('allUsers')) || defaultUsers;
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // ==========================================================
    // ส่วนที่ 3: ดึง Elements ทั้งหมดจากหน้า HTML
    // ==========================================================
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const navItems = document.querySelectorAll('nav li[data-target]');
    const pages = document.querySelectorAll('.page');

    // Elements ของระบบ Visitor QR Code
    const qrModal = document.getElementById('qrModal');
    const btnCloseQr = document.getElementById('btnCloseQr');
    const qrImageContainer = document.getElementById('qrImageContainer');
    const qrDataText = document.getElementById('qrDataText');
    const visitorCodeDisplay = document.getElementById('visitorCodeDisplay');

    // Elements ของระบบเพิ่มรถยนต์
    const addVehicleModal = document.getElementById('addVehicleModal');
    const addVehicleForm = document.getElementById('addVehicleForm');
    const btnCancelAddVehicle = document.getElementById('btnCancelAddVehicle');

    // Elements สำหรับ Dropdown เลือกวันที่แบบรวดเร็ว
    const regDaySelect = document.getElementById('regDay');
    const regMonthSelect = document.getElementById('regMonth');
    const regYearSelect = document.getElementById('regYear');

    // ==========================================================
    // ส่วนที่ 4: ฟังก์ชันสร้าง Dropdown วัน/เดือน/ปี (พ.ศ. 2500 - ปัจจุบัน)
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

        // 1. สร้างตัวเลือก วันที่ 1 - 31
        regDaySelect.innerHTML = "";
        for (let d = 1; d <= 31; d++) {
            const opt = document.createElement('option');
            opt.value = d < 10 ? `0${d}` : `${d}`;
            opt.textContent = `วันที่ ${d}`;
            if (d === currentDay) opt.selected = true;
            regDaySelect.appendChild(opt);
        }

        // 2. สร้างตัวเลือก เดือน (ม.ค. - ธ.ค.)
        regMonthSelect.innerHTML = "";
        monthsTH.forEach((mName, idx) => {
            const opt = document.createElement('option');
            const mVal = (idx + 1) < 10 ? `0${idx + 1}` : `${idx + 1}`;
            opt.value = mVal;
            opt.textContent = mName;
            if (idx === currentMonth) opt.selected = true;
            regMonthSelect.appendChild(opt);
        });

        // 3. สร้างตัวเลือก ปี (เริ่ม พ.ศ. 2500 ถึง ปีปัจจุบัน 2569)
        regYearSelect.innerHTML = "";
        for (let y = 1957; y <= currentYear; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = `พ.ศ. ${y + 543} (${y})`;
            if (y === currentYear) opt.selected = true;
            regYearSelect.appendChild(opt);
        }
    }

    initDateSelects();

    // ==========================================================
    // ส่วนที่ 5: Helper Functions (ฟังก์ชันช่วยเหลือทั่วไป)
    // ==========================================================
    function generateRandomVisitorCode(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let res = '';
        for (let i = 0; i < length; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    }

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

    function updateAuthUI() {
        if (currentUser) {
            if (authModal) authModal.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (authModal) authModal.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    // สลับแท็บ Login / Register
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
    // ส่วนที่ 6: ระบบเข้าสู่ระบบ (Login)
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('loginUsername').value.trim();
            const inputPass = document.getElementById('loginPassword').value.trim();

            let isCloudPassed = false;

            // 1. ลองตรวจสอบกับ Cloud API ของเพื่อน
            try {
                const res = await fetch(AUTH_LOGIN_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: inputUser, password: inputPass })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data === true || data.status === true || data.success === true || data.id) {
                        isCloudPassed = true;
                    }
                }
            } catch (err) {
                console.warn("Cloud Login Offline, fallback to local:", err);
            }

            // 2. ตรวจสอบข้อมูลกับรายการในเครื่อง
            let matchedUser = mainData.find(u => 
                (String(u.username) === inputUser || String(u.houseNumber) === inputUser) && 
                String(u.password) === inputPass
            );

            if (isCloudPassed || matchedUser) {
                if (!matchedUser) {
                    matchedUser = {
                        id: Date.now(),
                        houseNumber: inputUser,
                        username: inputUser,
                        ownerName: "ลูกบ้าน (" + inputUser + ")",
                        registerDate: new Date().toISOString().split('T')[0],
                        memberStartDate: new Date().toISOString().split('T')[0],
                        memberExpireDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
                        vehicles: []
                    };
                    mainData.push(matchedUser);
                    localStorage.setItem('allUsers', JSON.stringify(mainData));
                }

                currentUser = matchedUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateAuthUI();
                renderPage('home');
            } else {
                alert('ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง!\n\n💡 บัญชีทดสอบที่ใช้งานได้:\n1) Username: 158/1 | Password: pass123\n2) Username: supanat01 | Password: 123456\n3) Username: 99 | Password: pass123 (บัญชีหมดอายุ)');
            }
        });
    }

    // ==========================================================
    // ส่วนที่ 7: ระบบลงทะเบียนสมาชิกใหม่ (Register)
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

            // คำนวณวันหมดอายุอัตโนมัติ 1 ปี
            const startObj = new Date(startDateVal);
            const expireObj = new Date(startObj);
            expireObj.setFullYear(expireObj.getFullYear() + 1);
            const expireDateStr = expireObj.toISOString().split('T')[0];

            const payload = {
                id: Date.now(),
                houseNumber: houseNo,
                ownerName: name,
                username: username,
                password: password,
                role: "member",
                registerDate: todayStr,
                memberStartDate: startDateVal,
                memberExpireDate: expireDateStr,
                vehicles: []
            };

            try {
                await fetch(CREATE_USER_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (err) {
                console.warn("API Create User Error:", err);
            }

            mainData.push(payload);
            localStorage.setItem('allUsers', JSON.stringify(mainData));
            currentUser = payload;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            alert(`ลงทะเบียนสำเร็จสำหรับบ้านเลขที่ ${houseNo}!\nวันเริ่มสมาชิก: ${formatDateDisplay(startDateVal)}\nวันหมดอายุ: ${formatDateDisplay(expireDateStr)}`);
            updateAuthUI();
            renderPage('home');
        });
    }

    // ==========================================================
    // ส่วนที่ 8: ระบบจัดการรถยนต์ (เพิ่มรถ + ลบรถ + ตัดช่องว่าง)
    // ==========================================================
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const plateRaw = document.getElementById('inputPlate').value.trim();
            const provinceRaw = document.getElementById('inputProvince').value.trim();
            if (!plateRaw || !provinceRaw) return;

            // ตัดช่องว่างป้ายทะเบียนและจังหวัด
            const cleanedPlate = plateRaw.replace(/\s+/g, '');
            const cleanedProvince = provinceRaw.replace(/\s+/g, '');

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
                const res = await fetch(CREATE_VEHICLE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.id) vehicleId = data.id;
                }
            } catch (err) {
                console.warn("API Add Vehicle Error:", err);
            }

            const newVehicle = {
                id: vehicleId,
                user_id: targetUser.id,
                plate: cleanedPlate,
                province: cleanedProvince,
                type: "Car",
                registerDate: new Date().toISOString().split('T')[0],
                logs: []
            };

            if (!targetUser.vehicles) targetUser.vehicles = [];
            targetUser.vehicles.push(newVehicle);

            // ซิงค์ mainData เพื่อให้หน้า Home อัปเดตสถิติทันที
            const idx = mainData.findIndex(u => u.id === targetUser.id || u.houseNumber === targetUser.houseNumber);
            if (idx !== -1) mainData[idx] = targetUser;

            localStorage.setItem('allUsers', JSON.stringify(mainData));
            localStorage.setItem('currentUser', JSON.stringify(targetUser));

            alert(`ลงทะเบียนรถยนต์ป้ายทะเบียน "${cleanedPlate}" (${cleanedProvince}) เรียบร้อยแล้ว!`);
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

    async function deleteVehicle(vehicleId, carIndex) {
        const targetUser = currentUser || mainData[0];
        if (!targetUser || !targetUser.vehicles) return;

        const vName = targetUser.vehicles[carIndex] ? targetUser.vehicles[carIndex].plate : "";
        if (!confirm(`คุณต้องการลบรถยนต์ป้ายทะเบียน "${vName}" ออกใช่หรือไม่?`)) return;

        try {
            await fetch(`${DELETE_VEHICLE_API}/${vehicleId}`, { method: 'DELETE' });
        } catch (err) {
            console.warn("API Delete Vehicle Error:", err);
        }

        targetUser.vehicles.splice(carIndex, 1);

        const idx = mainData.findIndex(u => u.id === targetUser.id || u.houseNumber === targetUser.houseNumber);
        if (idx !== -1) mainData[idx] = targetUser;

        localStorage.setItem('allUsers', JSON.stringify(mainData));
        localStorage.setItem('currentUser', JSON.stringify(targetUser));

        alert("ลบรายการรถยนต์เรียบร้อยแล้ว!");
        renderDirectUserDetail();
    }

    // ==========================================================
    // ส่วนที่ 9: ระบบต่ออายุสมาชิก (นับจากวันปัจจุบัน +1 ปีทันที)
    // ==========================================================
    async function renewMembership() {
        const user = currentUser || mainData[0];
        if (!user) return;

        // ดึงวันปัจจุบันที่กำลังกด และบวกเพิ่ม 1 ปีทันที (ไม่ต้องกดซ้ำ)
        const today = new Date();
        const newExpObj = new Date(today);
        newExpObj.setFullYear(newExpObj.getFullYear() + 1);
        const newExpStr = newExpObj.toISOString().split('T')[0];

        const updatePayload = {
            houseNumber: user.houseNumber,
            ownerName: user.ownerName,
            username: user.username,
            password: user.password,
            role: user.role || "member",
            registerDate: user.registerDate,
            memberStartDate: user.memberStartDate,
            memberExpireDate: newExpStr
        };

        try {
            await fetch(`${UPDATE_USER_API}/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
        } catch (err) {
            console.warn("API Update User Error:", err);
        }

        user.memberExpireDate = newExpStr;
        const idx = mainData.findIndex(u => u.id === user.id || u.houseNumber === user.houseNumber);
        if (idx !== -1) mainData[idx] = user;

        localStorage.setItem('allUsers', JSON.stringify(mainData));
        localStorage.setItem('currentUser', JSON.stringify(user));

        alert(`ต่ออายุสมาชิกสำเร็จสำหรับบ้านเลขที่ ${user.houseNumber}!\nวันหมดอายุใหม่: ${formatDateDisplay(newExpStr)}`);
        renderDirectUserDetail();
    }

    // ==========================================================
    // ส่วนที่ 10: การเรนเดอร์หน้าจอต่างๆ (USER DATA, Dashboard, Logs)
    // ==========================================================
    function createExpiryProgressBar(startDateStr, timeoutDateStr) {
        const end = parseDate(timeoutDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // คำนวณจำนวนวันที่เหลือจนถึงวันหมดอายุ
        const remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24));

        // กำหนดรอบอายุบัตรมาตรฐานเป็น 365 วัน (1 ปี)
        const totalDays = 365;
        let percent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100));

        let color = '#28a745'; // สีเขียว (ปกติ)
        if (remainingDays <= 0) {
            percent = 0;
            color = '#dc3545';
        } else if (remainingDays <= 30) {
            color = '#dc3545'; // สีแดง (เหลือน้อยกว่า 30 วัน)
        } else if (remainingDays <= 90) {
            color = '#ffc107'; // สีเหลือง (เหลือน้อยกว่า 90 วัน)
        }

        let statusText = `เหลืออีก ${remainingDays} วัน`;
        if (remainingDays <= 0) {
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
            
            <div style="text-align: center; margin-top: 10px;">
                <button type="button" id="btnRenewMember" style="background-color: #ffc107; color: #212529; border: none; padding: 8px 20px; border-radius: 20px; font-weight: 700; cursor: pointer; font-family: Prompt; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">🔄 ต่ออายุสมาชิก (+1 ปี)</button>
            </div>

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

        // ผูก Event ปุ่มในหน้า User Detail
        document.getElementById('btnRenewMember')?.addEventListener('click', renewMembership);
        document.getElementById('btnOpenAddVehicleModal')?.addEventListener('click', () => {
            addVehicleModal.style.display = 'flex';
        });

        container.querySelectorAll('.btn-delete-v').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteVehicle(e.target.dataset.vId, Number(e.target.dataset.carIndex));
            });
        });

        document.getElementById('btnGenerateVisitorQR')?.addEventListener('click', () => {
            const randomCode = generateRandomVisitorCode(10);
            const qrPayload = {
                type: "VISITOR_PASS",
                user_id: user.id,
                houseNumber: user.houseNumber,
                visitorCode: randomCode,
                generateTime: new Date().toISOString(),
                status: "ACTIVE"
            };

            const jsonStr = JSON.stringify(qrPayload);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jsonStr)}`;

            visitorCodeDisplay.textContent = randomCode;
            qrImageContainer.innerHTML = `<img src="${qrUrl}" alt="Visitor QR Pass" style="width: 200px; height: 200px; border-radius: 8px; border: 2px solid var(--color-primary);">`;
            qrDataText.textContent = `Payload: ${jsonStr}`;
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

    // ==========================================================
    // ส่วนที่ 11: การควบคุมระบบ Routing และการเริ่มต้นทำงาน (Initial)
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

    document.querySelector('.main-content')?.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-target]');
        if (!link) return;
        e.preventDefault();
        const { target, ...params } = link.dataset;
        renderPage(target, params);
    });

    // เริ่มต้นระบบ
    updateAuthUI();
    renderPage('home');
});

/* ==========================================================================
   ส่วนเสริม: จัดการข้อมูลจาก Database (ตัดช่องว่างป้ายทะเบียน + แปลงวันเวลา/ดัก null)
   ========================================================================== */

// 1. ฟังก์ชันตัดช่องว่างป้ายทะเบียน (Data Sanitization)
// ช่วยให้ "กข 1234" และ "กข1234" สามารถจับคู่ข้อมูลกันได้ถูกต้อง
function sanitizePlate(plateNumber) {
    if (!plateNumber) return '';
    return plateNumber.toString().replace(/\s+/g, '');
}

// 2. ฟังก์ชันแปลงรูปแบบวัน-เวลาไทย และป้องกันการแสดงผลค่า null
function formatLogDateTime(dateString) {
    if (!dateString || dateString === 'null') {
        return 'ยังอยู่ภายในโครงการ';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // กรณีเป็นข้อความปกติที่ไม่ได้มาในรูปแบบ ISO Date
    }
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 3. ฟังก์ชันกรองและจัดรูปแบบประวัติการเข้า-ออกสำหรับรถของลูกบ้าน
function getMatchedVehicleLogs(apiResponseData, targetPlate) {
    if (!Array.isArray(apiResponseData)) return [];
    
    const cleanTarget = sanitizePlate(targetPlate);
    
    return apiResponseData
        .filter(log => sanitizePlate(log.plate) === cleanTarget)
        .map(log => ({
            ...log,
            formattedTimeIn: formatLogDateTime(log.time_in),
            formattedTimeOut: formatLogDateTime(log.time_out),
            cameraInText: log.camera_in ? `(${log.camera_in})` : '',
            cameraOutText: log.camera_out ? `(${log.camera_out})` : ''
        }));
}