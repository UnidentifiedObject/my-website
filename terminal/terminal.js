// --- SCRIPT MODE GLOBAL VARIABLES ---
let scriptMode = false; // false: off, 'collecting': input mode, 'naming': saving mode
let currentScriptLines = []; // Array to store commands during script creation
// --- END SCRIPT MODE GLOBALS ---

const terminal = document.getElementById('terminal');
const terminalLines = document.getElementById('terminalLines');
const inputLine = document.getElementById('inputLine');
const cursor = document.getElementById('cursor');
let inputText = '';
const MAX_INPUT_LENGTH = 800;

// Current virtual directory
let currentPath = '/';

// Commands help 
const commands = {
  help: `Available commands:
- help : show this message
- clear : clear the screen
- echo <text> : repeat your message
- whoami : display your username
- date : show current date and time
- autocode : enter autocode mode (type actual code automatically)
- hello : show "Hello World" in multiple languages
- loading : show retro loading screen
- guess : start a number guessing game (1-100)
- reverse <text> : reverse a string
- colorcycle : cycle text colors until Escape pressed
- exit : simulate terminal shutdown
- ls : list current directory contents
- cd <folder> : change directory (use "..." to go back)
- mkdir <folder> : create folder
- touch <file> : create file
- cat <file> : show file content
- rm <file/folder> : remove file or folder
- edit <file> : edit a file in-memory
- script : enter script creation mode
- script run <file> : execute a saved script file`
};

// Autocode
let autocodeMode = false;
let codeIndex = 0;
const longCode = `MOV AX, BX
ADD AX, 1
CMP AX, 10
JMP START
LOAD R1, 0xFF
CALL Subroutine
PRINT "HELLO WORLD"
NOP
END
`;

// Colorcycle
let colorcycleMode = false;
let colorInterval = null;
let currentHue = 0; 
const BASE_COLOR = '#0f0'; 


// Guessing Game Variables
let guessMode = false;
let targetNumber = 0;
let guessCount = 0;

// Edit mode
let editMode = false;
let editFile = null;



// Virtual Filesystem (Using your provided placeholder)
const filesystem = {
  '/': { type: 'folder', contents: {
    'readme.txt': { type: 'file', content: 'Welcome to the terminal simulation.' },
    'docs': { type: 'folder', contents: {} }
  }}
};
let currentDir = filesystem['/'];

/**
 * Utility to find a directory object based on path string.
 */
function findDir(path) {
    let parts = path.split('/').filter(p => p.length > 0);
    let dir = filesystem['/'];
    for (const part of parts) {
        if (dir.contents[part] && dir.contents[part].type === 'folder') {
            dir = dir.contents[part];
        } else {
            return null; // Path part not a folder
        }
    }
    return dir;
}

