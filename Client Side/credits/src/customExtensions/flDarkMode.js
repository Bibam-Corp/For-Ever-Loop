 (function (Scratch) {
    // made by TheShovel, edited by Saunter
    "use strict";
    const delay = ms => new Promise(res => setTimeout(res, ms));
    let topBar;
    let topBar2;
    let css = "";
    topBar = 'div[class^="menu-bar_main-menu_"]';
    topBar2 = 'div[class^="menu-bar_account-info-group_"]';
    const stylesheet = document.createElement("style");
    stylesheet.className = "shovelcss-style";
    // end of <body> for higher precedence than other sheets
    document.body.appendChild(stylesheet);
    css += `${topBar}, ${topBar2} { background-color: #111111 !important; }`;
    stylesheet.textContent = css;
    class darkmodething {
        getInfo() {
            return {
                id: "darkmodething",
                name: "dark mode",
                blocks: [
                    {
                        opcode:"doesnothing",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "does nothing"
                    }
                ],
            };
        }
        doesnothing(){
            return "nothing";
        }
    }
    Scratch.extensions.register(new darkmodething());
})(Scratch);
    
    