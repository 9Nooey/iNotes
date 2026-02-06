// --- ส่วนตั้งค่า Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDD4gvO83RpdUhIRSvwutdc6Fzp2FOg3-4",
  authDomain: "my-inotes.firebaseapp.com",
  projectId: "my-inotes",
  storageBucket: "my-inotes.firebasestorage.app",
  messagingSenderId: "541940097515",
  appId: "1:541940097515:web:1a5302983a1d0f1aafb9ae"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ตัวแปรเก็บข้อมูล Note ทั้งหมด (เพื่อดึงมาแสดงตอนคลิก)
let allNotes = {}; 
let isEditing = false;
let currentEditId = null;

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatDate(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    return date.toLocaleString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// โหลดข้อมูลและสร้างรายการ
function loadNotes() {
    const list = document.getElementById('noteList');
    list.innerHTML = "";
    allNotes = {}; // เคลียร์ข้อมูลเก่า

    db.collection("notes").orderBy("updatedAt", "desc").get().then((querySnapshot) => {
        if(querySnapshot.empty) {
            list.innerHTML = "<p style='text-align:center; color:#999;'>ยังไม่มีบันทึก</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // เก็บข้อมูลดิบไว้ในตัวแปร global เพื่อเรียกใช้ตอนคลิก (แก้ปัญหาเครื่องหมายคำพูด)
            allNotes[doc.id] = data;

            const safeTitle = escapeHtml(data.title);
            const safeContent = escapeHtml(data.content); // CSS จะตัดบรรทัดให้เอง
            const updatedStr = formatDate(data.updatedAt);

            // สร้าง HTML (สังเกต onclick จะเรียกฟังก์ชัน selectNote)
            const li = document.createElement('li');
            li.id = `li-${doc.id}`;
            li.onclick = () => selectNote(doc.id); // คลิกที่กล่องเพื่อดู
            
            li.innerHTML = `
                <h3>${safeTitle}</h3>
                <p>${safeContent}</p>
                <div class="timestamp">
                    <span>แก้ไข: ${updatedStr}</span>
                </div>
                <div class="actions">
                    <button class="btn-delete" onclick="event.stopPropagation(); deleteNote('${doc.id}')">ลบ</button>
                </div>
            `;
            list.appendChild(li);
        });
    });
}

// ฟังก์ชันเมื่อคลิกที่รายการทางซ้าย
function selectNote(id) {
    const data = allNotes[id]; // ดึงข้อมูลจากตัวแปรที่เก็บไว้
    if (!data) return;

    // Highlight รายการที่เลือก
    document.querySelectorAll('li').forEach(el => el.classList.remove('active'));
    const activeLi = document.getElementById(`li-${id}`);
    if(activeLi) activeLi.classList.add('active');

    // เข้าสู่โหมดแก้ไข/ดูทันที
    isEditing = true;
    currentEditId = id;
    
    document.getElementById('noteTitle').value = data.title;
    document.getElementById('noteContent').value = data.content;
    
    document.getElementById('formTitle').innerText = "✏️ กำลังดู/แก้ไขบันทึก";
    document.getElementById('saveBtn').innerText = "อัพเดทการแก้ไข";
    document.getElementById('cancelBtn').style.display = "inline-block";
    
    // ถ้าเป็นมือถือ ให้เลื่อนจอไปที่ฟอร์ม
    if(window.innerWidth <= 900) {
        document.querySelector('.editor-area').scrollIntoView({ behavior: 'smooth' });
    }
}

function addNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;

    if (!title.trim() || !content.trim()) { alert("กรุณากรอกข้อมูล"); return; }

    const saveData = {
        title: title,
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (isEditing) {
        db.collection("notes").doc(currentEditId).update(saveData).then(() => {
            loadNotes();
            resetForm();
        });
    } else {
        saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        db.collection("notes").add(saveData).then(() => {
            loadNotes();
            resetForm();
        });
    }
}

function deleteNote(id) {
    if(confirm("ลบรายการนี้?")) {
        db.collection("notes").doc(id).delete().then(() => {
            if(currentEditId === id) resetForm(); // ถ้าลบตัวที่เปิดอยู่ ให้เคลียร์ฟอร์ม
            loadNotes();
        });
    }
}

function resetForm() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    isEditing = false;
    currentEditId = null;
    document.getElementById('formTitle').innerText = "📝 เขียนบันทึกใหม่";
    document.getElementById('saveBtn').innerText = "บันทึกใหม่";
    document.getElementById('cancelBtn').style.display = "none";
    
    // เอา Highlight ออก
    document.querySelectorAll('li').forEach(el => el.classList.remove('active'));
}

function cancelEdit() {
    resetForm();
}

// เริ่มทำงาน
loadNotes();
