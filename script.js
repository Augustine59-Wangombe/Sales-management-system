

// =======================
// Firebase Imports
// =======================
import { db } from './firebase.js';
import {
  collection, addDoc, getDocs, doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =======================
// Admin Password
// =======================
const ADMIN_PASSWORD = "admin123";

// =======================
// Data
// =======================
let items = [];
let sales = [];

// =======================
// Load Items
// =======================
async function loadItems() {
  try {
    const querySnapshot = await getDocs(collection(db, "items"));
    items = [];
    querySnapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));

    if (document.getElementById('profit')) {
      await loadSales();
      setDateTime();
      renderAdminInventory();
      setupSaleAutoFill();
    } else {
      renderIndexInventory();
    }
  } catch (error) {
    console.error("Load Items Error:", error);
  }
}

// =======================
// Load Sales
// =======================
async function loadSales() {
  try {
    const querySnapshot = await getDocs(collection(db, "sales"));
    sales = [];
    querySnapshot.forEach(docSnap => sales.push({ id: docSnap.id, ...docSnap.data() }));
    renderSalesHistory();
  } catch (error) {
    console.error("Load Sales Error:", error);
  }
}

// =======================
// Render Index Inventory
// =======================
function renderIndexInventory() {
  const tbody = document.querySelector('#inventoryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  items.forEach(item => {
    const imageHtml = item.imageUrl
      ? `<img src="${item.imageUrl}" style="width:100px;height:100px;border-radius:6px;">`
      : 'No Image';

    tbody.innerHTML += `
      <tr>
        <td data-label="Image">${imageHtml}</td>
        <td data-label="Name">${item.name}</td>
        <td data-label="Price">${item.price}</td>
        <td data-label="Stock">${item.stock}</td>
      </tr>`;
  });
}

// =======================
// Render Admin Inventory
// =======================
function renderAdminInventory() {
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';
  let totalProfit = 0;

  items.forEach(item => {
    const soldQty = item.sold || 0;
    const itemSales = sales.filter(s => s.itemName === item.name);
    const itemProfit = itemSales.reduce((sum, s) => sum + (s.salePrice - item.cost) * s.quantity, 0);
    totalProfit += itemProfit;

    const imageHtml = item.imageUrl
      ? `<img src="${item.imageUrl}" style="width:100px;height:100px;border-radius:6px;">`
      : 'No Image';

    tbody.innerHTML += `
      <tr>
        <td data-label="Image">${imageHtml}</td>
        <td data-label="Name">${item.name}</td>
        <td data-label="Price">${item.price}</td>
        <td data-label="Cost">${item.cost}</td>
        <td data-label="Stock">${item.stock}</td>
        <td data-label="Sold">${soldQty}</td>
        <td data-label="Profit">${itemProfit.toLocaleString()}</td>
      </tr>`;
  });

  document.getElementById('profit').innerText = "KES " + totalProfit.toLocaleString();

  const datalist = document.getElementById('itemList');
  datalist.innerHTML = '';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.name;
    datalist.appendChild(option);
  });
}

// =======================
// Add Item with Cloudinary
// =======================
window.addItem = async function () {
  try {
    const name = document.getElementById('name').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const cost = parseFloat(document.getElementById('cost').value);
    const stock = parseInt(document.getElementById('stock').value);
    const imageFile = document.getElementById('image').files[0];

    if (!name || isNaN(price) || isNaN(cost) || isNaN(stock)) {
      alert("Please fill all fields correctly!");
      return;
    }

    let imageUrl = '';
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "Sales-Items");
      formData.append("folder", "assent");

      const response = await fetch("https://api.cloudinary.com/v1_1/dalugau16/upload", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      imageUrl = data.secure_url;
    }

    await addDoc(collection(db, "items"), { name, price, cost, stock, sold: 0, imageUrl });
    alert("Item added successfully!");
    await loadItems();

    document.getElementById('name').value = '';
    document.getElementById('price').value = '';
    document.getElementById('cost').value = '';
    document.getElementById('stock').value = '';
    document.getElementById('image').value = '';

  } catch (error) {
    console.error("Add Item Error:", error);
    alert("Error adding item: " + error.message);
  }
};

// =======================
// Remove Item
// =======================
window.removeItem = async function () {
  try {
    const name = document.getElementById('removeName').value.trim();
    const item = items.find(i => i.name === name);
    if (!item) return alert("Item not found!");
    await deleteDoc(doc(db, "items", item.id));
    alert("Item removed successfully!");
    await loadItems();
    document.getElementById('removeName').value = '';
  } catch (error) {
    console.error("Remove Error:", error);
  }
};

