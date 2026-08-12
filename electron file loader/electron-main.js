//Replace the original Electron file | /!\ only work for the TW extention!

'use strict';

const {
  app,
  BrowserWindow,
  Menu,
  shell,
  screen,
  dialog,
  ipcMain
} = require('electron');

const fs = require('fs');
const path = require('path');

const isMac = process.platform === 'darwin';

let mainWindow = null;
let pendingFiles = [];

// ============================================================
// SINGLE INSTANCE
// ============================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {

  app.on('second-instance', (event, commandLine) => {

    const file = findSupportedFile(commandLine);

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }

    if (file) {
      openFile(file);
    }
  });
}

// ============================================================
// SUPPORTED FILE TYPES
// ============================================================

const SUPPORTED_EXTENSIONS = [
  '.fel',
  '.felud',
  '.felst'
];

function findSupportedFile(args) {

  return args.find(arg => {

    const lower = String(arg).toLowerCase();

    return SUPPORTED_EXTENSIONS.some(
      ext => lower.endsWith(ext)
    );

  });
}

// ============================================================
// TURBOWARP
// ============================================================

const resourcesURL = Object.assign(
  new URL('file://'),
  {
    pathname: path.join(__dirname, '/')
  }
).href;

const defaultProjectURL =
  new URL('./index.html', resourcesURL).href;


// ============================================================
// CREATE WINDOW
// ============================================================

function createWindow(windowOptions = {}) {

  const options = {

    title: 'Project',

    icon: path.resolve(
      __dirname,
      'icon.png'
    ),

    useContentSize: true,

    webPreferences: {

      sandbox: true,

      contextIsolation: true,

      nodeIntegration: false,

      preload: path.resolve(
        __dirname,
        'electron-preload.js'
      ),

      backgroundThrottling: false
    },

    frame: true,

    show: false,

    width: 480,

    height: 360,

    ...windowOptions
  };


  const activeScreen =
    screen.getDisplayNearestPoint(
      screen.getCursorScreenPoint()
    );

  const bounds =
    activeScreen.workArea;


  options.x =
    bounds.x +
    ((bounds.width - options.width) / 2);

  options.y =
    bounds.y +
    ((bounds.height - options.height) / 2);


  return new BrowserWindow(options);
}


// ============================================================
// TEXT / BINARY DETECTION
// ============================================================

function looksLikeText(buffer) {

  const sample =
    buffer.subarray(
      0,
      Math.min(buffer.length, 8192)
    );


  // NUL byte = probably binary

  for (const byte of sample) {

    if (byte === 0) {
      return false;
    }

  }


  const text =
    sample.toString('utf8');


  let replacements = 0;


  for (const char of text) {

    if (char === '\uFFFD') {
      replacements++;
    }

  }


  return (
    replacements <=
    Math.max(
      2,
      text.length * 0.01
    )
  );
}


// ============================================================
// MIME TYPES
// ============================================================

function getMimeType(filePath) {

  const ext =
    path.extname(filePath).toLowerCase();


  const mimeTypes = {

    '.png': 'image/png',

    '.jpg': 'image/jpeg',

    '.jpeg': 'image/jpeg',

    '.gif': 'image/gif',

    '.webp': 'image/webp',

    '.bmp': 'image/bmp',

    '.svg': 'image/svg+xml',

    '.ico': 'image/x-icon',

    '.mp3': 'audio/mpeg',

    '.wav': 'audio/wav',

    '.ogg': 'audio/ogg',

    '.mp4': 'video/mp4',

    '.webm': 'video/webm',

    '.pdf': 'application/pdf',

    '.zip': 'application/zip',

    '.json': 'application/json',

    '.txt': 'text/plain',

    '.fel': 'text/plain',

    '.felud': 'text/plain',

    '.felst': 'text/plain'
  };


  return (
    mimeTypes[ext] ||
    'application/octet-stream'
  );
}


// ============================================================
// READ FILE
// ============================================================

