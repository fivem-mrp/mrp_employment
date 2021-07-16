const config = require('./config/config.json');

let localeConvar = GetConvar("mrp_locale", "en");
let locale = config.locale[localeConvar];

MRP_SERVER = null;

emit('mrp:getSharedObject', obj => MRP_SERVER = obj);

while (MRP_SERVER == null) {
    console.log('Waiting for shared object....');
}

/**
 * need to have module mrp_employment loaded
 * 
 * @memberof MRP_SERVER
 * @namespace employment
 */
MRP_SERVER.employment = {

    /**    
     * findEmployement - description
     * 
     * @memberof MRP_SERVER.employment
     * @param  {type} data     description     
     * @param  {type} business description     
     * @param  {type} role     description     
     * @return {type}          description     
     */
    findEmployement(data, business, role) {
        let employment;
        for (let emp of data.employment) {
            if (emp.business == business && emp.role == role)
                employment = emp;
        }
        return employment;
    },

    /**
     * removeEmployment - description    
     *      
     * @memberof MRP_SERVER.employment
     * @param  {type} source     description     
     * @param  {type} stateId    description     
     * @param  {type} businessId description     
     * @param  {type} jobName    description     
     * @return {type}            description     
     */
    removeEmployment(source, stateId, businessId, jobName) {
        MRP_SERVER.read('character', {
            stateId: stateId
        }, (char) => {
            if (!char) {
                emitNet('chat:addMessage', source, {
                    template: '<div class="chat-message nonemergency">{0}</div>',
                    args: [
                        locale.errorWLChar
                    ]
                });
                console.log('Unable to find a character to whitelist');
                return;
            }

            MRP_SERVER.read('employment', {
                char: char._id
            }, (data) => {
                let needUpdate = false;
                if (!data) {
                    console.log(`Player with state ID [${stateId}] doesn't have any jobs`);
                    return;
                } else {
                    let job = MRP_SERVER.employment.findEmployement(data, businessId, jobName);
                    if (job) {
                        let i = 0;
                        for (let obj of data.employment) {

                            let remove = false;
                            if (typeof business == 'string') {
                                if (obj.business == businessId && obj.role == jobName)
                                    remove = true;
                            } else {
                                if (MRP_SERVER.isObjectIDEqual(obj.business, businessId) && obj.role == jobName)
                                    remove = true;
                            }

                            if (remove) {
                                console.log(`Remove employment for stateId [${stateId}] and business [${data.business}] with role [${obj.role}]`);
                                data.employment.splice(i, 1);
                                continue;
                            }
                            i++;
                        }
                    }

                    needUpdate = true;
                }

                if (needUpdate) {
                    let query = {};

                    if (data._id)
                        query._id = data._id;

                    MRP_SERVER.update('employment', data, query, null, (result) => {
                        if (result.modifiedCount > 0) {
                            console.log(`Updated employment for state ID [${stateId}] with job name [${jobName}]`);
                        } else {
                            console.log(`Added employment for state ID [${stateId}] with job name [${jobName}]`);
                        }

                        emitNet('chat:addMessage', source, {
                            template: '<div class="chat-message nonemergency">{0}</div>',
                            args: [
                                locale.blSuccess.replace('${stateId}', stateId).replace('${jobName}', jobName)
                            ]
                        });

                        for (let src in MRP_SERVER.playerSpawnedCharacters) {
                            let spawnedChar = MRP_SERVER.playerSpawnedCharacters[src];
                            if (MRP_SERVER.isObjectIDEqual(spawnedChar._id, char._id)) {
                                if (result.upsertedId)
                                    data._id = result.upsertedId;

                                emitNet('mrp:employment:client:setEmployment', src, data);
                            }
                        }
                    });
                }
            });
        });
    },

    /**    
     * addEmployment - description    
     * 
     * @memberof MRP_SERVER.employment     
     * @param  {type} source     description     
     * @param  {type} stateId    description     
     * @param  {type} businessId description     
     * @param  {type} jobName    description     
     * @return {type}            description     
     */
    addEmployment(source, stateId, businessId, jobName) {
        MRP_SERVER.read('character', {
            stateId: stateId
        }, (char) => {
            if (!char) {
                emitNet('chat:addMessage', source, {
                    template: '<div class="chat-message nonemergency">{0}</div>',
                    args: [
                        locale.errorWLChar
                    ]
                });
                console.log('Unable to find a character to whitelist');
                return;
            }

            MRP_SERVER.read('employment', {
                char: char._id
            }, (data) => {
                let needUpdate = false;
                if (!data) {
                    //unemployed
                    data = {
                        char: char._id,
                        employment: [{
                            business: businessId,
                            role: jobName
                        }]
                    };
                    needUpdate = true;
                } else {
                    let job = MRP_SERVER.employment.findEmployement(data, businessId, jobName);
                    if (job) {
                        console.log(`Player with state ID [${stateId}] already has a job [${jobName}]`);
                        emitNet('chat:addMessage', source, {
                            template: '<div class="chat-message nonemergency">{0}</div>',
                            args: [
                                locale.errorAlreadyHasJob.replace('${stateId}', stateId).replace('${jobName}', jobName)
                            ]
                        });
                        return;
                    }

                    needUpdate = true;
                    data.employment.push({
                        business: businessId,
                        role: jobName
                    });
                }

                if (needUpdate) {
                    let query = {};

                    if (data._id)
                        query._id = data._id;

                    MRP_SERVER.update('employment', data, query, null, (result) => {
                        if (result.modifiedCount > 0) {
                            console.log(`Updated employment for state ID [${stateId}] with job name [${jobName}]`);
                        } else {
                            console.log(`Added employment for state ID [${stateId}] with job name [${jobName}]`);
                        }

                        emitNet('chat:addMessage', source, {
                            template: '<div class="chat-message nonemergency">{0}</div>',
                            args: [
                                locale.wlSuccess.replace('${stateId}', stateId).replace('${jobName}', jobName)
                            ]
                        });

                        for (let src in MRP_SERVER.playerSpawnedCharacters) {
                            let spawnedChar = MRP_SERVER.playerSpawnedCharacters[src];
                            if (MRP_SERVER.isObjectIDEqual(spawnedChar._id, char._id)) {
                                if (result.upsertedId)
                                    data._id = result.upsertedId;

                                emitNet('mrp:employment:client:setEmployment', src, data);
                            }
                        }
                    });
                }
            });
        });
    }
};

RegisterCommand('wl', (source, args) => {
    //whitelist command
    let stateId = parseInt(args[0]);
    let jobName = args[1];
    if (!stateId)
        return;
    if (!jobName)
        return;

    MRP_SERVER.employment.addEmployment(source, stateId, 'city', jobName); //not sure if we only allow city whitelist for now
}, true);

RegisterCommand('bl', (source, args) => {
    //whitelist command
    let stateId = parseInt(args[0]);
    let jobName = args[1];
    if (!stateId)
        return;
    if (!jobName)
        return;

    MRP_SERVER.employment.removeEmployment(source, stateId, 'city', jobName); //not sure if we only allow city whitelist for now
}, true);

onNet('mrp:employment:server:getEmployment', (source, charId, uuid) => {
    MRP_SERVER.read('employment', {
        char: charId
    }, (result) => {
        emitNet('mrp:employment:server:getEmployment:response', source, result, uuid);
    });
});

on('mrp:employment:getSharedObject', (cb) => {
    cb(MRP_SERVER);
});