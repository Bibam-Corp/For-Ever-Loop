(function (Scratch){
    if (!Scratch.extensions.unsandboxed) throw new Error("the Script Loader extension needs to be ran unsandboxed");

    let el;
    
    vm.ap = vm.runtime.isPackaged ? "" : "https://raw.githubusercontent.com/Bibam-Corp/For-Ever-Loop/refs/heads/main/Client%20Side/credits/" // change if your local server is different

    class flscrl {
        constructor(){
            vm.runtime.variables["SCRIPTSLOADED"] = []; // turns temp variable into an array.
        }
        getInfo(){
            return {
                id: 'flscrl',
                name: 'script loader',
                color1: '#a86432',
                blocks: [
                    {
                        func: "WARN",
                        blockType: Scratch.BlockType.BUTTON,
                        text: "WARNING"
                    },

                    { blockType: Scratch.BlockType.LABEL, text: 'asset path utils' },
                    {
                        opcode: 'pathify',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'pathify [PATH]',
                        arguments: {
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
                        },
                        
                    },
                    {
                        opcode: 'getpth',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'current asset path',
                    },
                    {
                        opcode: 'setpth',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set path to [URL]',
                        arguments: {
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
                        },
                    },
                    { blockType: Scratch.BlockType.LABEL, text: 'script utils' },
                    {
                        opcode: 'loadscr',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'load script from [URL] id [ID] is module? [MOD]',
                        arguments: {
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            ID: { type: Scratch.ArgumentType.STRING, defaultValue: '' },
                            MOD: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: '' }
                        },
                        //hideFromPalette: true,
                    },
                    {
                        opcode: 'allscr',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'all scripts loaded',
                    },
                    {
                        opcode: 'reset',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'reset scripts loaded',
                        //hideFromPalette: true,
                    },
                ]
            };
        }

        WARN() { alert("hiya there!\nyou need the Forever Loops source code if you want to use this extension! if you don't have this extension, the game will break") }

        // path stuff
        pathify(args) {
            return vm.ap + args.PATH;
        }

        getpth() { return vm.ap }
        setpth(args) { vm._ap = args.URL }

        // script stuff
        loadscr(args){
            el = document.querySelectorAll("#" + args.ID);
            el.forEach(e => e.remove());
            vm.runtime.variables["SCRIPTSLOADED"].filter(i => i !== args.ID)
            
            this.scr = document.createElement("script");
            this.scr.id = args.ID;
            this.scr.src = args.URL;
            if (args.MOD) this.scr.type = "module"
            else;

            document.body.appendChild(this.scr);

            vm.runtime.variables["SCRIPTSLOADED"].push(args.ID);
        }
        
        allscr() { return vm.runtime.variables["SCRIPTSLOADED"]; }
        reset() {
            vm.runtime.variables["SCRIPTSLOADED"] = [];
        }
    }

    Scratch.extensions.register(new flscrl());
})(Scratch);