function readFileForProject(filePath) {

  try {

    const absolutePath =
      path.resolve(filePath);


    const buffer =
      fs.readFileSync(absolutePath);


    const stat =
      fs.statSync(absolutePath);


    const isText =
      looksLikeText(buffer);


    const mime =
      getMimeType(absolutePath);


    let data;


    if (isText) {

      // TEXT FILE
      data =
        buffer.toString('utf8');

    } else {

      // BINARY FILE → DATA URI

      data =
        `data:${mime};base64,${buffer.toString('base64')}`;

    }


    return {

      name:
        path.basename(absolutePath),

      path:
        absolutePath,

      size:
        stat.size,

      data:

        data,

      isText:

        isText,

      mime:

        mime
    };


  } catch (error) {

    console.error(
      '[Electron File Loader] Could not read file:',
      error
    );


    dialog.showErrorBox(

      'Could not open file',

      `${error.message}\n\n${filePath}`

    );


    return null;
  }
}


// ============================================================
// SEND FILE TO TURBOWARP
// ============================================================

function sendFileToProject(filePath) {

  if (
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {

    pendingFiles.push(filePath);

    return;
  }


  const file =
    readFileForProject(filePath);


  if (!file) {
    return;
  }


  mainWindow.webContents.send(
    'open-file',
    file
  );
}


// ============================================================
// OPEN FILE
// ============================================================

function openFile(filePath) {

  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.webContents.isLoading()
  ) {

    pendingFiles.push(filePath);

    return;
  }


  sendFileToProject(filePath);
}


// ============================================================
// SEND WAITING FILES
// ============================================================

function flushPendingFiles() {

  const files =
    pendingFiles;


  pendingFiles = [];


  for (const file of files) {

    sendFileToProject(file);

  }
}


// ============================================================
// CLOSE FILE
// ============================================================

ipcMain.on(
  'electron-file-loader-close',
  () => {

    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {

      mainWindow.webContents.send(
        'close-file'
      );

    }

  }
);


// ============================================================
// MENU
// ============================================================

if (isMac) {

  Menu.setApplicationMenu(

    Menu.buildFromTemplate([

      { role: 'appMenu' },

      { role: 'fileMenu' },

      { role: 'editMenu' },

      { role: 'windowMenu' },

      { role: 'help' }

    ])

  );

} else {

  Menu.setApplicationMenu(null);

}


// ============================================================
// URL SECURITY
// ============================================================

function isResourceURL(url) {

  try {

    const parsedUrl =
      new URL(url);


    return (

      parsedUrl.protocol === 'file:' &&

      parsedUrl.href.startsWith(
        resourcesURL
      )

    );

  } catch {

    return false;

  }
}


const SAFE_PROTOCOLS = [

  'https:',

  'http:',

  'mailto:'

];


function isSafeOpenExternal(url) {

  try {

    const parsedUrl =
      new URL(url);


    return SAFE_PROTOCOLS.includes(
      parsedUrl.protocol
    );

  } catch {

    return false;

  }
}


function isDataURL(url) {

  try {

    const parsedUrl =
      new URL(url);


    return (
      parsedUrl.protocol === 'data:'
    );

  } catch {

    return false;

  }
}


// ============================================================
// PROJECT WINDOW
// ============================================================

function createProjectWindow(url) {

  const window =
    createWindow({

      backgroundColor:
        '#000000'

    });


  // THIS IS IMPORTANT

  mainWindow =
    window;


  window.loadURL(url);


  window.once(
    'ready-to-show',
    () => {

      window.show();

      flushPendingFiles();

    }
  );


  window.on(
    'closed',
    () => {

      if (
        mainWindow === window
      ) {

        mainWindow = null;

      }

    }
  );


  return window;
}


function createDataWindow(dataURI) {

  const window =
    createWindow({});


  window.loadURL(
    dataURI
  );
}


