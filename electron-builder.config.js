module.exports = {
  appId: 'com.brennmakouya.apply',
  productName: 'APPLY',
  copyright: 'Copyright © 2026 Brenn MAKOUYA',
  directories: {
    output: 'release',
    buildResources: 'resources'
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'user-profile/**/*',
    'agents-config/**/*',
  ],
  extraResources: [
    {
      from: 'user-profile',
      to: 'user-profile'
    },
    {
      from: 'agents-config',
      to: 'agents-config'
    },
  ],
  win: {
    target: 'nsis',
    icon: 'resources/icon.ico'
  },
  mac: {
    target: 'dmg',
    icon: 'resources/icon.icns'
  },
  linux: {
    target: 'AppImage',
    icon: 'resources/icon.png'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}
