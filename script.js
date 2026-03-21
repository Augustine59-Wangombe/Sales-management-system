// =======================
// Firebase Firestore Functions
// =======================
import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =======================
// Admin Password
// =======================
const ADMIN_PASSWORD = "admin123"; // Change as needed

// =======================
// Inventory Data
// =======================
let items = [];

// =======================
// Load Inventory
// =======================
async function loadItems() {
  const querySnapshot = await getDocs(collection(db, "items"));
  items = [];
  querySnapshot.forEach(docSnap => {
    items.push({ id: docSnap.id, ...docSnap.data() });
  });

  // ------------------------
  // Page-specific rendering
  // ------------------------
  if (document.getElementById('profit')) {
    renderAdminInventory(); // Admin page
  } else {
    renderIndexInventory(); // Index page
  }
}

// =======================
// Admin Page Render
// =======================
function renderAdminInventory() {
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';
  let totalProfit = 0;

  items.forEach(item => {
    const soldQty = item.sold || 0;
    const itemProfit = (item.price - item.cost) * soldQty;
    totalProfit += itemProfit;

    tbody.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.price}</td>
        <td>${item.cost}</td>
        <td>${item.stock}</td>
        <td>${soldQty}</td>
        <td>${itemProfit}</td>
      </tr>
    `;
  });

  document.getElementById('profit').innerText = totalProfit;
}

// =======================
// Index Page Render
// =======================
function renderIndexInventory() {
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';

  items.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.price}</td>
        <td>${item.cost}</td>
        <td>${item.stock}</td>
      </tr>
    `;
  });
}

// =======================
// Add Item (Admin Only)
// =======================
window.addItem = async function() {
  const name = document.getElementById('name').value;
  const price = parseFloat(document.getElementById('price').value);
  const cost = parseFloat(document.getElementById('cost').value);
  const stock = parseInt(document.getElementById('stock').value);

  if (!name || isNaN(price) || isNaN(cost) || isNaN(stock)) {
    alert("Please fill all fields correctly!");
    return;
  }

  await addDoc(collection(db, "items"), { name, price, cost, stock, sold: 0 });
  loadItems();

  // Clear inputs
  document.getElementById('name').value = '';
  document.getElementById('price').value = '';
  document.getElementById('cost').value = '';
  document.getElementById('stock').value = '';
};

// =======================
// Remove Item (Admin Only)
// =======================
window.removeItem = async function() {
  const name = document.getElementById('removeName').value;
  const item = items.find(i => i.name === name);

  if (!item) {
    alert("Item not found!");
    return;
  }

  await deleteDoc(doc(db, "items", item.id));
  loadItems();
  document.getElementById('removeName').value = '';
};

// =======================
// Record Sale (Admin Only)
// =======================
window.sellItem = async function(itemName, quantity) {
  const item = items.find(i => i.name === itemName);
  quantity = parseInt(quantity);

  if (!item) return alert("Item not found!");
  if (quantity > item.stock) return alert("Not enough stock!");

  const itemRef = doc(db, "items", item.id);
  await updateDoc(itemRef, {
    stock: item.stock - quantity,
    sold: (item.sold || 0) + quantity
  });

  loadItems();

  const saleNameEl = document.getElementById('saleName');
  const saleQtyEl = document.getElementById('saleQty');
  if (saleNameEl) saleNameEl.value = '';
  if (saleQtyEl) saleQtyEl.value = '';
};

// =======================
// Admin Login
// =======================
window.login = function() {
  const pass = document.getElementById('password').value;
  if (pass === ADMIN_PASSWORD) {
    document.getElementById('adminContent').classList.remove('hidden');
    document.getElementById('loginPanel').classList.add('hidden');
    alert("Login successful");
  } else {
    alert("Wrong password");
  }
};

// =======================
// Inventory Search Filter (Index Page)
// =======================
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keyup', function() {
    const filter = this.value.toLowerCase();
    const tbody = document.querySelector('#inventoryTable tbody');
    Array.from(tbody.getElementsByTagName('tr')).forEach(row => {
      const name = row.cells[0].innerText.toLowerCase();
      row.style.display = name.includes(filter) ? '' : 'none';
    });
  });
}

// =======================
// Initialize
// =======================
loadItems();