function openLink(url) {

  if (isDataURL(url)) {

    createDataWindow(url);

  } else if (
    isResourceURL(url)
  ) {

    createProjectWindow(url);

  } else if (
    isSafeOpenExternal(url)
  ) {

    shell.openExternal(url);

  }

}


// ============================================================
// CRASH HANDLERS
// ============================================================

function createProcessCrashMessage(details) {

  let message =
    details.type
      ? details.type + ' child process'
      : 'Renderer process';


  message +=
    ' crashed: ' +
    details.reason +
    ' (' +
    details.exitCode +
    ')\n\n';


  if (
    process.arch === 'ia32'
  ) {

    message +=
      'Usually this means the project was too big for the ' +
      '32-bit Electron environment or your computer is out ' +
      'of memory. Ask the creator to use the 64-bit environment instead.';

  } else {

    message +=
      'Usually this means your computer is out of memory.';

  }


  return message;
}


app.on(
  'render-process-gone',
  (event, webContents, details) => {

    const window =
      BrowserWindow.fromWebContents(
        webContents
      );


    dialog.showMessageBoxSync(

      window,

      {

        type: 'error',

        title: 'Error',

        message:
          createProcessCrashMessage(
            details
          )

      }

    );

  }
);


app.on(
  'child-process-gone',
  (event, details) => {

    dialog.showMessageBoxSync(

      {

        type: 'error',

        title: 'Error',

        message:
          createProcessCrashMessage(
            details
          )

      }

    );

  }
);


// ============================================================
// WEB CONTENTS
// ============================================================

app.on(
  'web-contents-created',
  (event, contents) => {


    contents.setWindowOpenHandler(
      (details) => {

        setImmediate(
          () => {

            openLink(
              details.url
            );

          }
        );


        return {
          action: 'deny'
        };

      }
    );


    contents.on(
      'will-navigate',
      (e, url) => {

        if (
          !isResourceURL(url)
        ) {

          e.preventDefault();

          openLink(url);

        }

      }
    );


    contents.on(
      'before-input-event',
      (e, input) => {

        const window =
          BrowserWindow.fromWebContents(
            contents
          );


        if (
          !window ||
          input.type !== 'keyDown'
        ) {

          return;

        }


        if (

          input.key === 'F11' ||

          (
            input.key === 'Enter' &&
            input.alt
          )

        ) {

          window.setFullScreen(
            !window.isFullScreen()
          );


        } else if (
          input.key === 'Escape'
        ) {

          const behavior =
            'unfullscreen-only';


          if (

            window.isFullScreen() &&

            (
              behavior ===
                'unfullscreen-only' ||

              behavior ===
                'unfullscreen-or-exit'
            )

          ) {

            window.setFullScreen(
              false
            );


          } else if (

            behavior ===
              'unfullscreen-or-exit' ||

            behavior ===
              'exit-only'

          ) {

            window.close();

          }

        }

      }
    );

  }
);


// ============================================================
// FILE ACCESS
// ============================================================

app.on(
  'session-created',
  (session) => {

    session.webRequest.onBeforeRequest(

      {
        urls: ['file://*']
      },

      (details, callback) => {

        callback({

          cancel:
            !details.url.startsWith(
              resourcesURL
            )

        });

      }

    );


    const referer =
      'https://packager.turbowarp.org/referer.html#' +
      app.getName();


    session.webRequest.onBeforeSendHeaders(

      (details, callback) => {

        callback({

          requestHeaders: {

            ...details.requestHeaders,

            referer

          }

        });

      }

    );

  }
);


// ============================================================
// APP START
// ============================================================

app.on(
  'window-all-closed',
  () => {

    app.quit();

  }
);


app.whenReady().then(
  () => {

    // CREATE ONLY ONE WINDOW

    createProjectWindow(
      defaultProjectURL
    );


    // FILE USED TO LAUNCH THE APP

    const file =
      findSupportedFile(
        process.argv
      );


    if (file) {

      pendingFiles.push(
        file
      );

    }

  }
);