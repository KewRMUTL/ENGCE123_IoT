"use strict"

// ===================== ตัวแปรสถานะหลักของแอป =====================
const url = "./dataTest.json";
let mainData = [];       // ข้อมูลลูกบ้านทั้งหมดที่โหลดมาจาก JSON
let isLoading = true;    // true = กำลังโหลดข้อมูลอยู่ (ยังไม่มีข้อมูลให้แสดง)
let fetchStatus = 0;     // เก็บ HTTP status ของการ fetch ล่าสุด (0 = ยังไม่เคยลอง)

// ===================== เมนู / การสลับหน้า =====================
const navItems = document.querySelectorAll('nav li[data-target]');
const pages = document.querySelectorAll('.page');


function showPage(target, params) {
    pages.forEach(page => page.classList.remove('active'));        // ปิดทุกหน้าก่อน
    navItems.forEach(li => li.classList.remove('user-select'));    // เอาไฮไลต์เมนูออกก่อน

    const targetPage = document.querySelector(`#page-${target}`);
    if (targetPage) {
        targetPage.classList.add('active');   // เปิดเฉพาะหน้าที่ต้องการ
        renderUserPage(target, params);           // สั่ง render เนื้อหาของหน้านั้น
    }

    // ไฮไลต์เมนูที่ตรงกับหน้าปัจจุบัน (ทำงานได้ทั้งตอนคลิกเองและตอนเรียกจากโค้ด)
    const activeLi = document.querySelector(`nav li[data-target="${target}"]`);
    if (activeLi) activeLi.classList.add('user-select');
}

// ผูก event คลิกเมนูทุกอัน ให้เรียก showPage ตาม data-target ของ li นั้นๆ
navItems.forEach(li => {
    li.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(li.dataset.target);
    });
});

// เปิดหน้า home เป็นค่าเริ่มต้นตอนโหลดสคริปต์
showPage('home');

// ===================== โหลดข้อมูลจาก dataTest.json =====================
/**
 * ดึงข้อมูลจากไฟล์ JSON แล้วอัปเดตสถานะ loading / error
 * มีการหน่วงเวลาจำลอง (simulate delay) ไว้เพื่อทดสอบ loading state
 */
async function load(path) {
    try {
        // จำลองการหน่วงเวลา 3 วินาที เพื่อให้เห็น loading state ชัดๆ ตอน dev
        await new Promise(resolve => setTimeout(resolve, 3000));

        const res = await fetch(path);
        fetchStatus = res.status;
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();
        mainData = data;
        isLoading = false;
        refreshCurrentPage(); // ข้อมูลมาแล้ว ให้ re-render หน้าที่เปิดอยู่ตอนนี้
    } catch (err) {
        console.log(err);
        isLoading = false;
        // ถ้า fetchStatus ยังเป็น 0 แปลว่า request ไม่ถึงเซิร์ฟเวอร์เลย (เช่นเน็ตหลุด)
        // ให้ตั้งเป็น 500 เพื่อให้ผ่านเงื่อนไข error state และแสดงข้อความแจ้งเตือนได้
        if (fetchStatus === 0) fetchStatus = 500;
        refreshCurrentPage();
    }
}

/**
 * หา li เมนูที่กำลัง active อยู่ แล้วสั่ง render หน้านั้นซ้ำอีกครั้ง
 * ใช้ตอนโหลดข้อมูลเสร็จ (หรือ error) เพื่ออัปเดตหน้าปัจจุบันโดยไม่ต้องรอ user คลิกใหม่
 */
function refreshCurrentPage() {
    const activeLi = document.querySelector('nav li.user-select');
    if (activeLi) {
        const target = activeLi.dataset.target;
        // หน้า user/home/vehicle ไม่ต้องใช้ id ตอน refresh อัตโนมัติ
        renderUserPage(target, null);
    }
}

// ===================== ตัวกลางตัดสินใจว่าจะ render อะไร =====================
/**
 * ฟังก์ชันกลางที่เรียกทุกครั้งที่ต้อง render เนื้อหาในหน้าใดหน้าหนึ่ง
 * เช็คสถานะตามลำดับ: loading -> error -> success แล้วค่อยตัดสินใจว่า
 * จะ render ข้อมูลจริงของหน้านั้น (user / userDetail / vehicle / home)
 */
