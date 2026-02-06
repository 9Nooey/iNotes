// --- ส่วนตั้งค่า Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDD4gvO83RpdUhIRSvwutdc6Fzp2FOg3-4",
  authDomain: "my-inotes.firebaseapp.com",
  projectId: "my-inotes",
  storageBucket: "my-inotes.firebasestorage.app",
  messagingSenderId: "541940097515",
  appId: "1:541940097515:web:1a5302983a1d0f1aafb9ae"
};

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let isEditing = false;
let currentEditId = null;

// --- Security function: ป้องกัน XSS Attack ---
// ฟังก์ชันนี้จะแปลงอักขระพิเศษ HTML ให้เป็นข้อความธรรมดา ป้องกันการรัน Script อันตราย
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Create: เพิ่มข้อมูล ---
function addNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;

    // Validation: ป้องกันข้อมูลว่างเปล่า
    if (!title.trim() || !content.trim()) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    if (isEditing) {
        updateNoteInDB(title, content);
    } else {
        db.collection("notes").add({
            title: title, // Firestore จะเก็บข้อมูลแบบ Plain Text
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            resetForm();
            loadNotes();
        })
        .catch((error) => {
            console.error("Error adding document: ", error);
        });
    }
}

// --- Read: อ่านข้อมูล ---
function loadNotes() {
    const list = document.getElementById('noteList');
    list.innerHTML = ""; // เคลียร์ของเก่า

    db.collection("notes").orderBy("timestamp", "desc").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // ใช้ escapeHtml ตอนแสดงผล เพื่อป้องกัน XSS
            const safeTitle = escapeHtml(data.title);
            const safeContent = escapeHtml(data.content);
            
            list.innerHTML += `
                <li>
                    <h3>${safeTitle}</h3>
                    <p>${safeContent}</p>
                    <div class="actions">
                        <button class="btn-edit" onclick="editNote('${doc.id}', '${safeTitle}', '${safeContent}')">แก้ไข</button>
                        <button class="btn-delete" onclick="deleteNote('${doc.id}')">ลบ</button>
                    </div>
                </li>
            `;
        });
    });
}

// --- Update: เตรียมข้อมูลเพื่อแก้ไข ---
function editNote(id, title, content) {
    isEditing = true;
    currentEditId = id;
    document.getElementById('noteTitle').value = title;
    document.getElementById('noteContent').value = content;
    document.getElementById('saveBtn').innerText = "อัพเดท";
    document.getElementById('cancelBtn').style.display = "inline-block";
}

function updateNoteInDB(title, content) {
    db.collection("notes").doc(currentEditId).update({
        title: title,
        content: content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        resetForm();
        loadNotes();
    });
}

// --- Delete: ลบข้อมูล ---
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
    document.getElementById('saveBtn').innerText = "บันทึก";
    document.getElementById('cancelBtn').style.display = "none";
}

function cancelEdit() {
    resetForm();
}

// โหลดข้อมูลเมื่อเข้าเว็บ
loadNotes();