/*
 * Copyright (c) 2017 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0
 *
 * SPDX-License-Identifier: EPL-2.0
 */

class FrontendApp {

    constructor(config, connectionConfigFunction) {
        this.config = config;
        this.connectionConfigFunction = connectionConfigFunction;
        this.virtualMachineAllocated = [];
        this.maxConsumption = [1200, 1300, 1000];
        this.minConsumption = [5, 15, 10];
        this.initConnection();
        this.initUI();
    }

    initUI() {
        $('#exists').click(() => this.exists());
        $('#create').click(() => this.create());
        $('#desallocate-virtual-machine').click(() => this.openAllocations());
        $('#allocate-virtual-machine').click(() => this.openAllocate());
        $('#restFrontend .dismiss-all').click(() => this.dismissAll());
    }

    initConnection() {
        const thingId = this.config.thingId;
        const connectionConfig = this.connectionConfigFunction();

        this.baseUrl = `http://${connectionConfig.getHost()}/api/2/things/${thingId}`; // updated from v1 to v2

        const basicAuth = btoa(`${connectionConfig.getUsername()}:${connectionConfig.getPassword()}`);
        $.ajaxSetup({
            headers: {
                Authorization: 'Basic ' + basicAuth,
            }
        });

        this.basicAuthHeader = `Authorization: Basic ${basicAuth}`;
    }

    /* ***************************************************************** */
    /* ********************* UI callbacks ****************************** */
    /* ***************************************************************** */

    changeDigitalTwin(idServer, memoryRequired, coreRequired){
        this.config.thingJson[idServer].features.ConsumptionAwareness.properties.memoryInUse += memoryRequired;
        this.config.thingJson[idServer].features.ConsumptionAwareness.properties.coreInUse += coreRequired;
        const consumption = this.calculateConsumption(idServer, this.config.thingJson[idServer].features.ConsumptionAwareness.properties.memoryInUse, this.config.thingJson[idServer].features.ConsumptionAwareness.properties.coreInUse); 
        this.config.thingJson[idServer].features.ConsumptionAwareness.properties.EnergyConsumption = consumption;
        

        this.initConnection();
        const payload = {
            "carbonFootprint": this.config.thingJson[idServer].features.ConsumptionAwareness.properties.carbonFootprint,
      	    "EnergyConsumption": this.config.thingJson[idServer].features.ConsumptionAwareness.properties.EnergyConsumption,
            "coreInUse": this.config.thingJson[idServer].features.ConsumptionAwareness.properties.coreInUse,
            "memoryInUse": this.config.thingJson[idServer].features.ConsumptionAwareness.properties.memoryInUse
        }

        const contentType = "application/json; charset=utf-8";
        const jsonPayload = JSON.stringify(payload);
        const url = `${this.baseUrl+idServer}/features/ConsumptionAwareness/properties`;

        this.logSend('PUT', url, jsonPayload, contentType, 'ask the Server Thing to allocate a virtual machine');


        this.sendAsync($.post({
                type: "PUT",
                url: url,
                data: jsonPayload,
                contentType: contentType,
            }),
            (data, textStatus, jqXHR) => this.onAllocateVirtualMachineSuccess(data, textStatus, jqXHR),
            (jqXHR, textStatus, errorThrown) => this.onAllocateVirtualMachineError(jqXHR, textStatus, errorThrown));
    }

    allocateVirtualMachine(memory, core){
        for(let idServer = 0; idServer < this.config.thingJson.length; idServer++){
            if(this.enoughMemoryInServer(idServer, memory) && this.enoughCoresInServer(idServer, core)){
                this.manageVirtualMachine(idServer, memory, core);
                break;
            }
        }
    }

    enoughMemoryInServer(idServer, memory){
        return( this.config.thingJson[idServer].attributes.totalMemory >= this.config.thingJson[idServer].features.ConsumptionAwareness.properties.memoryInUse + memory);
    }

    enoughCoresInServer(idServer, cores){
        return( this.config.thingJson[idServer].attributes.totalCores >= this.config.thingJson[idServer].features.ConsumptionAwareness.properties.coreInUse + cores);
    }

