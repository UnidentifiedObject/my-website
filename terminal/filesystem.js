const vfs = {
  '/': {
    type: 'folder',
    children: {
      'readme.txt': { type: 'file', content: 'Welcome to ARM-23 virtual terminal!' },
      'docs': { type: 'folder', children: {} }
    }
  }
};

// Global state variables used by the filesystem commands
let currentPath = '/';
let editMode = false;
let editFile = null; // Pointer to the file object currently being edited

/**
 * Helper: Gets a folder/file object from the VFS by its absolute path.
 * @param {string} path - The absolute path to resolve.
 * @returns {object | null} The VFS node object, or null if not found.
 */
function getPathObject(path) {
  if (path === '/') return vfs['/'];
  const parts = path.split('/').filter(p => p);
  let current = vfs['/'];
  for (let part of parts) {
    // Check if the current node is a folder and if the child exists
    if (current.type !== 'folder' || !current.children[part]) return null;
    current = current.children[part];
  }
  return current;
}

/**
 * Resolves a relative or absolute input path into a clean, absolute VFS path.
 * @param {string} inputPath - The user's input path.
 * @returns {string} The resolved absolute path.
 */
function resolvePath(inputPath) {
  if (inputPath.startsWith('/')) return inputPath; // absolute path

  const parts = currentPath.split('/').filter(p => p);
  const inputParts = inputPath.split('/').filter(p => p);

  inputParts.forEach(p => {
    if (p === '..') parts.pop(); // Go up one level
    else if (p !== '.') parts.push(p); // Ignore current directory marker
  });

  // Reconstruct the path, ensuring root is "/"
  return '/' + parts.join('/');
}

// --- Filesystem Command Implementations ---

/** Lists contents of the current directory. */
function fs_ls() {
    const folder = getPathObject(currentPath);
    if (!folder || folder.type !== 'folder') return 'Error: Not a directory';
    
    let output = [];
    const names = Object.keys(folder.children).sort();
    
    for (const name of names) {
        const item = folder.children[name];
        // Note: The main application logic must determine if a file is a 'script' 
        // for visual display (e.g., checking content or type).
        const type = item.type === 'folder' ? '[DIR]' : '[FILE]'; 
        output.push(`${type.padEnd(5)} ${name}`);
    }
    // Returns a string separated by newlines
    return output.join('\n') || '(empty)'; 
}

/** Changes the current working directory. */
function fs_cd(folderName) {
  if (!folderName) return 'Error: Specify folder';

  if (folderName === '...') {
    // Go one directory up (user's custom alias for '..')
    if (currentPath !== '/') {
      const parts = currentPath.split('/').filter(p => p);
      parts.pop();
      currentPath = '/' + parts.join('/');
      if (currentPath === '') currentPath = '/';
    }
    return '';
  }

  const path = resolvePath(folderName);
  const folder = getPathObject(path);
  if (!folder) return `Error: Folder "${folderName}" does not exist`;
  if (folder.type !== 'folder') return `Error: "${folderName}" is not a folder`;
  currentPath = path;
  return '';
}

/** Creates a new directory. */
function fs_mkdir(folderName) {
  if (!folderName) return 'Error: Specify folder name';
  const path = resolvePath(folderName);
  const parts = path.split('/').filter(p => p);
  const newFolderName = parts.pop();
  const parentPath = '/' + parts.join('/');
  const parent = getPathObject(parentPath);
  if (!parent || parent.type !== 'folder') return 'Error: Invalid path';
  if (parent.children[newFolderName]) return 'Error: File or folder already exists';
  parent.children[newFolderName] = { type: 'folder', children: {} };
  return `Folder "${newFolderName}" created`;
}

/** Creates an empty file. */
function fs_touch(fileName) {
  if (!fileName) return 'Error: Specify file name';
  const path = resolvePath(fileName);
  const parts = path.split('/').filter(p => p);
  const newFileName = parts.pop();
  const parentPath = '/' + parts.join('/');
  const parent = getPathObject(parentPath);
  if (!parent || parent.type !== 'folder') return 'Error: Invalid path';
  if (parent.children[newFileName]) return 'Error: File or folder already exists';
  parent.children[newFileName] = { type: 'file', content: '' };
  return `File "${newFileName}" created`;
}

/** Displays the content of a file. */
function fs_cat(fileName) {
  if (!fileName) return 'Error: Specify file';
  const path = resolvePath(fileName);
  const file = getPathObject(path);
  if (!file) return `Error: File "${fileName}" does not exist`;
  if (file.type !== 'file') return `Error: "${fileName}" is not a file`;
  return file.content || '(empty)';
}

/** Removes a file or folder. */
function fs_rm(name) {
  if (!name) return 'Error: Specify file or folder';
  const path = resolvePath(name);
  const parts = path.split('/').filter(p => p);
  const itemName = parts.pop();
  const parentPath = '/' + parts.join('/');
  const parent = getPathObject(parentPath);
  if (!parent || !parent.children[itemName]) return `Error: "${name}" does not exist`;
  
  const item = parent.children[itemName];
  // Simple check: prevent removing a non-empty folder (though this should be expanded)
  if (item.type === 'folder' && Object.keys(item.children).length > 0) {
        return `Error: Folder "${itemName}" is not empty.`;
  }
  
  delete parent.children[itemName];
  return `"${itemName}" removed`;
}

/** Prepares the system to enter editor mode for a file. */
function fs_edit(fileName) {
  if (!fileName) return 'Error: Specify file';
  const path = resolvePath(fileName);
  const file = getPathObject(path);
  if (!file || file.type !== 'file') return `Error: File "${fileName}" not found`;
  
  editMode = true;
  editFile = file;
  
  return `Editing "${fileName}". Type a single "." on a line to finish.`;
}

// Expose the command functions for the main script to call
const filesystemCommands = {
  ls: fs_ls,
  cd: fs_cd,
  mkdir: fs_mkdir,
  touch: fs_touch,
  cat: fs_cat,
  rm: fs_rm,
  edit: fs_edit
};