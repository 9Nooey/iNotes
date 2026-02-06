// --- ส่วนตั้งค่า Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDD4gvO83RpdUhIRSvwutdc6Fzp2FOg3-4",
  authDomain: "my-inotes.firebaseapp.com",
  projectId: "my-inotes",
  storageBucket: "my-inotes.firebasestorage.app",
  messagingSenderId: "541940097515",
  appId: "1:541940097515:web:1a5302983a1d0f1aafb9ae"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let isEditing = false;
let currentEditId = null;

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ฟังก์ชันแปลง Timestamp เป็นวันที่ภาษาไทย
function formatDate(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate(); // แปลง Firestore Timestamp เป็น JS Date
    return date.toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function addNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;

    if (!title.trim() || !content.trim()) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    if (isEditing) {
        updateNoteInDB(title, content);
    } else {
        db.collection("notes").add({
            title: title,
            content: content,
            // บันทึกทั้งเวลาสร้างและเวลาแก้ไขครั้งแรก
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            resetForm();
            loadNotes(); // โหลดใหม่เพื่ออัปเดตรายการ
        })
        .catch((error) => console.error("Error:", error));
    }
}

function loadNotes() {
    const list = document.getElementById('noteList');
    list.innerHTML = ""; 

    db.collection("notes").orderBy("updatedAt", "desc").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const safeTitle = escapeHtml(data.title);
            const safeContent = escapeHtml(data.content);
            
            // ดึงข้อมูลวันที่
            const createdStr = formatDate(data.createdAt || data.timestamp); // รองรับข้อมูลเก่าที่ใช้ field timestamp
            const updatedStr = formatDate(data.updatedAt);

            list.innerHTML += `
                <li>
                    <h3>${safeTitle}</h3>
                    <p>${safeContent}</p>
                    <div class="timestamp">
                        <span>🕒 สร้าง: ${createdStr}</span>
                        <span>✏️ แก้ไข: ${updatedStr}</span>
                    </div>
                    <div class="actions">
                        <button class="btn-edit" onclick="editNote('${doc.id}', '${safeTitle}', '${safeContent.replace(/\n/g, "\\n")}')">แก้ไข</button>
                        <button class="btn-delete" onclick="deleteNote('${doc.id}')">ลบ</button>
                    </div>
                </li>
            `;
        });
    });
}

function editNote(id, title, content) {
    isEditing = true;
    currentEditId = id;
    document.getElementById('noteTitle').value = title;
    document.getElementById('noteContent').value = content;
    
    document.getElementById('formTitle').innerText = "✏️ กำลังแก้ไขบันทึก";
    document.getElementById('saveBtn').innerText = "อัพเดท";
    document.getElementById('cancelBtn').style.display = "inline-block";
    
    // เลื่อนหน้าจอกลับมาที่ฟอร์ม (สำหรับมือถือ)
    document.querySelector('.editor-area').scrollIntoView({ behavior: 'smooth' });
}

function updateNoteInDB(title, content) {
    db.collection("notes").doc(currentEditId).update({
        title: title,
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() // อัปเดตเฉพาะเวลาแก้ไข
    }).then(() => {
        resetForm();
        loadNotes();
    });
}

function deleteNote(id) {
    if(confirm("คุณต้องการลบรายการนี้ใช่ไหม?")) {
        db.collection("notes").doc(id).delete().then(() => {
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
    document.getElementById('saveBtn').innerText = "บันทึก";
    document.getElementById('cancelBtn').style.display = "none";
}

function cancelEdit() {
    resetForm();
}

loadNotes();