    manageVirtualMachine(idServer, memoryRequired, coreRequired){
        this.virtualMachineAllocated.push({idServer, memoryRequired, coreRequired});
        this.changeDigitalTwin(idServer,memoryRequired, coreRequired);
        this.updateConsumptionTable();
    }

    calculateConsumption(idServer, memory, core){
        return(this.minConsumption[idServer] + (this.maxConsumption[idServer] - this.minConsumption[idServer]) * (memory + core)/(this.config.thingJson[idServer].attributes.totalCores + this.config.thingJson[idServer].attributes.totalMemory));
    }

    

    openAllocate(){
        const modal = $("#allocateModal");
        $('#allocateVirtualMachine').click((evt) => {
            const memory = parseInt($('#memoryText').val());
            const core = parseInt($('#coreText').val());
            $('#memoryText').val('');
            $('#coreText').val('');
            $('#allocateVirtualMachine').off();
            modal.modal('hide');
            this.allocateVirtualMachine(memory, core);
        });
        modal.modal('show');
    }

    openAllocations(){
        const modal = $("#desallocateModal");
        $('#desallocateTbody').html('');
        for(let auxI = 0; auxI < this.virtualMachineAllocated.length; auxI++){
            const idServer = this.virtualMachineAllocated[auxI].idServer;
            const memory = this.virtualMachineAllocated[auxI].memoryRequired;
            const core = this.virtualMachineAllocated[auxI].coreRequired;
            const tr = document.createElement('tr');
            tr.innerHTML =  `<tr>
                                <td>${this.baseUrl + idServer}</td>
                                <td>${memory}</td>
                                <td>${core}</td>
                                <td><button type="button" class="btn btn-primary" id="desallocate${auxI}">Desallocate</button></td>
                            </tr>`;
            $('#desallocateTbody').append(tr);
            $(`#desallocate${auxI}`).click((evt) => {
                this.changeDigitalTwin(idServer, memory * -1, core * -1);
                this.virtualMachineAllocated.splice(auxI, 1);
                this.updateConsumptionTable();
                modal.modal('hide');
            });

        }
        modal.modal('show');
    }


    updateConsumptionTable(){
        $('#consumptionTbody').html('');
        for(let auxI = 0; auxI < this.config.thingJson.length; auxI++){
            const idServer = auxI;
            const energy = this.config.thingJson[idServer].features.ConsumptionAwareness.properties.EnergyConsumption;
            const co2 = this.config.thingJson[idServer].features.ConsumptionAwareness.properties.carbonFootprint;
            const tr = document.createElement('tr');
            tr.innerHTML =  `<tr>
                                <td>${this.baseUrl + idServer}</td>
                                <td>${energy}</td>
                                <td>${energy * co2}</td>
                            </tr>`;
            $('#consumptionTbody').append(tr);
        }
    }

    create(onSuccess, onError, thingJson) {
        
        for(let idServer = 0; idServer < this.config.thingJson.length; idServer++){
            this.initConnection();
            const payload = JSON.stringify(this.config.thingJson[idServer]);
            const contentType = "application/json; charset=utf-8";
            this.logSend('PUT', this.baseUrl, payload, contentType, 'tell Ditto to create the twin for the Server Thing');

        

            this.sendAsync($.post({
                type: "PUT",
                url: this.baseUrl+idServer,
                data: payload,
                contentType: contentType,
            }),
            (data, textStatus, jqXHR) => this.onCreateSuccess(data, textStatus, jqXHR),
            (jqXHR, textStatus, errorThrown) => this.onCreateError(jqXHR, textStatus, errorThrown));
        }
        
    }

    exists() {
        this.initConnection();
        this.logSend('GET', this.baseUrl, undefined, undefined, 'ask Ditto if the twin for the Server Thing exists');
        this.sendAsync($.getJSON(this.baseUrl+this.config.numberOfServers-1),
            (data, textStatus, jqXHR) => this.onExistsSuccess(data, textStatus, jqXHR),
            (jqXHR, textStatus, errorThrown) => this.onExistsError(jqXHR, textStatus, errorThrown));
    }

    /* ***************************************************************** */
    /* ********************* REST callbacks **************************** */
    /* ***************************************************************** */

