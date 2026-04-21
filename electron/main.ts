import * as dotenv from 'dotenv'
dotenv.config()

import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } from 'electron'

// Reduce memory pressure before app is ready
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')
import path from 'path'
import fs from 'fs'
import { registerDbHandlers, initDatabase } from './ipc/dbHandlers'
import { registerScrapeHandlers } from './ipc/scrapeHandlers'
import { registerAgentHandlers } from './ipc/agentHandlers'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../resources/tray-icon.png')
    : path.join(process.resourcesPath, 'resources/tray-icon.png')

  let trayIcon: Electron.NativeImage
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }
  } else {
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir APPLY',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Lancer le scraping',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray:start-scraping')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('APPLY — AI Job Agent')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createWindow()
    }
  })
}

function sendNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: nativeImage.createEmpty()
    })
    notification.show()
  }
}

// IPC handler for sending notifications from renderer
ipcMain.handle('notify', (_event, title: string, body: string) => {
  sendNotification(title, body)
})

// IPC handler for window control
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.hide())

app.whenReady().then(() => {
  // Ensure outputs directory exists
  const outputsDir = path.join(app.getPath('userData'), 'outputs')
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true })
  }

  initDatabase()
  registerDbHandlers()
  registerScrapeHandlers(sendNotification)
  registerAgentHandlers(sendNotification)

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep app in tray, don't quit
  }
})

app.on('before-quit', () => {
  if (tray) {
    tray.destroy()
  }
})

export { mainWindow, sendNotification }
