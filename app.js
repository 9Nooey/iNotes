// --- ส่วนตั้งค่า Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDD4gvO83RpdUhIRSvwutdc6Fzp2FOg3-4",
  authDomain: "my-inotes.firebaseapp.com",
  projectId: "my-inotes",
  storageBucket: "my-inotes.firebasestorage.app",
  messagingSenderId: "541940097515",
  appId: "1:541940097515:web:1a5302983a1d0f1aafb9ae"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let allNotes = {}; 
let isEditing = false;
let currentEditId = null;

// --- Helper Functions ---
function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatDate(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    return date.toLocaleString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// --- Core Functions ---

function loadNotes() {
    const list = document.getElementById('noteList');
    list.innerHTML = "";
    allNotes = {};

    db.collection("notes").orderBy("updatedAt", "desc").get().then((querySnapshot) => {
        if(querySnapshot.empty) {
            list.innerHTML = "<p style='text-align:center; color:#999; margin-top:20px;'>ยังไม่มีบันทึก</p>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allNotes[doc.id] = data; // เก็บข้อมูลดิบ

            const safeTitle = escapeHtml(data.title);
            const safeContent = escapeHtml(data.content);
            const updatedStr = formatDate(data.updatedAt);

            const li = document.createElement('li');
            li.id = `li-${doc.id}`;
            li.onclick = () => selectNote(doc.id); // คลิกแล้วไปหน้าอ่าน (Read Mode)
            
            li.innerHTML = `
                <h3>${safeTitle}</h3>
                <p>${safeContent}</p>
                <div class="timestamp">แก้ไขล่าสุด: ${updatedStr}</div>
            `;
            list.appendChild(li);
        });
    });
}

// 1. ฟังก์ชันเมื่อคลิกรายการ (แสดง Read Mode)
function selectNote(id) {
    const data = allNotes[id];
    if (!data) return;

    // Highlight รายการที่เลือก
    document.querySelectorAll('li').forEach(el => el.classList.remove('active'));
    const activeLi = document.getElementById(`li-${id}`);
    if(activeLi) activeLi.classList.add('active');

    currentEditId = id; // จำ ID ไว้ เผื่อกดแก้ไข

    // ใส่ข้อมูลลงในส่วน View Mode
    document.getElementById('viewTitle').innerText = data.title;
    document.getElementById('viewContent').innerText = data.content; // ใช้ innerText เพื่อความปลอดภัย
    document.getElementById('viewMeta').innerText = `สร้างเมื่อ: ${formatDate(data.createdAt)} | แก้ไขล่าสุด: ${formatDate(data.updatedAt)}`;

    // สลับหน้าจอ: แสดง View, ซ่อน Edit
    document.getElementById('viewSection').style.display = 'block';
    document.getElementById('editSection').style.display = 'none';

    // ถ้าเป็นมือถือ เลื่อนจอขึ้นไปดูเนื้อหา
    if(window.innerWidth <= 900) {
        document.querySelector('.editor-area').scrollIntoView({ behavior: 'smooth' });
    }
}

// 2. ฟังก์ชันเมื่อกดปุ่ม "แก้ไข" (เปลี่ยนเป็น Edit Mode)
function enableEditMode() {
    const data = allNotes[currentEditId];
    if(!data) return;

    isEditing = true;
    
    // เอาข้อมูลไปใส่ในช่องกรอก
    document.getElementById('noteTitle').value = data.title;
    document.getElementById('noteContent').value = data.content;
    
    // ปรับ UI ปุ่ม
    document.getElementById('formTitle').innerText = "✏️ แก้ไขบันทึก";
    document.getElementById('saveBtn').innerText = "บันทึกการแก้ไข";
    document.getElementById('cancelBtn').style.display = "block"; // ปุ่มยกเลิกโผล่มา

    // สลับหน้าจอ: แสดง Edit, ซ่อน View
    document.getElementById('viewSection').style.display = 'none';
    document.getElementById('editSection').style.display = 'block';
}

// 3. ฟังก์ชันสำหรับเขียนใหม่ (New Note)
function showCreateForm() {
    isEditing = false;
    currentEditId = null;
    
    // เคลียร์ฟอร์ม
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    
    document.getElementById('formTitle').innerText = "📝 เขียนบันทึกใหม่";
    document.getElementById('saveBtn').innerText = "บันทึก";
    document.getElementById('cancelBtn').style.display = "none";
    
    // สลับหน้าจอ: แสดง Edit, ซ่อน View
    document.getElementById('viewSection').style.display = 'none';
    document.getElementById('editSection').style.display = 'block';

    // เอา Highlight ออก
    document.querySelectorAll('li').forEach(el => el.classList.remove('active'));
}

function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;

    if (!title.trim() || !content.trim()) { alert("กรุณากรอกข้อมูล"); return; }

    const saveData = {
        title: title,
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (isEditing) {
        // อัปเดตข้อมูลเก่า
        db.collection("notes").doc(currentEditId).update(saveData).then(() => {
            loadNotes();
            // เมื่อบันทึกเสร็จ ให้กลับไปหน้า View Mode ของอันที่เพิ่งแก้
            // เราต้องรอแป๊บนึงเพื่อให้ allNotes อัปเดต (แต่เพื่อความเร็วเราอัปเดต UI หลอกไปก่อนได้)
            setTimeout(() => selectNote(currentEditId), 500); 
        });
    } else {
        // สร้างใหม่
        saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        db.collection("notes").add(saveData).then((docRef) => {
            loadNotes();
            // ไปหน้า View Mode ของอันที่เพิ่งสร้าง
            setTimeout(() => selectNote(docRef.id), 500);
        });
    }
}

function cancelEdit() {
    // กดยกเลิก จะกลับไปหน้าดู (View Mode)
    if(currentEditId) {
        selectNote(currentEditId);
    } else {
        showCreateForm();
    }
}

loadNotes();
showCreateForm(); // เริ่มต้นให้เป็นหน้าเขียนใหม่
