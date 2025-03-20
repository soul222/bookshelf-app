const STORAGE_KEY = "BOOKSHELF_APPS";
const RENDER_EVENT = "render-book";
const SAVED_EVENT = "saved-book";

// Default book covers
const SAMPLE_BOOK_COVERS = ["assets/img/default.png"];

// State
const state = {
  books: [],
  bookIdToDelete: null,
  currentSearchTerm: "", // Tambahkan state untuk menyimpan pencarian saat ini
};

// DOM Elements
const elements = {};

// Initialize app on DOM content loaded
document.addEventListener("DOMContentLoaded", initializeApp);

// Initialize application
function initializeApp() {
  // Cache DOM elements
  cacheElements();

  // Add styles
  addStyles();

  // Add file input for book covers
  addFileInputToForm();

  // Setup event listeners
  setupEventListeners();

  // Load books from storage
  if (isStorageAvailable()) {
    loadBooksFromStorage();
  }
}

// Cache DOM elements for better performance
function cacheElements() {
  elements.bookForm = document.getElementById("bookForm");
  elements.searchForm = document.getElementById("searchBook");
  elements.addBookModal = document.getElementById("addBookModal");
  elements.openModalBtn = document.getElementById("openAddBookModal");
  elements.closeModalBtn = document.querySelector(".close-modal");
  elements.quickSearchInput = document.getElementById("quickSearch");
  elements.quickSearchClear = document.querySelector(".search-clear");
  elements.deleteModal = document.getElementById("deleteBookModal");
  elements.closeDeleteModalBtn = document.querySelector(
    "#deleteBookModal .close-modal"
  );
  elements.incompleteBookList = document.getElementById("incompleteBookList");
  elements.completeBookList = document.getElementById("completeBookList");
  elements.searchBookTitle = document.getElementById("searchBookTitle");
  elements.confirmDeleteBtn = document.getElementById("confirmDelete");
  elements.cancelDeleteBtn = document.getElementById("cancelDelete");
  elements.refreshIcon = document.querySelector(".bi-arrow-clockwise");
}

