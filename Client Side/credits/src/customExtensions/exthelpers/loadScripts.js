// removes existing modules

let element1 = document.querySelectorAll("#MAIN")
element1.forEach((e) => { e.remove() });

let element2 = document.querySelectorAll("#XMLP")
element2.forEach((e) => { e.remove() });

let element3 = document.querySelectorAll("#INIT")
element3.forEach((e) => { e.remove() });

let element4 = document.querySelectorAll("#EASEL")
element4.forEach((e) => { e.remove() });

// easeljs (rendering engine)
const EASEL = document.createElement("script");
EASEL.id = "EASEL";
EASEL.src = "https://code.createjs.com/1.0.0/easeljs.min.js";
EASEL.onload = () => {
    vm.runtime.variables["SCRIPTSLOADED"].push("EASEL")
}

document.body.appendChild(EASEL);

// adding modules

const MAIN = document.createElement("script");
MAIN.type = "module"; 
MAIN.id = "MAIN";
MAIN.src = vm._ap + "src/modules/Main.js";
MAIN.onload = () => {
    vm.runtime.variables["SCRIPTSLOADED"].push("Main")
}

document.body.appendChild(MAIN);

const XMLP = document.createElement("script");
XMLP.type = "module"; 
XMLP.id = "XMLP";
XMLP.src = vm._ap + "src/modules/XMLParser.js";
XMLP.onload = () => {
    vm.runtime.variables["SCRIPTSLOADED"].push("XMLParser")
}

document.body.appendChild(XMLP);

const INIT = document.createElement("script");
INIT.type = "module"; 
INIT.id = "INIT";
INIT.src = vm._ap + "src/init.js";
INIT.onload = () => {
    vm.runtime.variables["SCRIPTSLOADED"].push("init");
}

document.body.appendChild(INIT);
