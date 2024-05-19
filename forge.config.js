module.exports = {
  packagerConfig: {
    extraResource: [
			"./resources/browsers",
			"./resources/node_modules",
			"./resources/models",
			"./resources/app",
		],
    asar: true,
    icon: './resources/app/icons/favicon4', // no file extension required
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: "alisko",
			  setupIcon: './resources/app/icons/favicon4.ico',
			  iconUrl:'https://alisko.vlesu.com/favicon4.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
          options: {
            icon:  './resources/app/icons/favicon4.png',
          }},
    },
    //{
    //  name: '@electron-forge/maker-rpm',
    //  config: {},
    //},
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
	  // DOC: https://www.electronforge.io/config/plugins/webpack
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
		  entryPoints: [
			{
			  html: "./src/client/windows/index.html",
			  js: "./src/client/windows/index.jsx",
			  name: "main_window",
			  preload: {
				js: '/src/client/windows/preload.js'
			  }
			},
			{
			  html: "./src/client/windows/recorder.html",
			  js: "./src/client/windows/recorder.jsx",
			  name: "recorder_window",
			  preload: {
				js: '/src/client/windows/preload.js'
			  }
			},
		  ]
        },
      },
    },
  ],
};
