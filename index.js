class App {
    constructor() {
        this.config = {
            "thingId": "teste.ditto:server",
            "thingJson":[
                {
                    "policyId": "org.eclipse.ditto:datacenter",
                    "attributes": {
                        "model": "",
                        "totalCores": 4,
                        "totalMemory": 16
                    },
                    "features": {
                        "ConsumptionAwareness": {
                            "properties": {
      	                        "carbonFootprint": 0.0289,
      	                        "EnergyConsumption": 5,
                                "coreInUse": 0,
                                "memoryInUse": 0
                            }
                        }
                    }
                },
                {
                    "policyId": "org.eclipse.ditto:datacenter",
                    "attributes": {
                        "model": "",
                        "totalCores": 32,
                        "totalMemory": 128
                    },
                    "features": {
                        "ConsumptionAwareness": {
                            "properties": {
      	                        "carbonFootprint": 0.039,
      	                        "EnergyConsumption": 15,
                                "coreInUse": 0,
                                "memoryInUse": 0
                            }
                        }
                    }
                } ,
                {
                    "policyId": "org.eclipse.ditto:datacenter",
                    "attributes": {
                        "model": "",
                        "totalCores": 16,
                        "totalMemory": 64
                    },
                    "features": {
                        "ConsumptionAwareness": {
                            "properties": {
      	                        "carbonFootprint": 0.217,
      	                        "EnergyConsumption": 10,
                                "coreInUse": 0,
                                "memoryInUse": 0
                            }
                        }
                    }
                }
            ],
            "server":{
                "allocateVirtualMachineSubject": "allocateVirtualMachine"
            }
        };

        this.frontend = new FrontendApp(this.config, () => this.getConnectionConfig());
        this.ServerApp = new ServerApp(this.config, () => this.getConnectionConfig());
    }

    getConnectionConfig() {
        return new ConnectionConfig($('#dittoHost').val(),
            $('#dittoUser').val(),
            $('#dittoPassword').val());
    }
}

class ConnectionConfig {
    constructor(host, username, password) {
        this.host = host;
        this.username = username;
        this.password = password;
    }

    getHost() {
        return this.host;
    }

    getUsername() {
        return this.username;
    }

    getPassword() {
        return this.password;
    }
}
    
$(document).ready(new App());