const filesystemCommands = {
    ls: () => {
        return Object.keys(currentDir.contents).map(name => {
            const item = currentDir.contents[name];
            return item.type === 'folder' ? `[DIR] ${name}` : name;
        }).join('\n');
    },
    cd: (path) => {
        if (path === '..' || path === '...') {
            if (currentPath === '/') return 'Already at root.';
            const newPathParts = currentPath.split('/').filter(p => p.length > 0).slice(0, -1);
            currentPath = '/' + newPathParts.join('/');
            if (currentPath === '') currentPath = '/';
            currentDir = findDir(currentPath); 
            return;
        }
        const target = currentDir.contents[path];
        if (target && target.type === 'folder') {
            currentPath += (currentPath === '/' ? '' : '/') + path;
            currentDir = target;
            return;
        }
        return `cd: no such directory: ${path}`;
    },
    mkdir: (name) => {
        if (!name) return 'mkdir: missing operand';
        if (currentDir.contents[name]) return `mkdir: cannot create directory '${name}': File exists`;
        currentDir.contents[name] = { type: 'folder', contents: {} };
        return `Directory '${name}' created.`;
    },
    touch: (name) => {
        if (!name) return 'touch: missing file operand';
        if (currentDir.contents[name] && currentDir.contents[name].type === 'folder') return `touch: cannot create file '${name}': Is a directory`;
        if (!currentDir.contents[name]) {
            currentDir.contents[name] = { type: 'file', content: '' };
        }
        return `File '${name}' touched.`;
    },
    cat: (name) => {
        const file = currentDir.contents[name];
        if (!file) return `cat: ${name}: No such file or directory`;
        if (file.type === 'folder') return `cat: ${name}: Is a directory`;
        return file.content || '';
    },
    rm: (name) => {
        if (!name) return 'rm: missing operand';
        const item = currentDir.contents[name];
        if (!item) return `rm: cannot remove '${name}': No such file or directory`;
        if (item.type === 'folder' && Object.keys(item.contents).length > 0) return `rm: cannot remove '${name}': Directory not empty`;
        delete currentDir.contents[name];
        return `Removed ${name}.`;
    },
    edit: (name) => {
        const file = currentDir.contents[name];
        if (!file) return `edit: ${name}: No such file or directory`;
        if (file.type === 'folder') return `edit: ${name}: Is a directory`;

        editMode = true;
        editFile = file; 
        return `Entering edit mode for "${name}". Type '.' on a new line to save and exit. Current content:\n---BEGIN---\n${file.content}\n---END---`;
    }
};

// Sanitize input
function sanitizeInputForDisplay(s) {
  return s.replace(/[\x00-\x1F\x7F]/g, '');
}

