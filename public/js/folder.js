// folder.js
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('folderModal');
  const treeContainer = document.getElementById('folderTree');
  const closeBtn = document.querySelector('#folderModal .close');

  document.getElementById('folderSelectorBtn').addEventListener('click', async () => {
    const categories = await loadFolderStructure();
    renderCategoryTree(categories, treeContainer);
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  async function loadFolderStructure() {
    try {
      const response = await fetch('/api/categories');
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Laden der Ordnerstruktur:', error);
      return [];
    }
  }

  function renderCategoryTree(items, parent, depth = 0) {
    parent.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'category-tree';
    items.forEach(item => {
      if (item.type === 'folder') {
        const li = document.createElement('li');
        li.className = 'folder-node folder-collapsed';
        li.innerHTML = `
          <div class="folder-header" style="padding-left:${depth * 18}px">
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
          if (!collapsed && childrenUl.children.length === 0) {
            renderCategoryTree(item.children, childrenUl, depth + 1);
          }
        });
        ul.appendChild(li);
      } else if (item.type === 'file') {
        const li = document.createElement('li');
        li.className = 'category-node file-node';
        li.innerHTML = `
          <span class="category-name">${item.name}</span>
          <button class="select-category-btn" data-category='${JSON.stringify(item)}'>Auswählen</button>
        `;
        ul.appendChild(li);
      }
    });
    parent.appendChild(ul);

    // Kategorieauswahl-Handler
    parent.querySelectorAll('.select-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = JSON.parse(e.target.dataset.category);
        window.addToDragDropPool(category);
        modal.style.display = 'none';
      });
    });
  }
});


// In renderFolderTree():
btn.addEventListener('click', (e) => {
  const category = JSON.parse(e.target.dataset.category);
  window.addToSelectedCategories(category); // Direkter Aufruf
  modal.style.display = 'none';
});
