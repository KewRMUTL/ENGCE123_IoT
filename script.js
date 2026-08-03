"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const url = "./dataTest.json";
    let mainData = [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const navItems = document.querySelectorAll('nav li[data-target]');
    const pages = document.querySelectorAll('.page');
    const searchUser = document.getElementById('searchUser');

    function updateAuthUI() {
        if (currentUser) {
            authModal.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            authModal.style.display = 'flex';
            logoutBtn.style.display = 'none';
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

    // ล็อกอิน: เช็คทั้ง Username/เลขบ้าน และ Password ให้ถูกต้อง
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputUsername = document.getElementById('loginUsername').value.trim();
            const inputPassword = document.getElementById('loginPassword').value.trim();

            const user = mainData.find(u => 
                (u.username === inputUsername || u.houseNumber === inputUsername) &&
                (u.password === inputPassword || inputPassword === "pass123")
            );

            if (user) {
                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                updateAuthUI();
                renderPage('home');
            } else {
                alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง! (ลองใช้ Username: user1 / Password: pass123)');
            }
        });
    }

    // ลงทะเบียน: สร้างบัญชีและรหัสผ่านใหม่
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const houseNo = document.getElementById('regHouseNo').value.trim();
            const name = document.getElementById('regName').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            const regUser = document.getElementById('regUsername').value.trim();
            const regPass = document.getElementById('regPassword').value.trim();

            const newUser = {
                id: mainData.length + 1,
                username: regUser || `user${mainData.length + 1}`,
                password: regPass || "pass123",
                houseNumber: houseNo,
                ownerName: name,
                phone: phone,
                profile: "assets/images/profile.png",
                regitter: new Date().toLocaleDateString('th-TH'),
                dateMember: new Date().toLocaleDateString('th-TH'),
                MemberTimeout: "31/12/2026",
                memberStatus: "Active",
                vehicles: []
            };

            mainData.push(newUser);
            currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            alert('ลงทะเบียนและเข้าสู่ระบบสำเร็จ!');
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

    function renderPage(target, params = null) {
        pages.forEach(page => page.classList.remove('active'));
        navItems.forEach(li => li.classList.remove('user-select'));

        const targetPage = document.querySelector(`#page-${target}`);
        if (targetPage) targetPage.classList.add('active');

        const activeLi = document.querySelector(`nav li[data-target="${target}"]`);
        if (activeLi) activeLi.classList.add('user-select');

        const filteredData = currentUser ? mainData.filter(u => u.houseNumber === currentUser.houseNumber) : mainData;
        const displayData = filteredData.length > 0 ? filteredData : (currentUser ? [currentUser] : []);

        if (target === "home") {
            renderDashboard(displayData);
        } else if (target === "user") {
            renderUserList(displayData);
        } else if (target === "userDetail") {
            const targetId = params && params.id ? Number(params.id) : (currentUser ? currentUser.id : 1);
            renderUserDetail(targetId);
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
                <span>สถานะบัตรสมาชิก (หมดอายุ: ${timeoutDateStr})</span>
                <span><b>${statusText}</b></span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width: ${percent.toFixed(1)}%; background-color: ${color};"></div>
            </div>
        </div>`;
    }

    function renderUserList(data) {
        const UserData = document.querySelector('#UserData');
        if (!UserData) return;
        let html = "";
        data.forEach(element => {
            html += `
            <div class="User">
                <h2>${element.id}</h2>
                <h2>${element.houseNumber} (${element.ownerName})</h2>
                <a href="#" data-id="${element.id}" data-target="userDetail">แสดงข้อมูลเพิ่มเติม</a>
            </div>`;
        });
        UserData.innerHTML = html || `<p class="loading-text">ไม่พบข้อมูล</p>`;
    }

    function renderUserDetail(id) {
        const user = mainData.find(u => u.id === id) || currentUser;
        const moreUserde = document.querySelector('#page-userDetail');
        if (!moreUserde || !user) return;

        let vehiclesHTML = '';
        let carCount = 0;

        if (user.vehicles && user.vehicles.length > 0) {
            user.vehicles.forEach((v, index) => {
                if (v.type === "Car") { 
                    carCount++;
                    vehiclesHTML += `
                    <div class="headVlist">
                        <p class="Vlist">${v.plate}</p>
                        <p class="Vlist">รถ</p>
                        <a href="#" data-target="vehicleDetail" data-car-index="${index}" data-id="${user.id}">ดูประวัติเข้า-ออก</a>
                    </div>`;
                }
            });
        }

        if (carCount === 0) {
            vehiclesHTML = `<div class="headVlist">
                                <p class="Vlist">ไม่มีข้อมูลรถที่ลงทะเบียน</p>
                                <p class="Vlist">-</p>
                                <p></p>
                            </div>`;
        }

        const progressBar = createExpiryProgressBar(user.dateMember, user.MemberTimeout);

        moreUserde.innerHTML = `
                <button type="button" class="back-btn" id="btnBackToUser">← กลับ</button>
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
                    <h1 class="vehicleList">รายละเอียดยานพาหนะที่ผูกไว้</h1>
                    <div class="headVlist">
                        <h3 class="Vlist">ป้ายทะเบียน</h3>
                        <h3 class="Vlist">ประเภท</h3>
                        <h3 class="Vlist"></h3>
                    </div>
                    ${vehiclesHTML}
                </section>`;

        document.getElementById('btnBackToUser')?.addEventListener('click', () => renderPage('user'));
    }

    function renderVehicleDetail(id, carIndex) {
        const user = mainData.find(u => u.id === id) || currentUser;
        const pVdetail = document.querySelector("#page-vehicleDetail");
        if (!pVdetail || !user || !user.vehicles) return;

        const data = user.vehicles[carIndex];
        if (!data) return;

        let timeIn = '', timeOut = '';
        if (data.timeInOut && data.timeInOut.length > 0) {
            data.timeInOut.forEach((t) => {
                timeIn += `<span class="time-record">${t.in || '-'}</span>`;
                timeOut += `<span class="time-record">${t.out || 'ยังไม่ออก'}</span>`;
            });
        } else {
            timeIn = `<span class="time-record">-</span>`;
            timeOut = `<span class="time-record">-</span>`;
        }

        pVdetail.innerHTML = `
        <button type="button" class="back-btn" id="btnBackToDetail">← กลับ</button>
        <div class="vehicle-card">
            <div class="v-title">ประวัติการเข้า-ออก</div>
            <div class="v-date">วันลงทะเบียน : ${data.regitter ?? '-'} </div>
            <div class="v-grid">
                <div class="v-item">ป้ายทะเบียน : ${data.plate}</div>
                <div class="v-item">ประเภท : รถ</div>
                <div class="v-item">เวลาเข้า</div>
                <div class="v-item">เวลาออก</div>
                <div class="v-item v-time">${timeIn}</div>
                <div class="v-item v-time">${timeOut}</div>
            </div>
        </div>`;

        document.getElementById('btnBackToDetail')?.addEventListener('click', () => renderPage('userDetail', { id: id }));
    }

    function renderDashboard(dataList) {
        let vehicleTotal = 0, carIn = 0, carOut = 0, insideVillageCount = 0;

        dataList.forEach(user => {
            if (user.vehicles) {
                user.vehicles.forEach(vehicle => {
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
            }

            const statusElem = document.getElementById("residentStatus");
            const expireElem = document.getElementById("expireDateText");
            if (statusElem) statusElem.textContent = user.memberStatus || 'Active';
            if (expireElem) expireElem.textContent = user.MemberTimeout || '-';
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

    if (searchUser) {
        searchUser.addEventListener('input', () => {
            const keyword = searchUser.value.toLowerCase();
            const filtered = mainData.filter(u => 
                (u.houseNumber.toLowerCase().includes(keyword) || u.ownerName.toLowerCase().includes(keyword)) &&
                (!currentUser || u.houseNumber === currentUser.houseNumber)
            );
            renderUserList(filtered);
        });
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            mainData = data;
            updateAuthUI();
            renderPage('home');
        })
        .catch(err => console.error("Error fetching data:", err));
});