function renderUserPage(target, params) {
    // 1. หาหน้าที่กำลังเปิดอยู่
    const targetPage = document.querySelector(`#page-${target}`);

    // 2. หา container สำหรับแสดงข้อความ loading/error "ภายใน" หน้านั้นเท่านั้น
    //    (กันไม่ให้ไปทับ container ของหน้าอื่นโดยไม่ตั้งใจ)
    let loadingContainer = null;
    if (targetPage) {
        loadingContainer = targetPage.querySelector('.dataLoading') || targetPage.querySelector('#UserData');
    }
    // หมายเหตุ: หน้า #page-userDetail ยังไม่มี .dataLoading หรือ #UserData อยู่ข้างใน
    // ถ้าจะรองรับ loading/error ตอนเข้าหน้านี้โดยตรง (เช่นแชร์ลิงก์) ต้องเพิ่ม container ให้หน้านี้ด้วย

    // 3. เช็คสถานะ "กำลังโหลด"
    if (isLoading) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text">Loading data...</p>`;
        }
        return;
    }

    // 4. เช็คสถานะ "error" (HTTP status ไม่อยู่ในช่วง 200-299)
    if (fetchStatus < 200 || fetchStatus > 299) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text" style="color: red;">Data loading error Please try again later(Code: ${fetchStatus})</p>`;
        }
        return;
    }

    // 5. สถานะ "สำเร็จ" -> render เนื้อหาจริงตามหน้า
    if (target === "user") {
        console.log(`Open USER DATA`);
        updateData(mainData);
    } else if (target === "userDetail") {
        console.log(`Open moreDetailsUser`);
        moreDetailsUser(Number(params.id));
    } else if (target === "vehicleDetail") {
        vDetail(Number(params.id), Number(params.carIndex));
    } else if (target === "vehicle") {
        renderVehicleList();
    } else if(target=="home"){
        renderDashboard();     // edited
    }
}


// ===================== Render หน้า USER DATA (list) =====================
/**
 * สร้างรายการ user ทั้งหมดใส่ใน #UserData
 * (ตั้งค่า innerHTML ครั้งเดียวหลัง loop จบ เพื่อลด reflow/repaint)
 */
function updateData(data) {
    const UserData = document.querySelector('#UserData');
    let div = "";
    data.forEach(element => {
        div += `
        <div class="User">
            <h2>${element.id}</h2>
            <h2>${element.houseNumber}</h2>
            <a href="#" data-id="${element.id}" data-target="userDetail" >แสดงข้อมูลเพิ่มเติม</a>
        </div>
        `;
    });
    UserData.innerHTML = div || `<p class="loading-text">ไม่พบข้อมูลลูกบ้าน</p>`;
}

// ===================== คำนวณหลอดสีวันหมดอายุ (Progress Bar) =====================
/**
 * ฟังก์ชันสร้าง Progress Bar สีเขียว-ส้ม-แดง ตามวันหมดอายุของสมาชิก
 */
// ===================== คำนวณหลอดสีวันหมดอายุ (Progress Bar) =====================
/**
 * ฟังก์ชันแปลง สตริง "DD/MM/YYYY" เป็น Date Object ของ JavaScript อย่างถูกต้อง
 */