// =======================
// Record Sale
// =======================
window.sellItem = async function () {
  try {
    const itemName = document.getElementById('saleName').value.trim();
    const quantity = parseInt(document.getElementById('saleQty').value);
    const salePrice = parseFloat(document.getElementById('salePrice').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const date = document.getElementById('saleDate').value;
    const time = document.getElementById('saleTime').value;

    const item = items.find(i => i.name === itemName);
    if (!item) return alert("Item not found!");
    if (quantity > item.stock) return alert("Not enough stock!");
    if (isNaN(salePrice) || salePrice <= 0) return alert("Invalid selling price!");

    const total = salePrice * quantity;

    await addDoc(collection(db, "sales"), { itemName, quantity, salePrice, total, paymentMethod, date, time, timestamp: new Date() });
    await updateDoc(doc(db, "items", item.id), { stock: item.stock - quantity, sold: (item.sold || 0) + quantity });

    alert("Sale recorded successfully!");
    await loadItems();

    document.getElementById('saleName').value = '';
    document.getElementById('saleQty').value = '';
    document.getElementById('salePrice').value = '';
    setDateTime();

  } catch (error) {
    console.error("Sale Error:", error);
    alert("Error recording sale: " + error.message);
  }
};

// =======================
// Delete Sale History
// =======================
window.deleteSale = async function (saleId) {
  try {
    if (!confirm('Delete this sale history entry?')) return;
    await deleteDoc(doc(db, "sales", saleId));
    alert('Sale history entry deleted successfully.');
    await loadItems();
  } catch (error) {
    console.error('Delete Sale Error:', error);
    alert('Error deleting sale history: ' + error.message);
  }
};

// =======================
// Admin Login
// =======================
window.login = function () {
  const pass = document.getElementById('password').value;
  if (pass === ADMIN_PASSWORD) {
    document.getElementById('adminContent').classList.remove('hidden');
    document.getElementById('loginPanel').classList.add('hidden');
    loadItems();
    alert("Login successful");
  } else alert("Wrong password");
};

window.togglePassword = function () {
  const passwordInput = document.getElementById('password');
  if (!passwordInput) return;
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
};

// =======================
// Filter Sales
// =======================
window.filterSales = function () {
  const selectedDate = document.getElementById('historyDate').value;
  const filtered = selectedDate ? sales.filter(s => s.date === selectedDate) : sales;
  renderSalesHistory(filtered);
};

// =======================
// Render Sales
// =======================
function renderSalesHistory(filteredSales = sales) {
  const tbody = document.querySelector('#salesTable tbody');
  tbody.innerHTML = '';
  filteredSales.forEach(sale => {
    tbody.innerHTML += `
      <tr>
        <td data-label="Date">${sale.date}</td>
        <td data-label="Time">${sale.time}</td>
        <td data-label="Item">${sale.itemName}</td>
        <td data-label="Quantity">${sale.quantity}</td>
        <td data-label="Price">${sale.salePrice}</td>
        <td data-label="Total">${sale.total}</td>
        <td data-label="Payment">${sale.paymentMethod}</td>
        <td data-label="Action"><button class="delete-btn" onclick="deleteSale('${sale.id}')">Delete</button></td>
      </tr>`;
  });
}

// =======================
// Auto-fill Sale Price
// =======================
function setupSaleAutoFill() {
  const saleInput = document.getElementById('saleName');
  if (!saleInput) return;
  saleInput.addEventListener('input', function () {
    const item = items.find(i => i.name === this.value);
    if (item) document.getElementById('salePrice').value = item.price;
  });
}

// =======================
// Search Filter
// =======================
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keyup', function () {
    const filter = this.value.toLowerCase();
    document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
      row.style.display = row.cells[1].innerText.toLowerCase().includes(filter) ? '' : 'none';
    });
  });
}

// =======================
// Set Date & Time
// =======================
function setDateTime() {
  const saleDate = document.getElementById('saleDate');
  const saleTime = document.getElementById('saleTime');
  if (saleDate && saleTime) {
    const now = new Date();
    saleDate.value = now.toISOString().split('T')[0];
    saleTime.value = now.toTimeString().substring(0, 5);
  }
}

// =======================
// Page Navigation
// =======================
window.showPage = function (pageId, button) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.style.display = 'none';
  });

  // Remove active class from all buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected page
  const page = document.getElementById(pageId);
  if (page) {
    page.style.display = 'block';
  }

  // Add active class to clicked button
  if (button) {
    button.classList.add('active');
  }
};

// =======================
// Initialize
// =======================
loadItems();
