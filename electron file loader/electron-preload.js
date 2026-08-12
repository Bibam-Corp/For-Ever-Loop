//Replace the original Electron file | /!\ only work for the TW extention!

'use strict';

const {
  contextBridge,
  ipcRenderer
} = require('electron');


contextBridge.exposeInMainWorld(

  'ElectronFileLoader',

  {

    // ========================================================
    // FILE OPENED
    // ========================================================

    onFileOpened(callback) {

      ipcRenderer.on(
        'open-file',

        (event, file) => {

          callback(file);

        }

      );

    },


    // ========================================================
    // FILE CLOSED
    // ========================================================

    onFileClosed(callback) {

      ipcRenderer.on(
        'close-file',

        () => {

          callback();

        }

      );

    },


    // ========================================================
    // CLOSE FILE
    // ========================================================

    closeFile() {

      ipcRenderer.send(
        'electron-file-loader-close'
      );

    }

  }

);