// Add global styles
function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .rotating {
      animation: rotate 0.5s linear;
    }
    .icon-button.read-button {
      background-color: #4CAF50;
      color: white;
    }
    .icon-button.unread-button {
      background-color: var(--primary);
      color: var(--dark);
    }
    .icon-button.edit-button {
      background-color: var(--primary);
      color: var(--dark);  
    }
    .icon-button.delete-button {
      background-color: var(--danger);
      color: white;
    }
    .feedback-message.success {
      background-color: #4CAF50;
      color: white;
    }
    .file-input-container {
      margin-bottom: 15px;
    }
    .file-input-preview {
      width: 100%;
      height: 200px;
      border: 1px dashed var(--border-color);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 10px;
      overflow: hidden;
    }
    .file-input-preview img {
      max-width: 100%;
      max-height: 200px;
      object-fit: contain;
    }
  `;
  document.head.appendChild(style);
}

// Set up all event listeners
function setupEventListeners() {
  // Modal related events
  elements.openModalBtn.addEventListener("click", openAddBookModal);
  elements.closeModalBtn.addEventListener("click", closeAddBookModal);

  // Delete confirmation events
  elements.closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener("click", confirmDeleteBook);
  elements.cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  // Search functionality
  elements.quickSearchInput.addEventListener("input", handleQuickSearch);
  elements.quickSearchClear.addEventListener("click", clearSearch);
  elements.searchForm.addEventListener("submit", handleSearchSubmit);

  // Form events
  elements.bookForm.addEventListener("submit", handleBookFormSubmit);

  // Checkbox for book completion status
  document
    .getElementById("bookFormIsComplete")
    .addEventListener("change", updateSubmitButtonText);

  // Refresh button
  if (elements.refreshIcon) {
    elements.refreshIcon.parentElement.addEventListener(
      "click",
      refreshBookshelf
    );
  }

  // Close modals when clicking outside
  window.addEventListener("click", handleOutsideClick);

  // Listen for render events
  document.addEventListener(RENDER_EVENT, () => {
    // Render buku dengan mempertahankan filter pencarian
    const filteredBooks = filterBooksByTitle(state.currentSearchTerm);
    renderBooks(filteredBooks);
  });
}

// ------------- Event Handlers -------------

function openAddBookModal() {
  elements.addBookModal.style.display = "block";
  document.getElementById("bookFormTitle").focus();
}

function closeAddBookModal() {
  elements.addBookModal.style.display = "none";
  resetForm();
  elements.bookForm.removeAttribute("data-edit-id");
}

function closeDeleteModal() {
  elements.deleteModal.style.display = "none";
  state.bookIdToDelete = null;
}

function handleOutsideClick(event) {
  if (event.target === elements.addBookModal) {
    closeAddBookModal();
  }
  if (event.target === elements.deleteModal) {
    closeDeleteModal();
  }
}

function handleQuickSearch() {
  const searchTerm = this.value.toLowerCase().trim();
  state.currentSearchTerm = searchTerm; // Simpan search term di state
  toggleSearchClearButton(searchTerm.length > 0);

  const filteredBooks = filterBooksByTitle(searchTerm);
  renderBooks(filteredBooks);

  // Keep search inputs in sync
  elements.searchBookTitle.value = this.value;
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const searchTerm = elements.searchBookTitle.value.toLowerCase().trim();
  state.currentSearchTerm = searchTerm; // Simpan search term di state

  const filteredBooks = filterBooksByTitle(searchTerm);
  renderBooks(filteredBooks);

  // Keep quick search input in sync
  elements.quickSearchInput.value = searchTerm;
  toggleSearchClearButton(searchTerm.length > 0);
}

function clearSearch() {
  elements.quickSearchInput.value = "";
  elements.searchBookTitle.value = "";
  state.currentSearchTerm = ""; // Reset search term di state
  toggleSearchClearButton(false);
  renderBooks(state.books);
  elements.quickSearchInput.focus();
}

function toggleSearchClearButton(show) {
  elements.quickSearchClear.style.display = show ? "block" : "none";
}

function handleBookFormSubmit(event) {
  event.preventDefault();

  const editId = this.getAttribute("data-edit-id");
  if (editId) {
    updateBookFromForm(editId);
    showFeedbackMessage("Buku berhasil diperbarui", "success");
  } else {
    addBookFromForm();
    showFeedbackMessage("Buku berhasil ditambahkan", "success");
  }

  closeAddBookModal();
}

function confirmDeleteBook() {
  if (state.bookIdToDelete !== null) {
    const bookIndex = findBookIndex(state.bookIdToDelete);
    if (bookIndex !== -1) {
      state.books.splice(bookIndex, 1);
      document.dispatchEvent(new Event(RENDER_EVENT));
      saveBooksToStorage();
      showFeedbackMessage("Buku berhasil dihapus", "success");
    }
    closeDeleteModal();
  }
}

function refreshBookshelf() {
  const refreshIcon = this.querySelector("i");
  refreshIcon.classList.add("rotating");

  setTimeout(() => {
    refreshIcon.classList.remove("rotating");
    // Terapkan filter pencarian saat refresh
    const filteredBooks = filterBooksByTitle(state.currentSearchTerm);
    renderBooks(filteredBooks);
  }, 500);
}

function updateSubmitButtonText() {
  if (!elements.bookForm.hasAttribute("data-edit-id")) {
    const submitButton = document.getElementById("bookFormSubmit");
    const span =
      submitButton.querySelector("span") || document.createElement("span");
    span.innerText = this.checked ? "Selesai dibaca" : "Belum selesai dibaca";

    if (!submitButton.querySelector("span")) {
      submitButton.innerHTML = "Masukkan Buku ke rak ";
      submitButton.appendChild(span);
    }
  }
}

// ------------- BOOK -------------

function addBookFromForm() {
  const bookData = getBookDataFromForm();
  const id = generateId();

  const book = {
    id,
    ...bookData,
  };

  state.books.push(book);
  document.dispatchEvent(new Event(RENDER_EVENT));
  saveBooksToStorage();
}

function updateBookFromForm(id) {
  const bookData = getBookDataFromForm();
  const bookIndex = findBookIndex(id);

  if (bookIndex !== -1) {
    state.books[bookIndex] = {
      ...state.books[bookIndex],
      ...bookData,
    };

    document.dispatchEvent(new Event(RENDER_EVENT));
    saveBooksToStorage();
    elements.bookForm.removeAttribute("data-edit-id");
  }
}

function getBookDataFromForm() {
  return {
    title: document.getElementById("bookFormTitle").value,
    author: document.getElementById("bookFormAuthor").value,
    year: parseInt(document.getElementById("bookFormYear").value),
    isComplete: document.getElementById("bookFormIsComplete").checked,
    coverUrl: getBookCoverUrl(),
  };
}

function editBook(bookId) {
  const book = findBook(bookId);
  if (!book) return;

  // Fill form with book data
  document.getElementById("bookFormTitle").value = book.title;
  document.getElementById("bookFormAuthor").value = book.author;
  document.getElementById("bookFormYear").value = book.year;
  document.getElementById("bookFormIsComplete").checked = book.isComplete;

  // Update preview image
  updateCoverPreview(book.coverUrl);

  // Open modal in edit mode
  elements.addBookModal.style.display = "block";
  document.getElementById("bookFormTitle").focus();

  // Set form to edit mode
  elements.bookForm.setAttribute("data-edit-id", bookId);
  document.querySelector("#addBookModal h2").innerText = "Edit Buku";
  document.getElementById("bookFormSubmit").innerText = "Simpan Perubahan";
}

function showDeleteModal(bookId) {
  state.bookIdToDelete = bookId;
  const book = findBook(bookId);

  if (book) {
    document.getElementById("bookTitleToDelete").innerText = book.title;
    elements.deleteModal.style.display = "block";
  }
}

function toggleBookCompletion(bookId) {
  const book = findBook(bookId);
  if (!book) return;

  book.isComplete = !book.isComplete;
  document.dispatchEvent(new Event(RENDER_EVENT));
  saveBooksToStorage();

  const statusMessage = book.isComplete
    ? "Buku dipindahkan ke rak Selesai dibaca"
    : "Buku dipindahkan ke rak Belum selesai dibaca";
  showFeedbackMessage(statusMessage, "success");
}

// ------------- UI -------------

function addFileInputToForm() {
  // Create container elements
  const fileInputContainer = createElement("div", {
    class: "file-input-container",
  });
  const label = createElement("label", {
    for: "bookCoverInput",
    text: "Cover Buku",
  });
  const fileInput = createElement("input", {
    type: "file",
    id: "bookCoverInput",
    accept: "image/*",
    "data-testid": "bookFormCoverInput",
  });
  const previewContainer = createElement("div", {
    class: "file-input-preview",
    id: "coverPreview",
  });

  // Create preview image and placeholder
  const previewImg = createElement("img", { style: "display: none" });
  const placeholderText = createElement("span", { text: "Preview cover buku" });

  // Add DOM structure
  previewContainer.append(previewImg, placeholderText);
  fileInputContainer.append(label, fileInput, previewContainer);

  // Add event listener for file selection
  fileInput.addEventListener("change", handleFileInputChange);

  // Insert into the form
  const checkboxContainer = document.querySelector(
    'label[for="bookFormIsComplete"]'
  ).parentElement;
  checkboxContainer.parentNode.insertBefore(
    fileInputContainer,
    checkboxContainer
  );
}

function handleFileInputChange(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => updateCoverPreview(e.target.result);
    reader.readAsDataURL(file);
  } else {
    resetCoverPreview();
  }
}

function updateCoverPreview(imageUrl) {
  if (!imageUrl) {
    resetCoverPreview();
    return;
  }

  const previewImg = document.querySelector("#coverPreview img");
  const placeholderText = document.querySelector("#coverPreview span");

  previewImg.src = imageUrl;
  previewImg.style.display = "block";
  placeholderText.style.display = "none";
}

function resetCoverPreview() {
  const previewImg = document.querySelector("#coverPreview img");
  const placeholderText = document.querySelector("#coverPreview span");

  previewImg.style.display = "none";
  placeholderText.style.display = "block";
}

function resetForm() {
  elements.bookForm.reset();
  document.querySelector("#addBookModal h2").innerText = "Tambah Buku Baru";
  document.getElementById("bookFormSubmit").innerHTML =
    "Masukkan Buku ke rak <span>Belum selesai dibaca</span>";
  resetCoverPreview();
}

function renderBooks(booksToRender) {
  elements.incompleteBookList.innerHTML = "";
  elements.completeBookList.innerHTML = "";

  booksToRender.forEach((book) => {
    const bookElement = createBookElement(book);
    if (book.isComplete) {
      elements.completeBookList.appendChild(bookElement);
    } else {
      elements.incompleteBookList.appendChild(bookElement);
    }
  });
}

function createBookElement(book) {
  // Create book item container
  const bookItem = createElement("div", {
    class: "book-item",
    "data-bookid": book.id,
    "data-testid": "bookItem",
  });

  // Create book content
  const bookContent = createElement("div", { class: "book-content" });

  // Create cover container and image
  const coverContainer = createElement("div", { class: "book-cover" });
  const coverImg = createElement("img", {
    src: book.coverUrl || getRandomBookCover(),
    alt: `Cover buku ${book.title}`,
  });
  coverContainer.appendChild(coverImg);

  // Create book info section
  const bookInfo = createElement("div", { class: "book-info" });
  const title = createElement("h3", {
    "data-testid": "bookItemTitle",
    text: book.title,
  });
  const author = createElement("p", {
    "data-testid": "bookItemAuthor",
    text: `Penulis: ${book.author}`,
  });
  const year = createElement("p", {
    "data-testid": "bookItemYear",
    text: `Tahun: ${book.year}`,
  });

  bookInfo.append(title, author, year);
  bookContent.append(coverContainer, bookInfo);

  // Create action buttons
  const buttonContainer = createElement("div", { class: "book-actions" });

  // Toggle completion button
  const toggleButtonClass = book.isComplete ? "read-button" : "unread-button";
  const toggleButtonIcon = book.isComplete
    ? "bi-bookmark"
    : "bi-bookmark-check";
  const toggleButtonTitle = book.isComplete
    ? "Belum selesai dibaca"
    : "Selesai dibaca";

  const toggleButton = createElement("button", {
    class: `icon-button ${toggleButtonClass}`,
    "data-testid": "bookItemIsCompleteButton",
    title: toggleButtonTitle,
    html: `<i class="bi ${toggleButtonIcon}"></i>`,
  });
  toggleButton.addEventListener("click", () => toggleBookCompletion(book.id));

  // Edit button
  const editButton = createElement("button", {
    class: "icon-button edit-button",
    "data-testid": "bookItemEditButton",
    title: "Edit Buku",
    html: '<i class="bi bi-pencil"></i>',
  });
  editButton.addEventListener("click", () => editBook(book.id));

  // Delete button
  const deleteButton = createElement("button", {
    class: "icon-button delete-button",
    "data-testid": "bookItemDeleteButton",
    title: "Hapus Buku",
    html: '<i class="bi bi-trash"></i>',
  });
  deleteButton.addEventListener("click", () => showDeleteModal(book.id));

  buttonContainer.append(toggleButton, editButton, deleteButton);
  bookItem.append(bookContent, buttonContainer);

  return bookItem;
}

function showFeedbackMessage(message, type = "") {
  const feedbackElement = createElement("div", {
    class: `feedback-message ${type}`,
    text: message,
  });

  document.body.appendChild(feedbackElement);

  setTimeout(() => {
    if (feedbackElement && feedbackElement.parentNode) {
      feedbackElement.parentNode.removeChild(feedbackElement);
    }
  }, 3000);
}

// ------------- Storage -------------

function isStorageAvailable() {
  if (typeof Storage === "undefined") {
    alert("Browser kamu tidak mendukung local storage");
    return false;
  }
  return true;
}

function saveBooksToStorage() {
  if (!isStorageAvailable()) return;

  const booksToSave = state.books.map((book) => {
    // If coverUrl is a blob URL from createObjectURL, we need to use the default
    if (book.coverUrl && book.coverUrl.startsWith("blob:")) {
      return {
        ...book,
        coverUrl: getRandomBookCover(),
      };
    }
    return { ...book };
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(booksToSave));
    document.dispatchEvent(new Event(SAVED_EVENT));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

function loadBooksFromStorage() {
  try {
    const serializedData = localStorage.getItem(STORAGE_KEY);
    if (!serializedData) return;

    const loadedBooks = JSON.parse(serializedData);
    state.books = loadedBooks.map((book) => ({
      ...book,
      coverUrl: book.coverUrl || getRandomBookCover(),
    }));

    document.dispatchEvent(new Event(RENDER_EVENT));
  } catch (error) {
    console.error("Error loading from localStorage:", error);
  }
}

// ------------- utils -------------

function createElement(tag, attributes = {}) {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "text" && value !== undefined) {
      element.textContent = value;
    } else if (key === "html" && value !== undefined) {
      element.innerHTML = value;
    } else if (value !== undefined) {
      element.setAttribute(key, value);
    }
  });

  return element;
}

function filterBooksByTitle(searchTerm) {
  if (!searchTerm) return state.books;

  return state.books.filter((book) =>
    book.title.toLowerCase().includes(searchTerm)
  );
}

function getBookCoverUrl() {
  const fileInput = document.getElementById("bookCoverInput");
  const editId = elements.bookForm.getAttribute("data-edit-id");

  if (fileInput.files && fileInput.files[0]) {
    return URL.createObjectURL(fileInput.files[0]);
  } else if (editId) {
    const existingBook = findBook(parseInt(editId));
    if (existingBook?.coverUrl) {
      return existingBook.coverUrl;
    }
  }

  return getRandomBookCover();
}

function getRandomBookCover() {
  const randomIndex = Math.floor(Math.random() * SAMPLE_BOOK_COVERS.length);
  return SAMPLE_BOOK_COVERS[randomIndex];
}

function generateId() {
  return +new Date();
}

function findBook(bookId) {
  return state.books.find((book) => book.id === parseInt(bookId));
}

function findBookIndex(bookId) {
  return state.books.findIndex((book) => book.id === parseInt(bookId));
}