// Sanitize input
function sanitizeInputForDisplay(s) {
  return s.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Creates a new output line and inserts it above the input line.
 * CRITICAL FIX: Handles HTML vs. Text Node output for safety and styling.
 * @param {string} text 
 */
function addLine(text) {
    // Ensure text is converted to string and only the first 2000 chars are processed
    const safe = String(text).slice(0, 2000); 
    
    // Split by newline to maintain formatting, if any
    safe.split('\n').forEach(lineText => {
        const outputLine = document.createElement('div');
        outputLine.className = 'line';
        
        
        if (
            lineText.includes('<span class="error-message">') || 
            lineText.includes('<span class="success-message">') || // <--- THIS IS THE NEW LINE
            lineText.includes('<div') || 
            lineText.includes('<pre')
        ) {
            // Use innerHTML for styled messages and errors
            outputLine.innerHTML = lineText;
        } else {
            // Use text node creation for all other content (prevents XSS from user input)
            outputLine.appendChild(document.createTextNode(lineText));
        }

        terminalLines.insertBefore(outputLine, inputLine);
    });
    terminal.scrollTop = terminal.scrollHeight;
    terminalLines.scrollTop = terminalLines.scrollHeight;
}

// Update input line text
function updateInput() {
  if (!inputLine) return;
  if (inputText.length > MAX_INPUT_LENGTH) inputText = inputText.slice(0, MAX_INPUT_LENGTH);
  // Clear the current content
  inputLine.innerHTML = ''; 
  // Add path and user input text
  inputLine.appendChild(document.createTextNode(`${currentPath} > ${sanitizeInputForDisplay(inputText)}`));
  // Re-append the cursor
  inputLine.appendChild(cursor); 
}

/**
 * CRITICAL FUNCTION: This clears the currently typed command from the screen 
 * and refreshes the input buffer, preventing the command itself 
 * from being moved to the persistent history. Only the output will remain.
 * @param {string} command The command text (now discarded from history view).
 */
function finalizeCommandLine(command) {
    // 1. Clear the input buffer for the next command.
    inputText = '';

    // 2. Update the input line to show the new, empty prompt.
    updateInput();

    // 3. Scroll to the bottom (necessary because output will have just been added).
    terminal.scrollTop = terminal.scrollHeight;
}

function startGame() {
    guessMode = true;
    targetNumber = Math.floor(Math.random() * 100) + 1; // Number between 1 and 100
    guessCount = 0;
    
    // Clear the current input line to show the new prompt
    inputText = ''; 
    updateInput();

    const instructions = [
        "Guessing Game started! (1-100)",
        "Type your guess and hit Enter.",
        "Type 'quit' or press Escape to exit.",
    ].join('\n');
    return instructions;
}

/**
 * Handles input when in Guessing Mode.
 * @param {string} input The user's input string.
 * @returns {string} The output message to display.
 */
function handleGuessInput(input) {
    if (input.toLowerCase() === 'quit') {
        guessMode = false;
        return `Game aborted after ${guessCount} guesses. The number was ${targetNumber}.`;
    }

    const userGuess = parseInt(input.trim(), 10);

    if (isNaN(userGuess) || userGuess < 1 || userGuess > 100) {
        guessCount++; 
        return "Invalid input. Please enter a number between 1 and 100.";
    }

    guessCount++;

    if (userGuess < targetNumber) {
        return `Too low! Try again. (Guess #${guessCount})`;
    } else if (userGuess > targetNumber) {
        return `Too high! Try again. (Guess #${guessCount})`;
    } else {
        // Correct guess!
        guessMode = false;
        return `CONGRATULATIONS! You guessed the number ${targetNumber} in ${guessCount} attempts.`;
    }
}

function colorcycle() {
    if (colorInterval) {
        // Stop the cycle
        clearInterval(colorInterval);
        colorInterval = null;
        colorcycleMode = false;
        // Reset to original color
        terminal.style.color = BASE_COLOR;
        updateInput();
        return "Color cycling stopped.";
    }

    // Start the cycle
    colorcycleMode = true;
    addLine("Colorcycle started (RGB). Press ESC to stop.");
    
    colorInterval = setInterval(() => {
        currentHue = (currentHue + 5) % 360; 
        const newColor = `hsl(${currentHue}, 90%, 60%)`;
        terminal.style.color = newColor;
        updateInput(); 
    }, 100); 
    
    return;
}

/**
 * Executes a single command line from a script file (non-interactive only).
 * @param {string} commandLine The line of the script to execute.
 */
function executeScriptCommand(commandLine) {
    const trimmedInput = commandLine.trim();
    if (trimmedInput === '') return;

    const lowerInput = trimmedInput.toLowerCase();
    let handled = false;
    
    // Commands that should run in a script
    if (trimmedInput.startsWith('echo ')) {
        addLine(trimmedInput.slice(5));
        handled = true;
    } else if (trimmedInput === 'echo') {
        addLine('');
        handled = true;
    } else if (trimmedInput.startsWith('reverse ')) {
        const toReverse = trimmedInput.slice(8);
        addLine(toReverse.split('').reverse().join(''));
        handled = true;
    } else if (lowerInput === 'ls') {
        addLine(filesystemCommands.ls());
        handled = true;
    } else if (lowerInput === 'whoami') {
        addLine('ARM-23 user');
        handled = true;
    } else if (lowerInput === 'date') {
        addLine(new Date().toString());
        handled = true;
    } else if (trimmedInput.startsWith('cat ')) {
        const name = trimmedInput.slice(4).trim();
        addLine(filesystemCommands.cat(name));
        handled = true;
    } else if (lowerInput === 'clear') {
        // Clearing the screen is okay in a script
        const linesToRemove = Array.from(terminalLines.children).filter(child => child !== inputLine);
        linesToRemove.forEach(line => line.remove());
        handled = true;
    }
    // VFS commands that write (touch, mkdir, rm)
    else if (trimmedInput.startsWith('mkdir ')) {
        const result = filesystemCommands.mkdir(trimmedInput.slice(6).trim());
        if (result) addLine(result);
        handled = true;
    } else if (trimmedInput.startsWith('touch ')) {
        const result = filesystemCommands.touch(trimmedInput.slice(6).trim());
        if (result) addLine(result);
        handled = true;
    } else if (trimmedInput.startsWith('rm ')) {
        const result = filesystemCommands.rm(trimmedInput.slice(3).trim());
        if (result) addLine(result);
        handled = true;
    }
    
    if (!handled) {
        addLine(`<span class="error-message">[SCRIPT ERROR] Unknown/Non-Executable Command: ${trimmedInput}</span>`);
    }
}


// Key handler
document.addEventListener('keydown', (e) => {
  // ESCAPE key handling
  if (e.key === 'Escape') {
    if (autocodeMode) {
      autocodeMode = false;
      inputText = '';
      codeIndex = 0;
      addLine('Autocode cancelled');
      updateInput();
      e.preventDefault();
      return;
    }
    if (colorInterval) {
      clearInterval(colorInterval);
      colorInterval = null;
      colorcycleMode = false;
      terminal.style.color = BASE_COLOR;
      inputText = '';
      addLine('Colorcycle cancelled');
      updateInput();
      e.preventDefault();
      return;
    }
    if (editMode) {
      editMode = false;
      editFile = null;
      inputText = '';
      addLine('Edit mode cancelled');
      updateInput();
      e.preventDefault();
      return;
    }
    if (scriptMode) {
        scriptMode = false;
        currentScriptLines = [];
        inputText = '';
        addLine('Script creation cancelled.');
        updateInput();
        e.preventDefault();
        return;
    }
    if (guessMode) {
            guessMode = false;
            inputText = '';
            addLine(`Guessing Game cancelled. The number was ${targetNumber}.`);
            updateInput();
            e.preventDefault();
            return;
    }
  }

  // Autocode typing
  if (autocodeMode) {
    e.preventDefault();
    const char = longCode[codeIndex];
    if (char) {
      if (char === '\n') {
        // NOTE: We keep the echo here to visually simulate the line of code being typed and executed.
        addLine(`${currentPath} > ${inputText}`); 
        inputText = '';
      } else {
        inputText += char;
      }
      codeIndex++;
      updateInput();
    } else {
      addLine('<< End of code >>');
      autocodeMode = false;
      inputText = '';
      codeIndex = 0;
      updateInput();
    }
    return;
  }

  // SCRIPT MODE INPUT LOGIC (Collects lines until '.' or Enter on 'naming')
  if (scriptMode === 'collecting') {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            const lineToSave = inputText; // Capture input before clearing
            const trimmed = lineToSave.trim();
            
            // Check for the save command
            if (trimmed === '.') {
                // Clear the input line (no echo)
                finalizeCommandLine(lineToSave); 
                
                scriptMode = 'naming'; 
                inputText = 'Name the script file: ';
                updateInput();
                return;
            } 
            
            // Collect line
            currentScriptLines.push(trimmed);
            
            // FIX: Clear the input line instantly (no echo)
            finalizeCommandLine(lineToSave);
            
            // Show the line content as a clean history output
            addLine(lineToSave);
            
            return;
        } else if (e.key === 'Backspace') {
            inputText = inputText.slice(0, -1);
        } else if (e.key.length === 1) {
            inputText += e.key;
        }
        updateInput();
        e.preventDefault();
        return;
  }

  // Edit mode typing
  if (editMode) {
    if (e.key === 'Enter') {
      const lineToSave = inputText; // Capture input before clearing
      const trimmed = lineToSave.trim();

      if (trimmed === '.') {
        addLine(`Finished editing "${editFile.name || 'file'}".`);
        editMode = false;
        editFile = null;
        inputText = '';
      } else {
        editFile.content += lineToSave + '\n'; 
        
        // FIX: Clear the input line instantly (no echo)
        finalizeCommandLine(lineToSave);
        
        // Show the line content as a clean history output
        addLine(lineToSave); 
        
        return;
      }
      updateInput();
      e.preventDefault();
      return;
    } else if (e.key === 'Backspace') {
      inputText = inputText.slice(0, -1);
    } else if (e.key.length === 1) {
      inputText += e.key;
    }
    updateInput();
    e.preventDefault();
    return;
  }

  // Guess mode typing
  if (guessMode) {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            const trimmedInput = inputText.trim();
            
            // This clears the input, showing only the output below the cleared prompt
            finalizeCommandLine(trimmedInput); 
            
            const result = handleGuessInput(trimmedInput);
            if (result) addLine(result);

            if (!guessMode) { 
                inputText = '';
            }
            updateInput();
            return;
        } else if (e.key === 'Backspace') {
            inputText = inputText.slice(0, -1);
        } else if (e.key.length === 1) {
            inputText += e.key;
        }
        updateInput();
        e.preventDefault();
        return;
  }

  // Normal input
  if (e.key === 'Backspace') {
    inputText = inputText.slice(0, -1);
  } else if (e.key === 'Enter') {
    e.preventDefault();

    const trimmedInput = inputText.trim();
    const lowerInput = trimmedInput.toLowerCase();

    // SCRIPT NAMING/SAVING MODE
    if (scriptMode === 'naming') {
        const promptText = "Name the script file: ";
        const scriptName = inputText.slice(promptText.length).trim();
        
        if (scriptName && !currentDir.contents[scriptName]) {
            currentDir.contents[scriptName] = { 
                type: 'file', 
                content: currentScriptLines.join('\n') 
            };
            addLine(`Script '${scriptName}' saved successfully.`);
        } else {
            addLine(`<span class="error-message">Error: Invalid name or file '${scriptName}' already exists. Script discarded.</span>`);
        }
        
        scriptMode = false;
        currentScriptLines = [];
        // We use finalizeCommandLine here to clear the input prompt after naming
        finalizeCommandLine(inputText); 
        return;
    }

    // *** STANDARD COMMAND EXECUTION ***
    // This function call clears the command from the screen *before* the output is generated.
    finalizeCommandLine(trimmedInput); 

    let handled = false;

    // Built-in commands
    if (lowerInput === 'clear') {
      const linesToRemove = Array.from(terminalLines.children).filter(child => child !== inputLine);
      linesToRemove.forEach(line => line.remove());
      handled = true;
    } else if (lowerInput === 'help') {
      commands.help.split('\n').forEach(line => addLine(line));
      handled = true;
    } else if (trimmedInput.startsWith('echo ')) {
      addLine(trimmedInput.slice(5));
      handled = true;
    } else if (trimmedInput === 'echo') {
      addLine('');
      handled = true;
    } else if (lowerInput === 'whoami') {
      addLine('ARM-23 user');
      handled = true;
    } else if (lowerInput === 'date') {
      addLine(new Date().toString());
      handled = true;
    } else if (lowerInput === 'autocode') {
      autocodeMode = true;
      codeIndex = 0;
      addLine('Autocode mode started. Press Escape to exit.');
      handled = true;
    } else if (lowerInput === 'hello') {
      const helloCode = [
        '--- Hello World Examples ---',
        'BASIC: PRINT "HELLO WORLD"',
        'FORTRAN: PRINT *, "HELLO WORLD"',
        'C: printf("Hello World!\\n");',
        'C++: std::cout << "Hello World!" << std::endl;',
        'Python: print("Hello World!")',
        'Java: System.out.println("Hello World!");',
        'Visual Basic: MsgBox "Hello World!"'
      ];
      helloCode.forEach(line => addLine(line));
      handled = true;
    } else if (lowerInput === 'loading') {
      const frames = [
        '[=           ]', '[==          ]', '[====        ]', '[======      ]', 
        '[========    ]', '[==========  ]', '[============]', '[==============]', '[================]'
      ];
      let i = 0;
      
      let intervalHandle;
      let safetyTimeoutHandle;

      // Function to handle natural completion
      const completeLoading = () => {
        clearInterval(intervalHandle);
        clearTimeout(safetyTimeoutHandle);
        addLine('Load complete.');
      };

      // Start the loading interval
      intervalHandle = setInterval(() => {
        if (i < frames.length) {
          addLine('Loading... ' + frames[i]);
          i++;
        } else {
          completeLoading(); // Natural end
        }
      }, 300);

      // SAFETY TIMEOUT: Forces a stop after 5 seconds maximum runtime
      safetyTimeoutHandle = setTimeout(() => {
        if (i < frames.length) { // Only force stop if it hasn't naturally finished
          clearInterval(intervalHandle);
          addLine('<span class="error-message">ERROR: Load exceeded maximum runtime and was forcibly stopped.</span>');
        }
      }, 5000); // 5 seconds maximum runtime

      handled = true;
    } else if (lowerInput.startsWith('reverse ')) {
      const toReverse = trimmedInput.slice(8);
      addLine(toReverse.split('').reverse().join(''));
      handled = true;
    } else if (lowerInput === 'colorcycle') {
      colorcycle(); 
      handled = true;
    } else if (lowerInput === 'exit') {
      const exitSequence = [
        'Shutting down terminal...', 'Saving session...', 'Closing connections...', 'Goodbye!'
      ];
      exitSequence.forEach((line, index) => { setTimeout(() => addLine(line), index * 500); });
      setTimeout(() => inputLine.style.display = 'none', exitSequence.length * 500); 
      handled = true;
    } else if (lowerInput === 'guess') {
            const result = startGame();
            addLine(result);
            handled = true;
    }
        else if (lowerInput === 'sad') {
            const messages = [
                '<span class="success-message">Remember: You are capable, strong, and valued.</span>',
                '<span class="success-message">Sending a digital hug (\\_/) from the terminal.</span>',
                '<span class="success-message">The system loves you. Keep going.</span>',
                '<span class="success-message">STATUS: All systems GO! for happiness.</span>',
                '<span class="success-message">You are the most interesting and most special person in universe.</span>'
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            addLine(randomMessage);
            handled = true;
        }

    // SCRIPT COMMANDS
    else if (lowerInput === 'script') {

        if (editMode || guessMode) {
            addLine(`<span class="error-message">Error: Cannot enter script mode while another modal session (Edit or Guessing Game) is active.</span>`);
            handled = true;
            return;
        }

        scriptMode = 'collecting';
        currentScriptLines = [];
        addLine("Script mode enabled. Write '.' on a new line to finish and save.");
        handled = true;
    } else if (trimmedInput.startsWith('script run ')) {
        const scriptName = trimmedInput.slice(11).trim();
        const file = currentDir.contents[scriptName];

        if (file && file.type === 'file') {
            addLine(`--- RUNNING SCRIPT: ${scriptName} ---`);
            
            const scriptCommands = file.content.split('\n').filter(line => line.trim().length > 0);
            
            scriptCommands.forEach(cmd => {
                addLine(`>> ${cmd}`); // Show the command as it executes (for script readability)
                executeScriptCommand(cmd);
            });
            
            addLine(`--- SCRIPT FINISHED: ${scriptName} ---`);
        } else {
            addLine(`<span class="error-message">Error: Script file '${scriptName}' not found or is a directory.</span>`);
        }
        handled = true;
    }
    
    // Filesystem commands
    else {
      const fsParts = trimmedInput.split(' ');
      const fsCmd = fsParts[0];
      const fsArg = fsParts.slice(1).join(' ');
      if (typeof filesystemCommands[fsCmd] === 'function') {
        if (fsCmd === 'edit') {
                if (scriptMode === 'collecting' || guessMode) {
                    addLine(`<span class="error-message">Error: Cannot enter edit mode while another modal session (Script or Guessing Game) is active.</span>`);
                    handled = true;
                    return;
                }
            }
    
        const result = filesystemCommands[fsCmd](fsArg);
        if (result) addLine(result);
        handled = true;
      }
    }

    if (!handled) addLine(`Unknown command: ${trimmedInput}`);

  } else if (e.key.length === 1) {
    inputText += e.key;
    }

  if (e.key !== 'Enter') {
      updateInput();
  }
});