function parseThaiDateStr(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    // parts[0] = วัน, parts[1] = เดือน (ต้อง -1 เพราะ JS นับเดือน 0-11), parts[2] = ปี
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

/**
 * ฟังก์ชันสร้าง Progress Bar สีเขียว-ส้ม-แดง คำนวณเปอร์เซ็นต์และจำนวนวันถูกต้อง 100%
 */
function createExpiryProgressBar(startDateStr, timeoutDateStr) {
    const start = parseThaiDateStr(startDateStr);
    const end = parseThaiDateStr(timeoutDateStr);
    
    // ตั้งเวลาปัจจุบันเป็น 00:00:00 เพื่อคำนวณจำนวนวันแบบเป๊ะๆ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // คำนวณระยะเวลาทั้งหมด (วัน) และ วันที่เหลืออยู่
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24));

    // คำนวณเปอร์เซ็นต์ความยาวหลอด (0% - 100%)
    let percent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100));

    // กำหนดสีหลอดตามเปอร์เซ็นต์ที่เหลืออยู่
    let color = '#28a745'; // สีเขียว (หลอดเกือบเต็ม / สมาชิกยังเหลือเยอะ)
    if (percent <= 20 || remainingDays <= 7) {
        color = '#dc3545'; // สีแดง (หลอดลดลงจนใกล้หมด)
    } else if (percent <= 60) {
        color = '#ffc107'; // สีเหลือง/ส้ม (ปานกลาง)
    }

    // กรณีหมดอายุแล้ว
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

    // สร้างรายการยานพาหนะ
    let vehiclesHTML = '';
    if (user.vehicles && user.vehicles.length > 0) {
        user.vehicles.forEach((v, index) => {
            vehiclesHTML += `
            <div class="headVlist">
                <p class="Vlist">${v.plate}</p>
                <p class="Vlist">${v.type}</p>
                <a href="" data-target="vehicleDetail" data-car-index="${index}" data-id="${user.id}">แสดงข้อมูลเพิ่มเติม</a>
            </div>`;
        });
    } else {
        vehiclesHTML = `<div class="headVlist">
                            <p class="Vlist">-</p>
                            <p class="Vlist">-</p>
                            <p></p>
                        </div>`;
    }

    // สร้างหลอดคำนวณวันหมดอายุจากข้อมูลใน JSON โดยตรง
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
                <h1 class="vehicleList">รายละเอียดยานพาหนะ</h1>
                <div class="headVlist">
                    <h3 class="Vlist">ป้ายทะเบียน</h3>
                    <h3 class="Vlist">ประเภทยานพาหนะ</h3>
                    <h3 class="Vlist"></h3>
                </div>
                ${vehiclesHTML}
            </section>`;
}


// แสดงข้อมูลรถแต่ละคัน
function vDetail(id, carIndex) {
    const user = mainData.find(u => u.id === id);
    const pVdetail = document.querySelector("#page-vehicleDetail");
    if (!user) {
        pVdetail.innerHTML = `<p class="loading-text">ไม่พบข้อมูล</p>`;
        return;
    }
    const data = user.vehicles[carIndex];//เข้าถึงข้อมูลรถ
    if (!data) {
        pVdetail.innerHTML = `<p class="loading-text">ไม่พบข้อมูลยานพาหนะ</p>`;
        return;
    }

    let timeIn = '';
    let timeOut = '';
    if (data.timeInOut.length > 0) {
        data.timeInOut.forEach((t) => {
            timeIn += `
            <span class="time-record">${t.in}</span>
            `
            timeOut += `
            <span class="time-record">${t.out}</span>
            `
        });
    } else {
        timeIn += `
            <span class="time-record">-</span>
            `
        timeOut += `
        <span class="time-record">-</span>
        `
    }
    let page = `
    <button class="back-btn"
    onclick="showPage('userDetail',{
    id:${id}
    })">
    ← กลับ
    </button>

    <div class="vehicle-card">
    <!-- head -->
    <div class="v-title">Vehicle information.</div>
    <div class="v-date">Register : ${data.regitter ?? '-'} </div>
    
    <!-- time -->
    <div class="v-grid">
    <div class="v-item">ป้ายทะเบียน : ${data.plate}</div>
    <div class="v-item">ประเภท : ${data.type}</div>
    
    <div class="v-item">เวลาเข้า</div>
    <div class="v-item">เวลาออก</div>
    
    <!-- Box สำหรับเวลาเข้า-->
    <div class="v-item v-time" id="time-in-list">
    ${timeIn}
    </div>
    
    <!-- Box สำหรับเวลาออก -->
    <div class="v-item v-time" id="time-out-list">
    ${timeOut}
    </div>
    </div>
    </div>`;
    pVdetail.innerHTML = page;
}

// Render หน้า VEHICLE DATA
function renderVehicleList() {
    const vContainer = document.querySelector("#vehicleList");
    let html = "";
    mainData.forEach(user => {
        user.vehicles.forEach((v, index) => {
            html += `
            <div class="User" style="min-width: unset; margin: 10px 20px;">
                <h2>${v.plate}</h2>
                <h2>${v.type} (บ้าน ${user.houseNumber})</h2>
                <a href="#" data-id="${user.id}" data-car-index="${index}" data-target="vehicleDetail">ดูการเข้า-ออก</a>
            </div>`;
        });
    });
    vContainer.innerHTML = html || `<p class="loading-text">ไม่พบข้อมูลยานพาหนะ</p>`;
}

// ฟังก์ชันกรอง/ค้นหาข้อมูลลูกบ้าน
function filterUsers() {
    const keyword = document.getElementById("searchUser").value.toLowerCase();
    const filtered = mainData.filter(u => 
        u.houseNumber.toLowerCase().includes(keyword) || 
        u.ownerName.toLowerCase().includes(keyword)
    );
    updateData(filtered);
}

// ===================== Event delegation สำหรับลิงก์ในรายการ user =====================
// ใช้วิธี delegate ที่ #UserData ตัวเดียว แทนการผูก event ให้ทุก <a> ที่สร้างขึ้นใหม่
// เพราะ element พวกนี้ถูกสร้างใหม่ทุกครั้งที่ updateData() รันใหม่
document.querySelector('.main-content').addEventListener('click', (e) => {
    const link = e.target.closest('a[data-target]');
    if (!link) return;
    e.preventDefault();

    const { target, ...params } = link.dataset;

    console.log(`target:${target}`);
    console.log(`params:`, params);
    showPage(target, params);
});

// เริ่มโหลดข้อมูลทันทีที่สคริปต์รัน
load(url);


/* ==========================================
Dashboard
========================================== */

function renderDashboard() {
    // 1. สรุปจำนวนลูกบ้านทั้งหมด
    document.getElementById("residentTotal").textContent = mainData.length;

    let vehicleTotal = 0;
    let carIn = 0;
    let carOut = 0;
    let expire = 0;
    let insideVillageCount = 0;

    const today = new Date();

    // ลูปตรวจเช็คข้อมูลลูกบ้านและรถทุกคัน
    mainData.forEach(user => {
        vehicleTotal += user.vehicles.length;

        user.vehicles.forEach(vehicle => {
            if (vehicle.timeInOut && vehicle.timeInOut.length > 0) {
                vehicle.timeInOut.forEach(log => {
                    if (log.in) carIn++;   // ถ้าระบุเวลาเข้า ให้นับยอดเข้า
                    if (log.out) carOut++; // ถ้าระบุเวลาออก ให้นับยอดออก
                    
                    // ถ้ารถมีการเข้าแต่ยังไม่ออก (หรือออกหลังสุดเป็นค่าว่าง) ให้นับว่าอยู่ในหมู่บ้าน
                    if (log.in && !log.out) {
                        insideVillageCount++;
                    }
                });
            }
        });

        // ตรวจสอบวันหมดอายุบัตรสมาชิก (ใกล้หมดอายุภายใน 30 วัน)
        if (user.MemberTimeout) {
            const [day, month, year] = user.MemberTimeout.split("/");
            const expireDate = new Date(year, month - 1, day);
            const diffDays = (expireDate - today) / (1000 * 60 * 60 * 24);

            if (diffDays <= 30 && diffDays >= 0) {
                expire++;
            }
        }
    });

    // แสดงผลข้อมูลลงใน Dashboard
    document.getElementById("vehicleTotal").textContent = vehicleTotal;
    document.getElementById("carIn").textContent = carIn;
    document.getElementById("carOut").textContent = carOut;
    document.getElementById("expireTotal").textContent = expire;
    document.getElementById("insideVillage").textContent = insideVillageCount;

    // แสดงวันที่ปัจจุบัน
    document.getElementById("todayDate").textContent =
        new Date().toLocaleDateString("th-TH", {
            dateStyle: "full"
        });
}