
// =======================
// Firebase Firestore Functions
// =======================
import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// =======================
// Admin Password
// =======================
const ADMIN_PASSWORD = "admin123"; // Change as needed

// =======================
// Inventory Data
// =======================
let items = [];
let sales = [];

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
    loadSales(); // Load sales for admin
    // Set current date and time for sale form
    const now = new Date();
    document.getElementById('saleDate').value = now.toISOString().split('T')[0];
    document.getElementById('saleTime').value = now.toTimeString().split(' ')[0].substring(0,5);
    renderAdminInventory(); // Admin page

    // Auto-fill sale price when item selected
    document.getElementById('saleName').addEventListener('input', function() {
      const item = items.find(i => i.name === this.value);
      if (item) {
        document.getElementById('salePrice').value = item.price;
      }
    });
  } else {
    renderIndexInventory(); // Index page
  }
}

// =======================
// Load Sales
// =======================
async function loadSales() {
  const querySnapshot = await getDocs(collection(db, "sales"));
  sales = [];
  querySnapshot.forEach(docSnap => {
    sales.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderSalesHistory();
}

// =======================
// Render Sales History
// =======================
function renderSalesHistory(filteredSales = sales) {
  const tbody = document.querySelector('#salesTable tbody');
  tbody.innerHTML = '';

  filteredSales.forEach(sale => {
    tbody.innerHTML += `
      <tr>
        <td>${sale.date}</td>
        <td>${sale.time}</td>
        <td>${sale.itemName}</td>
        <td>${sale.quantity}</td>
        <td>${sale.salePrice}</td>
        <td>${sale.total}</td>
        <td>${sale.paymentMethod}</td>
      </tr>
    `;
  });
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
    // Calculate actual profit from sales
    const itemSales = sales.filter(s => s.itemName === item.name);
    const itemProfit = itemSales.reduce((sum, s) => sum + (s.salePrice - item.cost) * s.quantity, 0);
    totalProfit += itemProfit;

    const imageHtml = item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px;">` : 'No Image';

    tbody.innerHTML += `
      <tr>
        <td>${imageHtml}</td>
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

  // Populate item datalist
  const datalist = document.getElementById('itemList');
  datalist.innerHTML = '';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.name;
    datalist.appendChild(option);
  });
}

// =======================
// Index Page Render
// =======================
function renderIndexInventory() {
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';

  items.forEach(item => {
    const imageHtml = item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px;">` : 'No Image';

    tbody.innerHTML += `
      <tr>
        <td>${imageHtml}</td>
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
  const imageFile = document.getElementById('image').files[0];

  if (!name || isNaN(price) || isNaN(cost) || isNaN(stock)) {
    alert("Please fill all fields correctly!");
    return;
  }

  let imageUrl = '';
  if (imageFile) {
    const storageRef = ref(storage, `items/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  await addDoc(collection(db, "items"), { name, price, cost, stock, sold: 0, imageUrl });
  loadItems();

  // Clear inputs
  document.getElementById('name').value = '';
  document.getElementById('price').value = '';
  document.getElementById('cost').value = '';
  document.getElementById('stock').value = '';
  document.getElementById('image').value = '';
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
window.sellItem = async function() {
  const itemName = document.getElementById('saleName').value;
  const quantity = parseInt(document.getElementById('saleQty').value);
  const salePrice = parseFloat(document.getElementById('salePrice').value);
  const paymentMethod = document.getElementById('paymentMethod').value;
  const date = document.getElementById('saleDate').value;
  const time = document.getElementById('saleTime').value;

  const item = items.find(i => i.name === itemName);

  if (!item) return alert("Item not found!");
  if (quantity > item.stock) return alert("Not enough stock!");
  if (isNaN(salePrice) || salePrice <= 0) return alert("Invalid selling price!");
  if (!date || !time) return alert("Please select date and time!");

  const total = salePrice * quantity;

  // Record the sale
  await addDoc(collection(db, "sales"), {
    itemName,
    quantity,
    salePrice,
    total,
    paymentMethod,
    date,
    time,
    timestamp: new Date()
  });

  // Update item stock and sold
  const itemRef = doc(db, "items", item.id);
  await updateDoc(itemRef, {
    stock: item.stock - quantity,
    sold: (item.sold || 0) + quantity
  });

  loadItems();
  loadSales();

  // Clear inputs
  document.getElementById('saleName').value = '';
  document.getElementById('saleQty').value = '';
  document.getElementById('salePrice').value = '';
  document.getElementById('saleDate').value = '';
  document.getElementById('saleTime').value = '';
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
// Filter Sales by Date
// =======================
window.filterSales = function() {
  const selectedDate = document.getElementById('historyDate').value;
  if (!selectedDate) {
    renderSalesHistory(); // Show all if no date selected
    return;
  }
  const filtered = sales.filter(sale => sale.date === selectedDate);
  renderSalesHistory(filtered);
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
      const name = row.cells[1].innerText.toLowerCase();
      row.style.display = name.includes(filter) ? '' : 'none';
    });
  });
}

// =======================
// Initialize
// =======================
loadItems();


