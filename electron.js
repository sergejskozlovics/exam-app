const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs');


let DIR = ".";
let SCRIPT = function(beta, alpha) {
  window.alpha = alpha;
	window.beta = beta;
  console.log(" GOT A/B"+alpha+"/"+beta);  
  var arr = document.body.innerHTML.split("\\$").join("$").split("$");
	var i=1;
	while (i<arr.length) {
    let expr = arr[i];
    expr = expr.replace(/<\/?[^>]+(>|$)/g, ""); // eliminate inner tags
    // replace unicode symbols with ASCII alternatives
    // (sometimes HTML generators use unicode symbols for mathematical operations - that is not good for "eval")
    expr = expr
      .split("\u03B2").join("beta")
      .split("\u03b1").join("alpha")
      .split("\u2212").join("-")
      .split("\u2217").join("*");
    console.log(" GOT EXPR ",expr);
		arr[i] = eval(expr);
    console.log("EVAL", arr[i]);
		i+=2;
	}
  console.log(arr.join(""));
	document.body.innerHTML = arr.join("");
};

let mainWindow;
let otherWindows = [];

function createWindows() {

  mainWindow = new BrowserWindow({
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    webPreferences: {
      nodeIntegration: true,
      preload: __dirname + '/preload.js' // make window.ipcRenderer available to mainWin JS code
    }
  })

  mainWindow.loadFile("index.html");

  fs.readdir(DIR, (err, names) => {
    names.forEach(name => {

      if (fs.lstatSync(DIR + "/" + name).isFile()) {
        if (name.endsWith(".html") && name!="index.html") {
          let indexFileName = DIR + "/" + name;
          const win = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
              nodeIntegration: true
            }
          })

          win.loadFile(indexFileName)
          otherWindows.push(win);
        }
      }
    });
  });


}

app.whenReady().then(createWindows)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
  else
    otherWindows = [];
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindows()
  }
})


ipcMain.on('betaalpha', async (event, arg) => {
  if (arg.value.length<2)
    return;

  let beta=0;
  if (arg.value[0]!='Z') {
    beta = parseInt(arg.value[0]);
    if (beta==0)
      beta = 10;
  }
  let alpha=0;
  if (arg.value[1]!='Z') {
    alpha = parseInt(arg.value[1]);
    if (alpha==0)
      alpha = 10;
  }

  // stringified SCRIPT invocation with the (beta, alpha) arguments
  let s = "("+SCRIPT.toString()+")("+beta+","+alpha+")";

  otherWindows.forEach(win => {

    win.webContents.reload();
    win.webContents.once('dom-ready', () => {
      win.webContents.executeJavaScript(s);
    });
  })
});