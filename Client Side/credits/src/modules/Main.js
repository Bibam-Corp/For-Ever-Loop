export class Main {
    constructor(vm) {
        this.vm = vm;
        this.stage = vm.runtime.getTargetForStage();
    }
    checkifworks() {
        console.log("Main module works");
        console.log(this.vm);
        console.log(vm);
        console.log(Scratch.vm);
    }
    // just gen runtime things
    getFPS() {
        return vm.runtime.ext_jgRuntime.getFrameRate();
    }
    setStageSize(w, h) {
        vm.runtime.ext_jgRuntime.setStageSize({WIDTH: w, HEIGHT: h})
    }
    setMaxFPS(f) {
        this.vm.runtime.ext_jgRuntime.setMaxFrameRate({FRAMERATE: f});
    }
    getMaxFPS() {
        this.vm.runtime.ext_jgRuntime.getMaxFrameRate();
    }
    // temp vars
    setRuntimeVar(VAR, val){
        this.vm.runtime.variables[VAR] = val; 
    }
    getRuntimeVar(VAR){
        return this.vm.runtime.variables[VAR];
    }

    // global variables
    getGlobalVar(VAR){
        this.stage.lookupVariableByNameAndType(VAR, '');
    }
    setGlobalVar(VAR, VAL){
        this.stage.lookupVariableByNameAndType(VAR, '').value = VAL;
    }
    createGlobalVar(VAR, VAL, CL){
        // THIS WILL NOT WORK IF THE VARIABLE ALREADY EXISTS
        this.stage.lookupOrCreateVariable(VAR, CL ? "☁ " + VAR : VAR);
        vm.refreshWorkspace()
    }
    pathify(p) {
        return this.vm._ap + p;
    }
}

