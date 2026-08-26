//main.setGlobalVar("credits", vm.runtime.ext_dogeiscutObject.parse(vm.runtime.ext_flscrl.pathify({URL: 'assets/data/credits.json'})))
Scratch.fetch(vm.runtime.ext_flscrl.pathify({PATH: 'assets/data/credits.json'}))
    .then(response => response.text())
    .then(text => {
        vm.runtime.variables["CREDITS"] = vm.runtime.ext_jwArray.parse({INPUT: text});
    });
    