(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed) {
        throw new Error(
            "Cette extension doit être chargée en mode non sandboxé."
        );
    }

    class DiscordRichPresence {
        constructor() {
            this.enabled = true;
            this.applicationId = "";
            this.name = "";
            this.details = "";
            this.state = "";
            this.largeImage = "";
            this.smallImage = "";
        }

        getInfo() {
            return {
                id: "discordrichpresence",
                name: "Discord Rich Presence",

                // Couleur Discord
                color1: "#5865f2",
                color2: "#5865f2",
                color3: "#5865f2",

                blocks: [
                    // =========================
                    // CONFIGURATION
                    // =========================

                    {
                        opcode: "setEnabled",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "Rich Presence [STATE]",
                        arguments: {
                            STATE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "enabledDisabled"
                            }
                        }
                    },

                    {
                        opcode: "setApplicationId",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "définir Application ID à [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678"
                            }
                        }
                    },

                    {
                        opcode: "setName",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "définir Nom à [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "For Ever Loop"
                            }
                        }
                    },

                    {
                        opcode: "setDetails",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "définir Détails à [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Dans le lobby"
                            }
                        }
                    },

                    {
                        opcode: "setState",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "définir État à [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "En attente de joueurs"
                            }
                        }
                    },

                    {
                        opcode: "setLargeImage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "définir Grande image à [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "logo"
                            }
                        }
                    },

                    {
                        opcode: "setSmallImage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "définir Petite image à [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "survivor"
                            }
                        }
                    },

                    "---",

                    // =========================
                    // REPORTERS
                    // =========================

                    {
                        opcode: "getEnabled",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "Rich Presence activée ?"
                    },

                    {
                        opcode: "getApplicationId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Application ID"
                    },

                    {
                        opcode: "getName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Nom Rich Presence"
                    },

                    {
                        opcode: "getDetails",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Détails Rich Presence"
                    },

                    {
                        opcode: "getState",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "État Rich Presence"
                    },

                    {
                        opcode: "getLargeImage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Grande image Rich Presence"
                    },

                    {
                        opcode: "getSmallImage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Petite image Rich Presence"
                    }
                ],

                menus: {
                    enabledDisabled: {
                        acceptReporters: false,
                        items: [
                            {
                                text: "activée",
                                value: "enabled"
                            },
                            {
                                text: "désactivée",
                                value: "disabled"
                            }
                        ]
                    }
                }
            };
        }

        // =========================
        // SETTERS
        // =========================

        setEnabled(args) {
            this.enabled = args.STATE === "enabled";
            this.updateElectron();
        }

        setApplicationId(args) {
            this.applicationId = String(args.VALUE);
            this.updateElectron();
        }

        setName(args) {
            this.name = String(args.VALUE);
            this.updateElectron();
        }

        setDetails(args) {
            this.details = String(args.VALUE);
            this.updateElectron();
        }

        setState(args) {
            this.state = String(args.VALUE);
            this.updateElectron();
        }

        setLargeImage(args) {
            this.largeImage = String(args.VALUE);
            this.updateElectron();
        }

        setSmallImage(args) {
            this.smallImage = String(args.VALUE);
            this.updateElectron();
        }

        // =========================
        // GETTERS
        // =========================

        getEnabled() {
            return this.enabled;
        }

        getApplicationId() {
            return this.applicationId;
        }

        getName() {
            return this.name;
        }

        getDetails() {
            return this.details;
        }

        getState() {
            return this.state;
        }

        getLargeImage() {
            return this.largeImage;
        }

        getSmallImage() {
            return this.smallImage;
        }

        // =========================
        // ELECTRON
        // =========================

        updateElectron() {
            try {
                if (
                    window.discordRPC &&
                    typeof window.discordRPC.setActivity === "function"
                ) {
                    window.discordRPC.setActivity({
                        enabled: this.enabled,
                        applicationId: this.applicationId,
                        name: this.name,
                        details: this.details,
                        state: this.state,
                        largeImage: this.largeImage,
                        smallImage: this.smallImage
                    });
                }
            } catch (error) {
                console.warn(
                    "[Discord Rich Presence] Electron bridge indisponible."
                );
            }
        }
    }

    Scratch.extensions.register(new DiscordRichPresence());

})(Scratch);