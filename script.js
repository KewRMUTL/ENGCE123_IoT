"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================
    // ส่วนที่ 1: กำหนด URL เชื่อมต่อ Cloud RESTful API Backend
    // ==========================================================
    const BASE_API_URL = "https://api-node-iot.onrender.com/api";
    const GET_USERS_API = `${BASE_API_URL}/users/getUsers`;                 // ดึงข้อมูลลูกบ้านทั้งหมด (GET)
    const CREATE_USER_API = `${BASE_API_URL}/users/createUser`;             // สร้างสมาชิกลูกบ้านใหม่ (POST)
    const UPDATE_USER_API = `${BASE_API_URL}/users/updateUser`;             // อัปเดตข้อมูล/ต่ออายุสมาชิก (PUT)
    const GET_VEHICLES_API = `${BASE_API_URL}/vehicles/getVehicles`;         // ดึงข้อมูลรถยนต์ทั้งหมด (GET)
    const CREATE_VEHICLE_API = `${BASE_API_URL}/vehicles/createVehicle`;     // เพิ่มรถยนต์เข้าฐานข้อมูล (POST)
    const DELETE_VEHICLE_API = `${BASE_API_URL}/vehicles/deleteVehicle`;     // ลบข้อมูลรถยนต์ (DELETE)
    const GET_LOGS_API = `${BASE_API_URL}/logs/getLogs`;                     // ดึงประวัติการเข้า-ออกของกล้อง LPR (GET)

    // 🚩 1. ใส่ลิงก์ Grafana Dashboard ที่เพื่อนส่งมาตรงนี้
    const GRAFANA_DASHBOARD_URL = "https://your-grafana-link.com"; 

    // 🚩 2. เส้นทาง API สำหรับ Visitor Barcode ในอนาคต (เมื่อหลังบ้านทำเสร็จ)
    // const CREATE_VISITOR_API = `${BASE_API_URL}/visitor/createPass`;
    // const DELETE_VISITOR_API = `${BASE_API_URL}/visitor/deletePass`;

    // ==========================================================
    // ส่วนที่ 2: ตัวแปรสถานะระบบส่วนกลาง (Global App State)
    // ==========================================================
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
    let allUsersData = [];       // เก็บข้อมูลลูกบ้านทั้งหมดจาก Cloud
    let allVehiclesData = [];    // เก็บข้อมูลรถยนต์ทั้งหมดจาก Cloud
    let allLogsData = [];        // เก็บประวัติการเข้า-ออกของรถยนต์จากกล้อง LPR
    let currentActiveBarcode = localStorage.getItem('savedVisitorBarcode') || null;  // ดึงรหัสบาร์โค้ดเดิมที่เคยสร้างค้างไว้ (ถ้ามี)

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

    // Elements ระบบสร้าง Barcode สำหรับ Visitor
    const qrModal = document.getElementById('qrModal');
    const btnCloseQr = document.getElementById('btnCloseQr');
    const btnDeleteBarcode = document.getElementById('btnDeleteBarcode');
    const qrImageContainer = document.getElementById('qrImageContainer');
    const qrDataText = document.getElementById('qrDataText');
    const visitorCodeDisplay = document.getElementById('visitorCodeDisplay');

    // Elements ระบบลงทะเบียนยานพาหนะ
    const addVehicleModal = document.getElementById('addVehicleModal');
    const addVehicleForm = document.getElementById('addVehicleForm');
    const btnCancelAddVehicle = document.getElementById('btnCancelAddVehicle');

    // Elements สำหรับ Dropdown เลือกวันที่ พ.ศ.
    const regDaySelect = document.getElementById('regDay');
    const regMonthSelect = document.getElementById('regMonth');
    const regYearSelect = document.getElementById('regYear');

    // ลิงก์ปุ่ม Grafana Dashboard บนหน้า Home
    const btnGrafanaLink = document.getElementById('btnGrafanaLink');
    if (btnGrafanaLink) {
        btnGrafanaLink.href = GRAFANA_DASHBOARD_URL;
    }

    // ==========================================================
    // ส่วนที่ 4: ฟังก์ชันจัดการ Helper, Dropdown วันที่ และการสุ่มตัวเลข 13 หลัก
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

        regDaySelect.innerHTML = "";
        for (let d = 1; d <= 31; d++) {
            const opt = document.createElement('option');
            opt.value = d < 10 ? `0${d}` : `${d}`;
            opt.textContent = `วันที่ ${d}`;
            if (d === currentDay) opt.selected = true;
            regDaySelect.appendChild(opt);
        }

        regMonthSelect.innerHTML = "";
        monthsTH.forEach((mName, idx) => {
            const opt = document.createElement('option');
            const mVal = (idx + 1) < 10 ? `0${idx + 1}` : `${idx + 1}`;
            opt.value = mVal;
            opt.textContent = mName;
            if (idx === currentMonth) opt.selected = true;
            regMonthSelect.appendChild(opt);
        });

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

    // ฟังก์ชันสุ่มรหัสตัวเลขล้วน 13 หลัก (จำลองรูปแบบบาร์โค้ดบัตร ปชช.)
    function generateRandomVisitorCode(length = 13) {
        const digits = '0123456789';
        let res = digits.charAt(Math.floor(Math.random() * 9) + 1); // หลักแรกไม่เป็น 0
        for (let i = 1; i < length; i++) {
            res += digits.charAt(Math.floor(Math.random() * digits.length));
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
        if (!dateStr || dateStr === '-') return '-';
        const d = parseDate(dateStr);
        if (isNaN(d.getTime())) return dateStr;
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
    // ส่วนที่ 5: ฟังก์ชันดึงข้อมูลสดจาก Cloud Database (Sync Data)
    // ==========================================================
    async function syncDatabase() {
        try {
            const [usersRes, vehRes, logsRes] = await Promise.all([
                fetch(GET_USERS_API),
                fetch(GET_VEHICLES_API),
                fetch(GET_LOGS_API)
            ]);

            const usersData = await usersRes.json();
            const vehData = await vehRes.json();
            const logsData = await logsRes.json();

            allUsersData = Array.isArray(usersData) ? usersData : (usersData.data || []);
            allVehiclesData = Array.isArray(vehData) ? vehData : (vehData.data || []);
            allLogsData = Array.isArray(logsData) ? logsData : (logsData.data || []);

            if (currentUser) {
                const refreshedUser = allUsersData.find(u => 
                    u.id === currentUser.id || 
                    u.houseNumber === currentUser.houseNumber || 
                    (u.username && u.username === currentUser.username)
                );
                if (refreshedUser) {
                    currentUser = refreshedUser;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
            }
        } catch (error) {
            console.error("เชื่อมต่อ Cloud API ผิดพลาด:", error);
        }
    }

    // ==========================================================
    // ส่วนที่ 6: ระบบเข้าสู่ระบบ (Login)
    // ==========================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('loginUsername').value.trim();
            const inputPass = document.getElementById('loginPassword').value.trim();

            await syncDatabase();

            const matchedUser = allUsersData.find(u => 
                (String(u.username) === inputUser || String(u.houseNumber) === inputUser) && 
                String(u.password) === inputPass
            );

            if (matchedUser) {
                currentUser = matchedUser;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateAuthUI();
                renderPage('home');
            } else {
                alert('เลขที่บ้าน / Username หรือ รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
            }
        });
    }

    // ==========================================================
    // ส่วนที่ 7: ระบบลงทะเบียนสมาชิกใหม่ (POST)
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

                const result = await response.json();

                if (response.ok || result.success) {
                    alert(`ลงทะเบียนสำเร็จสำหรับบ้านเลขที่ ${houseNo}!\nวันเริ่มสมาชิก: ${formatDateDisplay(startDateVal)}\nวันหมดอายุ: ${formatDateDisplay(expireDateStr)}`);
                    await syncDatabase();
                    currentUser = allUsersData.find(u => u.houseNumber === houseNo) || payload;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateAuthUI();
                    renderPage('home');
                } else {
                    alert(result.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
                }
            } catch (err) {
                console.error("API Create User Error:", err);
                alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อลงทะเบียนได้");
            }
        });
    }

    // ==========================================================
    // ส่วนที่ 8: ระบบจัดการยานพาหนะ (รองรับรถยนต์ + รถมอเตอร์ไซค์)
    // ==========================================================
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const plateRaw = document.getElementById('inputPlate').value.trim();
            const provinceRaw = document.getElementById('inputProvince').value.trim();
            const selectedType = document.getElementById('inputVehicleType').value;
            if (!plateRaw || !provinceRaw || !currentUser) return;

            const cleanedPlate = sanitizePlate(plateRaw);
            const cleanedProvince = provinceRaw.replace(/\s+/g, '');
            const todayDisplay = new Date().toISOString().split('T')[0];

            const payload = {
                user_id: currentUser.id,
                plate: cleanedPlate,
                province: cleanedProvince,
                type: selectedType,
                registerDate: todayDisplay
            };

            try {
                const res = await fetch(CREATE_VEHICLE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const typeTh = selectedType === "Motorcycle" ? "รถจักรยานยนต์" : "รถยนต์";
                    alert(`ลงทะเบียน${typeTh} ป้ายทะเบียน "${cleanedPlate}" (${cleanedProvince}) เรียบร้อยแล้ว!`);
                    addVehicleModal.style.display = 'none';
                    document.getElementById('inputPlate').value = '';
                    document.getElementById('inputProvince').value = '';
                    await syncDatabase();
                    renderDirectUserDetail();
                } else {
                    alert("เพิ่มยานพาหนะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            } catch (err) {
                console.error("API Add Vehicle Error:", err);
                alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลรถได้");
            }
        });
    }

    if (btnCancelAddVehicle) {
        btnCancelAddVehicle.addEventListener('click', () => {
            addVehicleModal.style.display = 'none';
        });
    }

    async function deleteVehicle(vehicleId, plateName) {
        if (!confirm(`คุณต้องการลบยานพาหนะป้ายทะเบียน "${plateName}" ออกจากฐานข้อมูลใช่หรือไม่?`)) return;

        try {
            const res = await fetch(`${DELETE_VEHICLE_API}/${vehicleId}`, { method: 'DELETE' });
            if (res.ok) {
                alert("ลบรายการยานพาหนะเรียบร้อยแล้ว!");
                await syncDatabase();
                renderDirectUserDetail();
            } else {
                alert("ลบข้อมูลไม่สำเร็จ");
            }
        } catch (err) {
            console.error("API Delete Vehicle Error:", err);
            alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อลบข้อมูลได้");
        }
    }

    // ==========================================================
    // ส่วนที่ 9: ระบบต่ออายุสมาชิก (PUT แบบป้องกันค่า Null)
    // ==========================================================
    async function renewMembership() {
        if (!currentUser) return;

        const today = new Date();
        const newExpObj = new Date(today);
        newExpObj.setFullYear(newExpObj.getFullYear() + 1);
        const newExpStr = newExpObj.toISOString().split('T')[0];

        const updatePayload = {
            houseNumber: currentUser.houseNumber || "",
            ownerName: currentUser.ownerName || "",
            username: currentUser.username || currentUser.houseNumber || "",
            password: currentUser.password || "pass123",
            role: currentUser.role || "member",
            registerDate: currentUser.registerDate || new Date().toISOString().split('T')[0],
            memberStartDate: currentUser.memberStartDate || new Date().toISOString().split('T')[0],
            memberExpireDate: newExpStr
        };

        try {
            const res = await fetch(`${UPDATE_USER_API}/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (res.ok) {
                alert(`ต่ออายุสมาชิกสำเร็จสำหรับบ้านเลขที่ ${currentUser.houseNumber}!\nวันหมดอายุใหม่: ${formatDateDisplay(newExpStr)}`);
                await syncDatabase();
                renderDirectUserDetail();
            } else {
                alert("ต่ออายุสมาชิกไม่สำเร็จ กรุณาลองใหม่");
            }
        } catch (err) {
            console.error("API Update User Error:", err);
            alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อต่ออายุสมาชิกได้");
        }
    }

    // ==========================================================
    // ส่วนที่ 10: การเรนเดอร์หน้าจอ (User Detail, Dashboard, Barcode 13 หลัก)
    // ==========================================================
    function createExpiryProgressBar(startDateStr, timeoutDateStr) {
        const end = parseDate(timeoutDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24));
        const totalDays = 365;
        let percent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100));

        let color = '#28a745';
        if (remainingDays <= 0) {
            percent = 0;
            color = '#dc3545';
        } else if (remainingDays <= 30) {
            color = '#dc3545';
        } else if (remainingDays <= 90) {
            color = '#ffc107';
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
        if (!container || !currentUser) return;

        const myVehicles = allVehiclesData.filter(v => v.user_id === currentUser.id);

        let vehiclesHTML = '';
        if (myVehicles.length > 0) {
            myVehicles.forEach((v) => {
                const typeText = v.type === "Motorcycle" ? "รถจักรยานยนต์" : "รถยนต์";
                vehiclesHTML += `
                <div class="headVlist">
                    <p class="Vlist">${v.plate} ${v.province ? `(${v.province})` : ''}</p>
                    <p class="Vlist">${typeText}</p>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; width: 100%;">
                        <a href="#" data-target="vehicleDetail" data-car-plate="${v.plate}" data-car-id="${v.id}">ดูประวัติ</a>
                        <button type="button" class="btn-delete-v" data-v-id="${v.id}" data-v-plate="${v.plate}">🗑️ ลบ</button>
                    </div>
                </div>`;
            });
        } else {
            vehiclesHTML = `<div class="headVlist">
                                <p class="Vlist">ไม่มีข้อมูลยานพาหนะที่ลงทะเบียน</p>
                                <p class="Vlist">-</p>
                                <p></p>
                            </div>`;
        }

        const progressBar = createExpiryProgressBar(currentUser.memberStartDate, currentUser.memberExpireDate);

        container.innerHTML = `
            <div class="homeNumber">
                <p class="homeList">เลขที่บ้าน</p>
                <p class="homeList">${currentUser.houseNumber || '-'}</p>
            </div>
            <div class="nameOwner">
                <p class="homeList">ชื่อเจ้าบ้าน</p>
                <p class="homeList">${currentUser.ownerName || '-'}</p>
            </div>
            <div class="TimeData">
                <p class="homeList">วันที่เข้าอยู่: ${formatDateDisplay(currentUser.registerDate)}</p>
                <p class="homeList">วันที่เริ่มสมาชิก: ${formatDateDisplay(currentUser.memberStartDate)} | หมดอายุ: ${formatDateDisplay(currentUser.memberExpireDate)}</p>
            </div>
            ${progressBar}
            
            <div style="text-align: center; margin-top: 10px;">
                <button type="button" id="btnRenewMember" style="background-color: #ffc107; color: #212529; border: none; padding: 8px 20px; border-radius: 20px; font-weight: 700; cursor: pointer; font-family: Prompt; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">🔄 ต่ออายุสมาชิก (+1 ปี)</button>
            </div>

            <div class="qr-section">
                <button type="button" class="qr-btn-generate" id="btnGenerateVisitorQR">🎫 สร้าง Barcode สำหรับแขกสแกนเข้าหมู่บ้าน</button>
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

        document.getElementById('btnRenewMember')?.addEventListener('click', renewMembership);
        document.getElementById('btnOpenAddVehicleModal')?.addEventListener('click', () => {
            addVehicleModal.style.display = 'flex';
        });

        container.querySelectorAll('.btn-delete-v').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteVehicle(e.target.dataset.vId, e.target.dataset.vPlate);
            });
        });

        // สร้าง/เปิด Barcode มาตรฐาน Code 128 ตัวเลข 13 หลัก (คงรหัสเดิมไว้จนกว่าจะกดลบ)
        document.getElementById('btnGenerateVisitorQR')?.addEventListener('click', async () => {
            // หากยังไม่มีรหัสเดิม ให้สุ่มรหัส 13 หลักใหม่ขึ้นมา แต่ถ้ามีอยู่แล้วให้ใช้รหัสเดิม
            if (!currentActiveBarcode) {
                currentActiveBarcode = generateRandomVisitorCode(13);
                localStorage.setItem('savedVisitorBarcode', currentActiveBarcode); // จำรหัสไว้ในเครื่อง

                // 🚩 จุดเชื่อมต่อ API บันทึก Barcode ชุดใหม่ลง DB ในอนาคต
                /*
                try {
                    await fetch(CREATE_VISITOR_API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            houseNumber: currentUser.houseNumber,
                            visitorBarcode: currentActiveBarcode,
                            createdAt: new Date().toISOString()
                        })
                    });
                } catch (err) {
                    console.error("บันทึกบาร์โค้ดลง DB ไม่สำเร็จ:", err);
                }
                */
            }

            // นำรหัสบาร์โค้ด (อันเดิมหรือที่เพิ่งสุ่ม) มาสร้างรูปภาพ
            const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${currentActiveBarcode}&scale=3&height=12&includetext`;

            visitorCodeDisplay.textContent = currentActiveBarcode;
            qrImageContainer.innerHTML = `<img src="${barcodeUrl}" alt="Visitor Barcode 13 Digits" style="max-width: 100%; height: auto; border-radius: 4px;">`;
            qrDataText.textContent = `Barcode Number: ${currentActiveBarcode} (บ้านเลขที่: ${currentUser.houseNumber || '-'})`;
            qrModal.style.display = 'flex';
        });
    }

    // จัดการปุ่มยกเลิก/ลบบาร์โค้ด (Cancel / Delete Barcode)
    if (btnDeleteBarcode) {
        btnDeleteBarcode.addEventListener('click', async () => {
            if (!currentActiveBarcode) return;
            
            if (confirm(`คุณต้องการยกเลิกและลบบาร์โค้ดรหัส "${currentActiveBarcode}" ออกใช่หรือไม่?`)) {
                
                // 🚩 จุดเชื่อมต่อ API ยิงลบออกจากฐานข้อมูลหลังบ้าน
                /*
                try {
                    await fetch(`${DELETE_VISITOR_API}/${currentActiveBarcode}`, {
                        method: 'DELETE'
                    });
                } catch (err) {
                    console.error("ลบบาร์โค้ดจาก DB ไม่สำเร็จ:", err);
                }
                */

                alert(`ยกเลิกและลบบาร์โค้ดรหัส ${currentActiveBarcode} เรียบร้อยแล้ว!`);
                
                // ล้างค่าทิ้งเพื่อให้ครั้งหน้าสุ่มรหัสใหม่
                localStorage.removeItem('savedVisitorBarcode');
                currentActiveBarcode = null;
                
                qrModal.style.display = 'none';
                qrImageContainer.innerHTML = '';
                visitorCodeDisplay.textContent = '-';
                qrDataText.textContent = '';
            }
        });
    }

    function renderVehicleDetail(targetPlate, vehicleId) {
        const pVdetail = document.querySelector("#page-vehicleDetail");
        if (!pVdetail) return;

        const vehicle = allVehiclesData.find(v => v.id === Number(vehicleId) || sanitizePlate(v.plate) === sanitizePlate(targetPlate));
        const matchedLogs = getMatchedVehicleLogs(allLogsData, targetPlate);

        let timeIn = '', timeOut = '';
        if (matchedLogs.length > 0) {
            matchedLogs.forEach((log) => {
                timeIn += `<span class="time-record">${log.formattedTimeIn} ${log.cameraInText}</span>`;
                timeOut += `<span class="time-record">${log.formattedTimeOut} ${log.cameraOutText}</span>`;
            });
        } else {
            timeIn = `<span class="time-record">ไม่พบประวัติเข้า</span>`;
            timeOut = `<span class="time-record">ไม่พบประวัติออก</span>`;
        }

        const typeDisplay = vehicle && vehicle.type === "Motorcycle" ? "รถจักรยานยนต์" : "รถยนต์";

        pVdetail.innerHTML = `
        <button type="button" class="back-btn" id="btnBackToDetail">← กลับ</button>
        <div class="vehicle-card">
            <div class="v-title">ประวัติการเข้า-ออก (ดึงข้อมูลจากระบบกล้อง LPR)</div>
            <div class="v-date">วันที่ลงทะเบียนรถ : ${formatDateDisplay(vehicle ? vehicle.registerDate : '')} </div>
            <div class="v-grid">
                <div class="v-item">ป้ายทะเบียน : ${vehicle ? vehicle.plate : targetPlate}</div>
                <div class="v-item">ประเภท : ${typeDisplay}</div>
                <div class="v-item">เวลาเข้า</div>
                <div class="v-item">เวลาออก</div>
                <div class="v-item v-time">${timeIn}</div>
                <div class="v-item v-time">${timeOut}</div>
            </div>
        </div>`;

        document.getElementById('btnBackToDetail')?.addEventListener('click', () => renderPage('user'));
    }

    function renderDashboard() {
        if (!currentUser) return;

        const myVehicles = allVehiclesData.filter(v => v.user_id === currentUser.id);
        const myPlates = myVehicles.map(v => sanitizePlate(v.plate));
        const myLogs = allLogsData.filter(log => myPlates.includes(sanitizePlate(log.plate)));

        let carIn = 0, carOut = 0, insideVillageCount = 0;

        myLogs.forEach(log => {
            if (log.time_in) carIn++;
            if (log.time_out) carOut++;
            if (log.time_in && !log.time_out) insideVillageCount++;
        });

        const statusElem = document.getElementById("residentStatus");
        const expireElem = document.getElementById("expireDateText");

        const expDate = parseDate(currentUser.memberExpireDate);
        const isExpired = expDate < new Date();

        if (statusElem) statusElem.textContent = isExpired ? 'Expired' : 'Active';
        if (expireElem) expireElem.textContent = formatDateDisplay(currentUser.memberExpireDate);

        document.getElementById("vehicleTotal").textContent = myVehicles.length;
        document.getElementById("carIn").textContent = carIn;
        document.getElementById("carOut").textContent = carOut;
        document.getElementById("insideVillage").textContent = insideVillageCount;
        document.getElementById("welcomeText").textContent = `Dashboard ลูกบ้าน (บ้านเลขที่ ${currentUser.houseNumber || '-'})`;
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
            renderDashboard();
        } else if (target === "user") {
            renderDirectUserDetail();
        } else if (target === "vehicleDetail" && params) {
            renderVehicleDetail(params.carPlate, params.carId);
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
            sessionStorage.removeItem('currentUser');
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

    async function init() {
        updateAuthUI();
        await syncDatabase();
        if (currentUser) {
            renderPage('home');
        }
    }

    init();
});

// ==========================================================
// ส่วนที่ 12: ฟังก์ชันสำหรับ Sanitization และจัดการค่า Null
// ==========================================================
function sanitizePlate(plateNumber) {
    if (!plateNumber) return '';
    return plateNumber.toString().replace(/\s+/g, '');
}

function formatLogDateTime(dateString) {
    if (!dateString || dateString === 'null') {
        return 'ยังอยู่ภายในโครงการ';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

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