    onAllocateVirtualMachineSuccess(data, textStatus, jqXHR) {
        this.logToConsole('ask for virtual machine success');
    }

    onAllocateVirtualMachineError(jqXHR, textStatus, errorThrown) {
        this.logToConsole(`ask for virtual machine error ${jqXHR}`);
    }

    onCreateSuccess(data, textStatus, jqXHR) {
        this.logToConsole('create success');
        this.updateConsumptionTable();
    }

    onCreateError(jqXHR, textStatus, errorThrown) {
        this.logToConsole(`create error ${jqXHR}`);
    }

    onExistsSuccess(data, textStatus, jqXHR) {
        this.showExistsModal('Thing exists', '<p>You can try out the other requests</p>');
    }

    onExistsError(jqXHR, textStatus, errorThrown) {
        this.showExistsModal('Thing does not exist', '<p>Please create the Thing before trying out other requests</p>');
    }

    /* ***************************************************************** */
    /* ***************************************************************** */
    /* ***************************************************************** */

    showExistsModal(title, bodyHtml) {
        $('#existsModal .modal-title').text(title);
        $('#existsModal .modal-body').html(bodyHtml);
        $('#existsModal').modal('show');
    }

    sendAsync(jqXHR, onSuccess, onError) {
        const closureLog = (a, b, c) => this.logResponse(a, b, c);
        jqXHR.fail((jqXHR, textStatus, errorThrown) => {
                onError(jqXHR, textStatus, errorThrown);
                closureLog(textStatus, errorThrown, jqXHR);
            })
            .done((data, textStatus, jqXHR) => {
                onSuccess(data, textStatus, jqXHR);
                closureLog(textStatus, data, jqXHR);
            });
    }


    logSend(type, url, data, contentType, doc) {
        this.logSendToConsole(type, url, data, contentType, doc);
        this.logSendToUI(type, url, data, contentType, doc);
    }

    logSendToConsole(type, url, data, contentType, doc) {
        const curlCmd = `curl --request ${type}
            --url ${url}
            ${isDefined(contentType) ? `     --header 'content-type: ${contentType}'` : ''}
            --header '${this.basicAuthHeader}'
            ${isDefined(data) ? `            --data '${data}'` : ''}`;
        this.logToConsole(curlCmd);
    }

    logSendToUI(type, url, data, contentType, doc) {
        const htmlCmd = `<h4>${type} </h4>
            ${isDefined(data) ? `<p class="break-word">${data}</p>` : ''}
            <hr>
            ${isDefined(contentType) ? `<div><small class="text-muted">${contentType}</small></div>` : ''}
            <div><small class="text-muted">${this.basicAuthHeader}</small></div>
            <div><small class="break-word">${url}</small></div>
            ${isDefined(doc) ? `<div><small class="break-word text-muted">${doc}</small></div>`: ''}`;
        this.logToUi('info', htmlCmd);
    }

    logResponse(statusText, data, jqXHR) {
        const status = jqXHR.status;
        let content = data;
        try {
            content = JSON.stringify(data);
        } catch (err) {
            // do nothing
        }
        this.logResponseToConsole(statusText, content, jqXHR);
        this.logResponseToUI(statusText, content, jqXHR);
    }

    logResponseToConsole(statusText, content, jqXHR) {
        const textResponse = `[${jqXHR.status}] ${isDefined(content) ? content : statusText}`;
        this.logToConsole(textResponse);
    }

    logResponseToUI(statusText, content, jqXHR) {
        const htmlResponse = `<h4>${jqXHR.status} ⇦</h4>
            <div class="break-word">${isDefined(content) ? content : statusText}</div>`;
        this.logToUi('success', htmlResponse);
    }

    logToConsole(message) {
        console.log(`[REST-frontend] ${message}`);
    }

    dismissAll() {
        $("#restFrontend .alert>button").click();
    }

    logToUi(role, message) {
        $("#rf-alerts").append(
            `<div class="alert alert-${role} alert-dismissible fade show" role="alert">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                    </button>
                    ${message}
             </div>`);
    }

}

isDefined = (arg) => typeof arg !== 'undefined';
