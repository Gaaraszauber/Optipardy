import { loadCategoriesTree } from './categories.js';
import { addSelectedCategory, removeSelectedCategory, renderSelectedCategories, getSelectedCategories } from './categories.js';

let tempSelected = new Set();

export function setupPopup() {
  const modal = document.getElementById('folderModal');
  const treeContainer = document.getElementById('folderTree');
  const closeBtn = document.querySelector('#folderModal .close');
  const openBtn = document.getElementById('folderSelectorBtn');
  const saveBtn = document.getElementById('popupSaveBtn');

  openBtn.addEventListener('click', async () => {
    treeContainer.innerHTML = '';
    tempSelected = new Set(getSelectedCategories().map(cat => cat.name));
    const categories = await loadCategoriesTree();
    renderFolderTree(categories, treeContainer);
    modal.classList.add('show');
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });

  // Speichern-Button-Handler
  saveBtn.onclick = () => {
    // Erst alle raus, dann alle rein (damit abgewählte auch entfernt werden)
    getSelectedCategories().forEach(cat => removeSelectedCategory(cat.name));
    treeContainer.querySelectorAll('.category-node.selected').forEach(node => {
      const catObj = JSON.parse(node.dataset.cat);
      addSelectedCategory(catObj);
    });
    renderSelectedCategories();
    modal.classList.remove('show');
  };
}

function renderFolderTree(data, parentElement, depth = 0) {
  parentElement.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'category-tree';
  data.forEach(item => {
    if (item.type === 'folder') {
      const li = document.createElement('li');
      li.className = 'folder-node folder-collapsed';
      li.innerHTML = `
        <div class="folder-header" style="padding-left:${depth * 16}px">
          <span class="folder-toggle">▶</span>
          <span class="folder-name">${item.name}</span>
        </div>
      `;
      const childrenUl = document.createElement('ul');
      childrenUl.className = 'folder-children collapsed';
      li.appendChild(childrenUl);
      li.querySelector('.folder-header').addEventListener('click', () => {
        const collapsed = childrenUl.classList.toggle('collapsed');
        li.classList.toggle('folder-collapsed', collapsed);
        li.classList.toggle('folder-expanded', !collapsed);
        li.querySelector('.folder-toggle').textContent = collapsed ? '▶' : '▼';
        if (!collapsed && childrenUl.children.length === 0 && item.children) {
          renderFolderTree(item.children, childrenUl, depth + 1);
        }
      });
      ul.appendChild(li);
    } else if (item.type === 'file') {
      const li = document.createElement('li');
      li.className = 'category-node file-node';
      li.dataset.cat = JSON.stringify(item);
      const selected = tempSelected.has(item.name);
      if (selected) li.classList.add('selected');
      li.innerHTML = `
        <span class="category-name">${item.name}</span>
      `;
      li.addEventListener('click', () => {
        if (li.classList.contains('selected')) {
          li.classList.remove('selected');
          tempSelected.delete(item.name);
        } else {
          li.classList.add('selected');
          tempSelected.add(item.name);
        }
      });
      ul.appendChild(li);
    }
  });
  parentElement.appendChild(ul);
}
